#!/usr/bin/env python3
"""
Extract a "primary company" string from each billionaire's bio.

Why this exists
---------------
Forbes's `source` field is sometimes a company name ("Tesla, SpaceX") and
sometimes an industry ("Semiconductors", "Real estate", "Diversified") —
which means the ticker and Top-5 cards on the match page end up showing
"기술 · 기술 · 기술" instead of the actual company a user would recognise.

The bio (`bioKo`, fallback `bio`) almost always names the source of wealth
in the first sentence:
  - "엔비디아의 창업자이자 회장 겸 CEO"
  - "브로드컴의 공동 창업자"
  - "Sun Hung Kai Properties를 지배하고 있다"
  - "founder of X"

This script runs a sequence of regexes over those first sentences and
writes a single new field `company` into billionaires.json. Existing
`source` values that already look like real company names are kept
(we only override when the source is a known industry-y placeholder).

Idempotent: rerun safely. Won't touch records where extraction fails.
"""

from __future__ import annotations
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BILLIONAIRES = ROOT / "public" / "billionaires.json"

# Source values that are clearly industries/categories, not company names.
# These get OVERWRITTEN if we can find a company in the bio. Case-insensitive
# substring match.
INDUSTRY_SOURCES = {
    "semiconductors", "real estate", "diversified", "technology",
    "오일, semiconductor", "oil, semiconductor", "오일",
    "investments", "investment", "finance", "banking",
    "manufacturing", "mining", "energy", "oil & gas", "oil and gas",
    "media", "publishing", "fashion", "retail", "fashion retail",
    "healthcare", "health care", "pharmaceuticals", "pharma",
    "consumer goods", "consumer products", "food", "beverages",
    "automotive", "auto", "telecom", "telecommunications",
    "construction", "logistics", "shipping", "transportation",
    "online games", "gaming", "internet", "software",
    "electric systems", "industrial", "chemicals",
}


def is_industry_source(source: str | None) -> bool:
    """True if `source` looks like a Forbes industry tag rather than a company."""
    if not source:
        return True
    s = source.strip().lower()
    if not s:
        return True
    return s in INDUSTRY_SOURCES


# Korean role keywords that signal "X의 <role>" — company is the token
# directly preceding 의.
KO_ROLES = [
    "공동 창업자", "공동창업자", "공동 창립자", "공동창립자",
    "창업자", "창립자", "설립자",
    "명예 회장", "명예회장", "선임 회장", "선임회장", "전 회장", "전회장",
    "부회장", "회장 겸", "회장",
    "대표이사", "대표",
    "CEO", "사장", "총수", "이사장", "소유주", "구단주",
    "선임 회장", "chairman", "founder",
]
# Sort longest-first so 명예 회장 wins over 회장.
KO_ROLES.sort(key=len, reverse=True)


def find_ko_company(sentence: str) -> str | None:
    """Find a role keyword, then take the noun phrase immediately before its 의."""
    for role in KO_ROLES:
        idx = sentence.find(role)
        if idx < 0:
            continue
        # Walk left from `idx`, skipping the optional 의 and whitespace, then
        # collect up to ~40 chars of name-like content.
        left = sentence[:idx].rstrip()
        # Strip trailing 의 + whitespace
        if left.endswith("의"):
            left = left[:-1].rstrip()
        else:
            # No 의 → probably not a "company role" mention, skip
            continue
        # Now grab the last word(s) up to a sentence-particle boundary.
        # We look back at most 40 chars and split at common breaks.
        snippet = left[-50:]
        # Cut at the LAST sentence-particle that separates clauses
        # (는, 은, 이, 가, ", ", "은 ", "는 ", "이며", "이다", "이자", "로", "으로")
        breakers = [
            "이자 ", "이며 ", "이고 ", "이다.", "이다 ", "라고 ", "라 ",
            "는 ", "은 ", "이 ", "가 ", "로 ", "으로 ", "도 ", "만 ",
            ", ", "·", "(", ")",
        ]
        best = 0
        for br in breakers:
            j = snippet.rfind(br)
            if j >= 0:
                best = max(best, j + len(br))
        candidate = snippet[best:].strip()
        # If still empty or weird, skip
        if not candidate or len(candidate) < 2:
            continue

        # Drop descriptive modifiers that often precede a company name —
        # "설립한 X", "기술 대기업 X", "최대 X 중 하나인 X". The actual
        # company is usually the last word(s) after these clauses.
        MODIFIER_TAILS = [
            "설립한 ", "창업한 ", "운영하는 ", "이끄는 ", "지배하는 ",
            "기반 ", "기업인 ", "기업 ", "회사인 ", "회사 ",
            "대기업 ", "재벌 기업 ", "재벌기업 ",
            "그룹인 ", "그룹 ", "지주회사인 ", "지주회사 ",
            "공동 창립자인 ", "공동창립자인 ", "공동 설립자인 ",
            "모회사 ", "모회사인 ", "자회사인 ", "자회사 ",
            "중 하나인 ", "하나인 ",
            "체인 ", "체인인 ",
            "브랜드 ", "브랜드인 ",
            "전문 ", "전문 회사 ",
            "개발사 ", "개발사인 ", "개발업체 ", "개발업체인 ",
            "다국적 ", "국제 ", "글로벌 ", "세계적 ", "세계 최대 ",
            "한국 ", "미국 ", "중국 ", "일본 ", "독일 ", "프랑스 ",
            "영국 ", "이탈리아 ", "스페인 ",
        ]
        # Apply repeatedly — modifiers can stack
        changed = True
        while changed:
            changed = False
            for mod in MODIFIER_TAILS:
                j = candidate.find(mod)
                if j >= 0:
                    candidate = candidate[j + len(mod):].strip()
                    changed = True
                    break

        # Drop obvious filler words/phrases
        for noise in ["그는 ", "그녀는 ", "그 ", "그녀 ", "이는 ", "또한 ",
                      "또 ", "현재 ", "현재의 ", "이후 ", "후에 ", "그리고 "]:
            if candidate.startswith(noise):
                candidate = candidate[len(noise):]
        candidate = candidate.strip().strip(",.·")

        # Strip a trailing parenthetical aside like "엔비디아(Nvidia)" → keep "엔비디아"
        # only if the parens look like a transliteration/alias (Latin inside).
        if "(" in candidate and candidate.endswith(")"):
            base, paren = candidate.rsplit("(", 1)
            if any(c.isascii() and c.isalpha() for c in paren):
                candidate = base.strip()

        if len(candidate) < 2 or len(candidate) > 40:
            continue
        return candidate
    return None

# English fallback.
EN_PATTERN = re.compile(
    r"(?:founder|co-founder|chairman|CEO|president|owner)\s+of\s+"
    r"([A-Z][A-Za-z0-9&\-\s\.\(\)']{1,60}?)"
    r"(?=[,\.\s]|$)"
)


def first_sentence(text: str) -> str:
    """Return the first 2 sentences worth — usually plenty for company mention.

    Some bios open with "X는 미국 사업가이다." and only mention the company
    in the second sentence ("그는 X의 회장이다."), so we read past the first
    period if there's room.
    """
    return text[:350]


# Words/phrases that are not actual companies — clean them out of capture groups.
NOISE_TAILS = (
    "와프 홀딩스",  # context-only mentions; let the first match win
)
NOISE_PREFIXES = (
    "그는", "그녀는", "그", "그녀", "이는", "또한", "후에",
    "현재", "현재의", "또", "이후", "그리고",
    "통상", "통상적으로", "약칭",
)


def clean_company(raw: str) -> str:
    """Trim filler words, common particles, and noise."""
    s = raw.strip().strip("·,.")
    # Drop leading filler words.
    while True:
        changed = False
        for pre in NOISE_PREFIXES:
            if s.startswith(pre + " "):
                s = s[len(pre) + 1:]
                changed = True
        if not changed:
            break
    # Strip outer parentheses if entire string is wrapped.
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1].strip()
    return s.strip()


# Companies that real people actually call by these names — short-circuit.
KNOWN_OVERRIDES = {
    # id -> company (only for cases where regex can't reliably resolve)
    "7": "엔비디아",     # Jensen Huang
    "1518": "SK",       # 최태원
    "894": "미래에셋",   # 박현주 — source already says this; safety net
    "470": "셀트리온",   # 서정진
    "467": "메리츠금융",  # 조정호
}


def extract_company(person: dict) -> str | None:
    """Return the best-guess company name for `person`, or None if unsure."""
    pid = str(person.get("id", ""))
    if pid in KNOWN_OVERRIDES:
        return KNOWN_OVERRIDES[pid]

    bio_ko = (person.get("bioKo") or "").strip()
    bio_en = (person.get("bio") or "").strip()

    # 1. Korean role pattern in Korean bio
    if bio_ko:
        first = first_sentence(bio_ko)
        candidate = find_ko_company(first)
        if candidate:
            return clean_company(candidate)
        # Control / ownership patterns: "X를 지배", "X를 소유", "X를 운영"
        for verb in ["를 지배", "을 지배", "를 소유", "을 소유",
                     "를 운영", "을 운영", "를 이끌", "을 이끌"]:
            idx = first.find(verb)
            if idx <= 0:
                continue
            # Use the same left-walk logic as find_ko_company
            left = first[:idx].rstrip()
            snippet = left[-50:]
            breakers = ["이자 ", "이며 ", "이고 ", "이다.", "이다 ",
                        "는 ", "은 ", "이 ", "가 ", "로 ", "으로 ",
                        ", ", "·", "("]
            best = 0
            for br in breakers:
                j = snippet.rfind(br)
                if j >= 0:
                    best = max(best, j + len(br))
            cand = snippet[best:].strip()
            # Strip modifier prefixes like in find_ko_company
            for m in ["설립한 ", "기업인 ", "기업 ", "회사인 ", "회사 ",
                     "대기업 ", "재벌 기업 ", "그룹인 ", "그룹 ",
                     "지주회사인 ", "중 하나인 ", "하나인 ",
                     "다국적 ", "국제 ", "글로벌 "]:
                while cand.startswith(m):
                    cand = cand[len(m):].strip()
                # also remove if it appears in middle
                j = cand.find(m)
                if j > 0:
                    cand = cand[j + len(m):].strip()
            cand = cand.strip(",.·")
            if cand and 2 <= len(cand) <= 40:
                return clean_company(cand)

    # 2. English fallback
    if bio_en:
        first = first_sentence(bio_en)
        m = EN_PATTERN.search(first)
        if m:
            company = clean_company(m.group(1))
            if company and len(company) >= 2:
                return company

    return None


def main():
    data = json.loads(BILLIONAIRES.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        print("Expected a list at the top level of billionaires.json", file=sys.stderr)
        sys.exit(1)

    filled = 0
    skipped_existing = 0
    no_match = 0

    for person in data:
        existing = person.get("company")
        if existing:
            skipped_existing += 1
            continue

        source = person.get("source")
        company = extract_company(person)

        if company:
            person["company"] = company
            filled += 1
        elif not is_industry_source(source):
            # Source is already a usable company name — keep it as the company too.
            person["company"] = source
            filled += 1
        else:
            no_match += 1

    BILLIONAIRES.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    total = len(data)
    print(f"Total records:        {total}")
    print(f"Already had company:  {skipped_existing}")
    print(f"Filled this run:      {filled}")
    print(f"Could not extract:    {no_match}")


if __name__ == "__main__":
    main()
