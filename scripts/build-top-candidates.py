#!/usr/bin/env python3
"""
Second pass: take the 26 high-quality Format A candidates and clean them up
to match the exact enriched-billionaires.json schema. Produces an
"almost-ready" JSON plus a human-readable review summary.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

SRC = Path('/tmp/candidates_full.json')
OUT = Path('/tmp/top26_clean.json')


def clean_source(raw: str | None) -> str:
    if not raw:
        return ''
    # Drop any trailing **Wealth origin** / **Source** markers that slipped in.
    s = raw.split('**Wealth origin')[0]
    s = s.split('**Source')[0]
    # Keep only first sentence or first 80 chars
    s = s.strip().rstrip('.').strip()
    # Cut at first period OR first parenthesis-level comma
    m = re.match(r'^([^.;]+)', s)
    if m:
        s = m.group(1).strip()
    return s[:80]


def derive_gender(name: str, nameKo: str) -> str | None:
    # Heuristic only — manual override will be in the review file.
    # Default None (unknown), user can fix.
    female_known = {'김소희', '홍라영', '김슬아', '이사배'}
    male_known = {
        '김범석', '허민', '박관호', '정몽진', '이해욱', '김재철', '정몽규',
        '정몽윤', '송병준', '류진', '강호동', '김창한', '이순형', '구자용',
        '박삼구', '장세주', '신동엽', '송인준', '유상덕', '이경규', '이상순',
        '김종국',
    }
    if nameKo in female_known:
        return 'F'
    if nameKo in male_known:
        return 'M'
    return None


def short_bio_en_placeholder(c: dict) -> str:
    # For now, a concise English line derived from industry + source.
    parts = []
    if c['industry']:
        parts.append(c['industry'].split('/')[0].strip())
    src = clean_source(c['source'])
    if src:
        parts.append(src)
    return f"{c['name']} — " + '; '.join(parts) if parts else c['name']


def short_bio_ko_trim(c: dict, max_chars: int = 400) -> str:
    b = c['bioKo']
    if not b:
        return ''
    if len(b) <= max_chars:
        return b
    # Cut at last sentence boundary before max_chars
    cut = b[:max_chars]
    last_period = max(cut.rfind('. '), cut.rfind('다. '), cut.rfind('. '))
    if last_period > 150:
        return cut[:last_period + 1]
    return cut + '...'


def main() -> int:
    data = json.loads(SRC.read_text())
    fmt_a = [c for c in data if c['_format'] == 'A']
    high_q = [
        c for c in fmt_a
        if c['bioKo'] and c['_sources'] and c['netWorth'] != 0.5
    ]
    high_q.sort(key=lambda x: x['netWorth'], reverse=True)

    cleaned = []
    for c in high_q:
        name_en = c['name'].strip()
        # Fix cases where name fell back to nameKo
        if name_en == c['nameKo']:
            name_en = c['nameKo']  # keep as-is; reviewer can fix
        entry = {
            'id': c['id'],
            'name': name_en,
            'nameKo': c['nameKo'],
            'birthday': c['birthday'],
            'netWorth': c['netWorth'],
            'netWorthEstimated': True,
            'nationality': c['nationality'],
            'industry': (c['industry'] or '').split('/')[0].strip(),
            'gender': derive_gender(name_en, c['nameKo']),
            'source': clean_source(c['source']),
            'photoUrl': '',  # step 2
            'bio': '',  # to be written English-side later
            'bioKo': short_bio_ko_trim(c),
            'wealthOrigin': c['wealthOrigin'],
            # Metadata kept for review; stripped before final merge.
            '_sources': c['_sources'][:4],
        }
        cleaned.append(entry)

    OUT.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2))
    print(f'Wrote {len(cleaned)} cleaned entries to {OUT}')

    # Review table
    print()
    print(f'{"#":>3} {"Name":<18} {"Industry":<22} {"netW":>7} {"Gender":<6} {"Birthday":<11}')
    print('-' * 80)
    for i, e in enumerate(cleaned, 1):
        print(f'{i:>3} {e["nameKo"]:<6} ({e["name"][:10]:<10}) {e["industry"][:22]:<22} ${e["netWorth"]:>5.2f}B {str(e["gender"] or "?"):<6} {e["birthday"]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
