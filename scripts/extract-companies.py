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
    "공동 설립자", "공동설립자",
    "창업자", "창립자", "설립자",
    "명예 회장", "명예회장", "선임 회장", "선임회장", "전 회장", "전회장",
    "부회장", "회장 겸", "회장",
    "최고경영자", "최고 경영자",
    "대표이사", "대표",
    "전 최고경영자", "전 CEO",
    "수장", "여가장", "여수장", "가장",  # family-business heads
    "주요 주주", "최대 주주", "지배 주주", "단독 주주",
    "오너", "회사 소유주", "운영자",
    "CEO", "사장", "총수", "이사장", "소유주", "구단주",
    "chairman", "founder",
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
        # Strip trailing 의 + whitespace. If 의 is missing, accept the
        # pattern only when role keyword is "회장"/"대표"/"CEO"/"사장" —
        # those commonly appear right after a company name with just a
        # space ("KB금융그룹 회장"). Other role words ("창업자" etc.)
        # without 의 are too ambiguous so we skip them.
        if left.endswith("의"):
            left = left[:-1].rstrip()
        elif role in {"회장", "부회장", "대표", "대표이사", "CEO", "사장",
                      "총수", "이사장", "회장 겸", "최고경영자"}:
            # No 의 → just take the token immediately before the role.
            # But first peel off any trailing role-word like "사장이자",
            # "회장이며" — these mean an earlier role keyword already ran
            # and the current one is a co-title. Drop them so we get back
            # to the actual company name.
            left = re.sub(
                r"(?:사장|회장|부회장|대표|CEO|총수|이사장|구단주|소유주|"
                r"최고경영자|창업자|창립자|설립자)\s*(?:이자|이며|이고|"
                r"겸|및)?\s*$",
                "",
                left,
            ).rstrip()
            # If that trim revealed a 의 suffix, drop it too.
            if left.endswith("의"):
                left = left[:-1].rstrip()
        else:
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

        # Strip leading date clauses: "2014년부터 2024년까지", "2024년 1월부터",
        # "1989년부터 2018년까지", "2010년 형 패트릭과 함께", etc.
        # These appear before the company name and should be cut.
        candidate = re.sub(
            r"^\d{4}년(?:\s*\d+월)?(?:부터|까지|에)?\s*"
            r"(?:\d{4}년(?:\s*\d+월)?(?:부터|까지|에)?\s*)?",
            "",
            candidate,
        ).strip()

        # Strip leading time clauses without years: "은퇴하기 전까지",
        # "현재까지", "지금까지", "이후로", "이전에" etc.
        candidate = re.sub(
            r"^(?:은퇴하기\s*전까지|현재까지|지금까지|이후로|이전에|"
            r"이후|이전|당시|그동안|그때까지)\s*",
            "",
            candidate,
        ).strip()

        # Strip "X때까지", "X까지", "X에 매각될 때까지" — any clause
        # ending in "까지" before the actual company name.
        candidate = re.sub(
            r"^[^까]{1,30}?(?:때까지|까지)\s*",
            "",
            candidate,
        ).strip()

        # Strip leading sibling/family clauses regardless of whether
        # "함께" is followed by a verb. "형 알랭과 함께 샤넬" → "샤넬".
        # Loop because some bios stack two ("형 X와 함께 동생 Y와 함께").
        for _ in range(3):
            new = re.sub(
                r"^(?:쌍둥이\s*)?(?:형|동생|남편|아내|아버지|어머니|"
                r"쌍둥이 형)\s+[A-Za-z가-힣\.][A-Za-z가-힣\s\.]{0,25}?"
                r"(?:와|과)\s*함께\s*"
                r"(?:공동\s*)?(?:창립한|설립한|창업한|운영하는|이끄는)?\s*",
                "",
                candidate,
            ).strip()
            if new == candidate:
                break
            candidate = new
        # Generic "X와 함께" / "X과 함께" without family prefix
        candidate = re.sub(
            r"^[A-Za-z가-힣\.][A-Za-z가-힣\s\.]{0,25}?"
            r"(?:와|과)\s*함께\s*"
            r"(?:공동\s*)?(?:창립한|설립한|창업한)?\s*",
            "",
            candidate,
        ).strip()

        # Generic "공동 창립한", "함께 설립한" — leftover after the above
        for prefix in ["함께 ", "공동 창립한 ", "공동 설립한 ", "공동 창업한 ",
                       "창립한 ", "설립한 ", "창업한 "]:
            if candidate.startswith(prefix):
                candidate = candidate[len(prefix):].strip()

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
            "재벌인 ", "재벌 ", "대기업인 ",
        ]
        # Also strip leading "N위 X" rank prefix (e.g. "2위 재벌인 X")
        candidate = re.sub(r"^\d+위\s+", "", candidate).strip()
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

        # Trim trailing connective phrases that crept into the capture:
        # "X를 창업했으며 이후", "X 사장 겸", "X 회장 겸 CEO 등"
        candidate = re.sub(
            r"(?:를|을)\s*(?:창업했으며|설립했으며|소유하고\s*있는|운영하고\s*있는)"
            r"(?:\s+이후|\s+현재)?$",
            "",
            candidate,
        ).strip()
        candidate = re.sub(r"\s+(?:사장|회장|CEO|대표)\s*겸\s*$", "", candidate).strip()

        # Reject results that are just generic English/Korean nouns —
        # extraction stripped too much and left only the modifier word.
        GENERIC_REJECTS = {
            "그룹", "회사", "기업", "산업", "분야", "그룹의", "회사의",
            "올해", "오늘", "현재", "지금", "이전", "당시",
            "company", "corp", "group", "inc", "ltd",
        }
        if candidate.lower() in GENERIC_REJECTS:
            continue
        # Reject results that contain unstripped sentence-glue
        if any(g in candidate for g in [
            "함께 ", "이며 ", "이자 ", " 분야", " 산업", " 영역",
            "라고 ", "하는 ", "관련 ",
        ]):
            continue
        # Reject results that still contain a year reference
        if re.search(r"\d{4}년|\d+월", candidate):
            continue
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
        # Control / ownership patterns: "X를 지배", "X를 소유", "X를 운영".
        # We deliberately exclude "이끌" — too noisy ("성과를 이끌었다",
        # "프로젝트를 이끌고" are common false matches).
        for verb in ["를 지배", "을 지배", "를 소유", "을 소유",
                     "를 운영", "을 운영"]:
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
            # Strip family clauses: "형 X와 함께", etc.
            cand = re.sub(
                r"^(?:쌍둥이\s*)?(?:형|동생|남편|아내|아버지|어머니|"
                r"쌍둥이 형)\s+[A-Za-z가-힣\.][A-Za-z가-힣\s\.]{0,25}?"
                r"(?:와|과)\s*함께\s*",
                "",
                cand,
            ).strip()
            # Strip year clauses
            cand = re.sub(
                r"^\d{4}년(?:\s*\d+월)?(?:부터|까지|에)?\s*"
                r"(?:\d{4}년(?:\s*\d+월)?(?:부터|까지|에)?\s*)?",
                "",
                cand,
            ).strip()
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

    # If --force is passed, re-extract for everyone (used when the extractor
    # changes). Otherwise we skip records that already have a company.
    force = "--force" in sys.argv

    filled = 0
    skipped_existing = 0
    no_match = 0

    for person in data:
        existing = person.get("company")
        if existing and not force:
            skipped_existing += 1
            continue

        source = person.get("source")
        company = extract_company(person)

        if company:
            person["company"] = company
            filled += 1
        elif not is_industry_source(source):
            # Source is already a usable company name — keep it as the company,
            # but trim any tail like " 명예회장 (2018년 ...)", "·CEO ..." that
            # some hand-written Korean records included.
            clean = source.strip()
            # Cut at the EARLIEST separator: a Korean role-title marker or a
            # parenthetical aside. Find the smallest positive index across
            # all separators so we trim as aggressively as possible.
            seps = [" 명예", " 회장", " 부회장", " 대표", " CEO",
                    " 창업주", " 총괄", "·", " (", "("]
            best_idx = -1
            for sep in seps:
                idx = clean.find(sep)
                if idx > 0 and (best_idx < 0 or idx < best_idx):
                    best_idx = idx
            if best_idx > 0:
                clean = clean[:best_idx].strip()
            person["company"] = clean
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
