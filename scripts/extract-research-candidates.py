#!/usr/bin/env python3
"""
Extract candidate billionaire entries from the Cowork research report and
emit a JSON file ready to be merged into enriched-billionaires.json.

Handles both entry formats in the research file:
  Format A  ### N. 김소희 — Kim So-hee (스타일난다 / 3CE)  (Round 1)
  Format B  ### #469 고소영 — 1972-10-06 (양력)             (Round 2+)

Output: data to stdout (or --out <path>) as JSON list. Each entry:
  { id(temp), name, nameKo, birthday, netWorth, nationality, industry,
    gender, source, bio, bioKo, wealthOrigin, _sources, _rawBlock }

Saju is NOT computed here — that happens later via scripts/prebake-saju.ts.
Photo URL is left empty; to be filled in step 2 by a separate pass.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

RESEARCH_FILE = Path('research-reports/2026-04-17-new-rich-koreans.md')
ROSTER_FILE = Path('public/enriched-billionaires.json')


def parse_format_a(block: str) -> dict | None:
    first = block.split('\n', 1)[0]
    m = re.match(r'###\s+\d+\.\s+([가-힣·]+)\s*—\s*(.+?)(?:\s*$|\n)', first)
    if not m:
        return None
    nameKo = m.group(1).strip()
    tail = m.group(2).strip()
    # English name is the first token group before ( if present
    english_m = re.match(r'([A-Za-z][A-Za-z\-\s\.]+?)(?:\s*\(|$)', tail)
    name_en = english_m.group(1).strip() if english_m else nameKo

    def field(label: str) -> str | None:
        m = re.search(rf'\*\*{re.escape(label)}:\*\*\s*([^\n]+)', block)
        return m.group(1).strip() if m else None

    birthday = None
    b = field('Birthday')
    if b:
        dm = re.search(r'(\d{4}-\d{2}-\d{2})', b)
        if dm:
            birthday = dm.group(1)
    if not birthday:
        return None

    return {
        'name': name_en,
        'nameKo': nameKo,
        'birthday': birthday,
        'gender': (field('Gender') or '').strip()[:1].upper() or None,
        'nationality': (field('Nationality') or 'KR').strip(),
        'industry': field('Industry'),
        'source': field('Source'),
        'wealthOrigin': (field('Wealth origin') or 'self-made').strip().lower().split()[0],
        'netWorth_raw': field('Estimated net worth'),
        '_format': 'A',
    }


def parse_format_b(block: str) -> dict | None:
    first = block.split('\n', 1)[0]
    m = re.match(r'###\s+#(\d+)\s+([가-힣·]+)(?:\s*—\s*(\d{4}-\d{2}-\d{2}))?', first)
    if not m:
        return None
    nameKo = m.group(2).strip()
    birthday = m.group(3)
    if not birthday:
        bm = re.search(r'\*\*출생\*\*:\s*(\d{4}-\d{2}-\d{2})', block)
        if bm:
            birthday = bm.group(1)
    if not birthday:
        return None

    def bfield(label: str) -> str | None:
        m = re.search(rf'\*\*{re.escape(label)}\*\*:\s*([^\n]+)', block)
        return m.group(1).strip() if m else None

    job = bfield('직업')
    return {
        'name': None,  # no english name in Format B; will fill later
        'nameKo': nameKo,
        'birthday': birthday,
        'gender': None,
        'nationality': 'KR',
        'industry': job,
        'source': job,  # best we have
        'wealthOrigin': 'self-made',
        'netWorth_raw': bfield('자산 증빙'),
        '_format': 'B',
    }


def parse_netWorth_to_billions_usd(raw: str | None) -> tuple[float | None, bool]:
    """Return (netWorth_in_billions_USD, estimated_flag). Returns (None, True) on failure."""
    if not raw:
        return None, True
    # Pattern: "$X.YB" / "$X.YM"
    m = re.search(r'\$\s*([\d\.]+)\s*[–\-~to]{1,3}\s*([\d\.]+)\s*([BM])', raw)
    if m:
        low = float(m.group(1))
        high = float(m.group(2))
        unit = m.group(3)
        mid = (low + high) / 2
        if unit == 'M':
            mid = mid / 1000
        return round(mid, 2), True
    m = re.search(r'\$\s*([\d\.]+)\s*([BM])', raw)
    if m:
        v = float(m.group(1))
        if m.group(2) == 'M':
            v = v / 1000
        return round(v, 2), 'est' in raw.lower() or '~' in raw
    # Korean won: ₩X조 / ₩X억
    m = re.search(r'₩\s*([\d,\.]+)\s*조', raw)
    if m:
        jo = float(m.group(1).replace(',', ''))
        # 1 조 KRW ≈ 0.68 B USD at 1480 KRW/USD → actually 1조/1480 = 0.676 B
        usd_b = jo / 1.48
        return round(usd_b, 2), True
    m = re.search(r'₩\s*([\d,\.]+)\s*억', raw)
    if m:
        eok = float(m.group(1).replace(',', ''))
        # 1 억 KRW = 100M KRW ≈ 0.0676 M USD = 0.0000676 B USD
        usd_b = eok * 0.0000676
        return round(usd_b, 4), True
    # "약 Xxxx억"
    m = re.search(r'([\d,\.]+)\s*억', raw)
    if m:
        eok = float(m.group(1).replace(',', ''))
        usd_b = eok * 0.0000676
        return round(usd_b, 4), True
    return None, True


def extract_first_bio_paragraph(block: str) -> str | None:
    """Return the first long narrative line (>= 80 chars, not a bullet)."""
    for line in block.split('\n'):
        s = line.strip()
        if len(s) < 80:
            continue
        if s.startswith(('- ', '* ', '###', '##', '|', '**', '> ')):
            continue
        if s.startswith('['):
            continue
        return s
    return None


def extract_sources(block: str) -> list[str]:
    # Markdown links: [text](url)
    return re.findall(r'\]\((https?://[^\s\)]+)\)', block)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', type=Path, default=Path('/tmp/candidates_full.json'))
    args = ap.parse_args()

    content = RESEARCH_FILE.read_text()
    roster = json.loads(ROSTER_FILE.read_text())
    roster_nameKo = {p.get('nameKo', '').strip() for p in roster if p.get('nameKo')}
    max_id = max(int(p['id']) for p in roster)

    blocks = re.split(r'\n(?=###\s)', content)

    parsed: dict[str, dict] = {}  # keyed by (nameKo, birthday) — stays unique
    for block in blocks:
        rec = parse_format_a(block) or parse_format_b(block)
        if not rec:
            continue
        key = f"{rec['nameKo']}|{rec['birthday']}"
        # Prefer Format A (richer) if we have both
        existing = parsed.get(key)
        if existing and existing['_format'] == 'A' and rec['_format'] == 'B':
            continue  # keep existing A
        # Enrich with bio + sources from THIS block
        rec['_bio'] = extract_first_bio_paragraph(block)
        rec['_sources'] = extract_sources(block)
        rec['_raw_preview'] = block[:400]
        parsed[key] = rec

    # Skip names already in roster
    candidates = []
    skipped_existing = []
    next_id = max_id + 1
    for rec in parsed.values():
        if rec['nameKo'] in roster_nameKo:
            skipped_existing.append(rec['nameKo'])
            continue
        nw, est = parse_netWorth_to_billions_usd(rec.get('netWorth_raw'))
        entry = {
            'id': str(next_id),
            'name': rec['name'] or rec['nameKo'],  # fall back to Korean
            'nameKo': rec['nameKo'],
            'birthday': rec['birthday'],
            'netWorth': nw if nw is not None else 0.5,  # placeholder for estimated real-estate-only entries
            'netWorthEstimated': True if est else True,  # always True for research entries
            'nationality': rec['nationality'] or 'KR',
            'industry': rec['industry'] or 'Entertainment',
            'gender': rec['gender'],
            'source': rec['source'] or rec['industry'] or '',
            'photoUrl': '',  # to be filled in step 2
            'bio': '',  # to be filled (English)
            'bioKo': rec['_bio'] or '',  # the first narrative paragraph
            'wealthOrigin': rec['wealthOrigin'] or 'self-made',
            '_sources': rec['_sources'],
            '_format': rec['_format'],
            '_netWorth_raw': rec.get('netWorth_raw'),
        }
        candidates.append(entry)
        next_id += 1

    args.out.write_text(json.dumps(candidates, ensure_ascii=False, indent=2))
    print(f'Parsed {len(parsed)} unique (name, birthday) pairs')
    print(f'Skipped {len(skipped_existing)} already in roster: {skipped_existing}')
    print(f'Final candidates: {len(candidates)}')
    print(f'  With netWorth parsed: {sum(1 for c in candidates if c["netWorth"] != 0.5)}')
    print(f'  With bioKo text: {sum(1 for c in candidates if c["bioKo"])}')
    print(f'  With >= 1 source link: {sum(1 for c in candidates if c["_sources"])}')
    print(f'Wrote {args.out}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
