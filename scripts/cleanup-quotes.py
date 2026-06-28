# -*- coding: utf-8 -*-
"""
Two cleanups across all 종합풀이 entries:
1. Remove single quotes around ilju name at the start: "'신사'일주는" -> "신사일주는"
2. Remove single quotes around "결과 도출": "'결과 도출' 집념" -> "결과 도출 집념"
   More broadly: scan for other suspect single-quoted Korean phrases and report them.
"""
import json
import re
from collections import OrderedDict

PATH = 'data/summary/ilju-summary.json'

with open(PATH, 'r', encoding='utf-8') as f:
    d = json.load(f, object_pairs_hook=OrderedDict)

# 60 ilju names
ilju_names = list(d.keys())

changes_total = 0
all_quoted_phrases = set()

for ilju, entry in d.items():
    if "종합풀이" not in entry:
        continue
    text = entry["종합풀이"]
    orig = text

    # Fix 1: leading "'<ilju>'일주는" -> "<ilju>일주는"
    # Also any "'<ilju>'일주" anywhere in text
    for name in ilju_names:
        text = text.replace(f"'{name}'일주", f"{name}일주")

    # Fix 2: specifically remove quotes around "결과 도출"
    text = text.replace("'결과 도출'", "결과 도출")

    # Collect any remaining single-quoted Korean phrases for visibility (not auto-removed)
    for m in re.finditer(r"'([^']{1,30})'", text):
        phrase = m.group(1)
        # only flag if has Korean
        if re.search(r"[가-힣]", phrase):
            all_quoted_phrases.add(phrase)

    if text != orig:
        entry["종합풀이"] = text
        changes_total += 1
        print(f"FIXED {ilju}")

with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

print(f"\n총 {changes_total}개 entry 수정됨")
print(f"\n--- 남아있는 작은따옴표 한국어 표현 (참고용, 자동삭제 안 함) ---")
for p in sorted(all_quoted_phrases):
    print(f"  '{p}'")
