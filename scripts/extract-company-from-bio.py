#!/usr/bin/env python3
"""
For entries where `source` is a category (same as industry, or a known
generic like "Investment research"), try to pull a real company name out
of the English `bio`. Writes changes back to public/billionaires.json.

Conservative: only updates an entry when we have high confidence in the
extracted name. Reports the rest for manual review.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

CATEGORY_SOURCES = {
    'Diversified', 'Manufacturing', 'Telecom', 'Sports', 'Healthcare',
    'Logistics', 'Technology', 'Real Estate', 'Energy', 'Automotive',
    'Investment research', 'Hedge funds', 'Venture capital',
    'Finance & Investments', 'Fashion & Retail', 'Food & Beverage',
    'Media & Entertainment', 'Construction & Engineering',
    'Metals & Mining', 'Gambling & Casinos', 'Service',
}

# Patterns that reliably name a company. Order matters — more specific first.
# Each captures the company name in group 1.
# Tokens allowed in a company name: letters, digits, space, &, ., ', dash, 'and'.
CO_CHARS = r"[A-Z][A-Za-z0-9\.\&'\-]*(?:\s+(?:&|and|[A-Z][A-Za-z0-9\.\&'\-]*|of|the|de|la|los|las))*"

PATTERNS = [
    # "is the founder [and chairman/CEO] of X"
    re.compile(rf'is the (?:co-)?founder(?:[,a-z\s]+and [a-z][a-z ]+?)?\s+of\s+(?:the\s+)?({CO_CHARS})'),
    # "is the chairman/CEO/... of X"
    re.compile(rf'is the (?:executive\s+|co-)?(?:chair(?:man|person)?|CEO|president|managing director|vice[- ]chair(?:man|person)?|chief executive|founder)\s+(?:and [A-Za-z ]+\s+)?of\s+(?:the\s+)?({CO_CHARS})'),
    # "founded X" / "co-founded X"
    re.compile(rf'(?:co-)?founded\s+(?:the\s+)?({CO_CHARS})(?:\s+in\s+\d{{4}}|,|\.|\s+which)'),
    # "owns X" (for inheritors)
    re.compile(rf'owns?\s+(?:a\s+(?:majority|controlling)\s+stake\s+in\s+)?(?:the\s+)?({CO_CHARS})\s+(?:Group|Corp|Corporation|Inc|Ltd|LLC|SA|AG|Holdings|Co\.)'),
    # "is the heir to X" / "heir to the X fortune"
    re.compile(rf'heir to (?:the\s+)?({CO_CHARS})'),
    # "X Group" appearing as a named group
    re.compile(rf'({CO_CHARS}) (?:Group|Corporation|Holdings|Industries)'),
]


def clean_company(s: str) -> str:
    s = s.strip()
    # Drop trailing conjunctions / articles we might have over-captured
    s = re.sub(r'\s+(and|of|in|to|the)$', '', s, flags=re.IGNORECASE)
    # Collapse multiple spaces
    s = re.sub(r'\s+', ' ', s)
    # Remove obvious junk suffixes that aren't part of the brand
    s = re.sub(r'\s+(Group|Corp|Corporation|Inc|Ltd|LLC)\.?$', r' \1', s)
    return s


def extract(bio: str) -> str | None:
    if not bio:
        return None
    for pat in PATTERNS:
        m = pat.search(bio)
        if m:
            cand = clean_company(m.group(1))
            # Sanity checks
            if len(cand) < 2 or len(cand) > 60:
                continue
            # Must start with uppercase letter
            if not cand[0].isupper():
                continue
            # Skip obvious non-companies
            blacklist = {'The', 'He', 'She', 'His', 'Her', 'A', 'An', 'His Father', 'His Mother'}
            if cand in blacklist:
                continue
            return cand
    return None


def main() -> int:
    data = json.loads(Path('public/billionaires.json').read_text())
    updated = []
    skipped_no_match = []

    for p in data:
        src = (p.get('source') or '').strip()
        ind = (p.get('industry') or '').strip()
        # Only touch entries where source is clearly a category
        if src not in CATEGORY_SOURCES and src != ind:
            continue
        bio = p.get('bio') or ''
        company = extract(bio)
        if company and company.lower() != src.lower() and company.lower() != ind.lower():
            p['source'] = company
            updated.append((p['id'], p.get('nameKo', p['name']), src, company))
        else:
            skipped_no_match.append((p['id'], p.get('nameKo', p['name']), src, bio[:100]))

    Path('public/billionaires.json').write_text(
        json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    )

    print(f'=== Updated {len(updated)} entries ===')
    for pid, name, old, new in updated[:40]:
        print(f"  {pid:5s}  {name:25s}  {old:30s} → {new}")
    if len(updated) > 40:
        print(f'  ... and {len(updated) - 40} more')

    print(f'\n=== Skipped (no confident match): {len(skipped_no_match)} ===')
    for pid, name, src, bio in skipped_no_match[:10]:
        print(f"  {pid:5s}  {name:25s}  ({src})  bio: {bio}...")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
