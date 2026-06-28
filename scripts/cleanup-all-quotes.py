# -*- coding: utf-8 -*-
"""
Remove ALL single quotes around Korean-containing phrases in 종합풀이.
"""
import json
import re
from collections import OrderedDict

PATH = 'data/summary/ilju-summary.json'

with open(PATH, 'r', encoding='utf-8') as f:
    d = json.load(f, object_pairs_hook=OrderedDict)

changes_total = 0
for ilju, entry in d.items():
    if "종합풀이" not in entry:
        continue
    text = entry["종합풀이"]
    # Remove single quotes around any phrase that contains Korean
    new_text = re.sub(
        r"'([^']*[가-힣][^']*)'",
        r"\1",
        text,
    )
    if new_text != text:
        entry["종합풀이"] = new_text
        changes_total += 1

with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

print(f"{changes_total}개 entry 수정")

# Verify: any single-quoted Korean phrases remaining?
remaining = set()
for ilju, entry in d.items():
    if "종합풀이" not in entry:
        continue
    for m in re.finditer(r"'([^']{1,40})'", entry["종합풀이"]):
        if re.search(r"[가-힣]", m.group(1)):
            remaining.add(m.group(1))

if remaining:
    print(f"\n남아있는 작은따옴표: {sorted(remaining)}")
else:
    print("\n작은따옴표 한국어 표현 모두 제거됨")
