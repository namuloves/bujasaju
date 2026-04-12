#!/usr/bin/env python3
"""Find the next 100 billionaires to create deep bios for, maximizing 일주 coverage."""

import json
import re

# 1. Load billionaires
with open("/Users/namu_1/sajubuja/public/enriched-billionaires.json") as f:
    billionaires = json.load(f)

# 2. Parse DEEP_BIO_IDS from deepBio.ts
with open("/Users/namu_1/sajubuja/src/lib/deepBio.ts") as f:
    ts_content = f.read()

# Extract all IDs from the Set
ids_match = re.search(r"new Set\(\[(.*?)\]\)", ts_content, re.DOTALL)
deep_bio_ids = set(re.findall(r"'(\d+)'", ids_match.group(1)))

print(f"Total billionaires: {len(billionaires)}")
print(f"Current deep bio count: {len(deep_bio_ids)}")

# 3. Build lookup: id -> billionaire
by_id = {b["id"]: b for b in billionaires}

# 4. Count current 일주 coverage
ilju_coverage = {}  # ilju -> count of deep bios
for bid in deep_bio_ids:
    b = by_id.get(bid)
    if b and b.get("saju") and b["saju"].get("ilju"):
        ilju = b["saju"]["ilju"]
        ilju_coverage[ilju] = ilju_coverage.get(ilju, 0) + 1

# All 60 갑자
STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"]
BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"]
ALL_60 = []
for i in range(60):
    ALL_60.append(STEMS[i % 10] + BRANCHES[i % 12])

print(f"\n일주 coverage summary:")
coverage_counts = []
for ilju in ALL_60:
    c = ilju_coverage.get(ilju, 0)
    coverage_counts.append((ilju, c))

coverage_counts.sort(key=lambda x: x[1])
for ilju, c in coverage_counts:
    print(f"  {ilju}: {c}")

zero_count = sum(1 for _, c in coverage_counts if c == 0)
one_count = sum(1 for _, c in coverage_counts if c == 1)
two_count = sum(1 for _, c in coverage_counts if c == 2)
print(f"\n일주 with 0 bios: {zero_count}")
print(f"일주 with 1 bio: {one_count}")
print(f"일주 with 2 bios: {two_count}")

# 5. Pick next 100
# Candidates: billionaires NOT already having deep bios, WITH valid ilju
candidates = []
for b in billionaires:
    if b["id"] in deep_bio_ids:
        continue
    if not b.get("saju") or not b["saju"].get("ilju"):
        continue
    candidates.append(b)

# Sort candidates by net worth descending (tiebreaker)
candidates.sort(key=lambda b: b.get("netWorth", 0), reverse=True)

# Greedy selection: simulate adding one at a time,
# always picking from the ilju with lowest coverage, highest net worth
import heapq

# Track coverage as we go
sim_coverage = dict(ilju_coverage)  # mutable copy

# Group candidates by ilju
from collections import defaultdict
by_ilju = defaultdict(list)
for b in candidates:
    ilju = b["saju"]["ilju"]
    by_ilju[ilju].append(b)  # already sorted by net worth desc

# Track pointer per ilju (which candidate to pick next)
ilju_ptr = {ilju: 0 for ilju in ALL_60}

selected = []
for _ in range(100):
    # Find the ilju with lowest coverage that still has candidates
    best_ilju = None
    best_coverage = float('inf')
    best_net_worth = -1

    for ilju in ALL_60:
        ptr = ilju_ptr.get(ilju, 0)
        if ptr >= len(by_ilju.get(ilju, [])):
            continue  # no more candidates for this ilju
        cov = sim_coverage.get(ilju, 0)
        # Pick lowest coverage; tie-break by highest net worth of next candidate
        next_candidate_nw = by_ilju[ilju][ptr].get("netWorth", 0)
        if cov < best_coverage or (cov == best_coverage and next_candidate_nw > best_net_worth):
            best_coverage = cov
            best_ilju = ilju
            best_net_worth = next_candidate_nw

    if best_ilju is None:
        break

    ptr = ilju_ptr[best_ilju]
    pick = by_ilju[best_ilju][ptr]
    ilju_ptr[best_ilju] = ptr + 1
    sim_coverage[best_ilju] = sim_coverage.get(best_ilju, 0) + 1

    selected.append({
        "id": pick["id"],
        "name": pick["name"],
        "nameKo": pick.get("nameKo"),
        "netWorth": pick.get("netWorth"),
        "industry": pick.get("industry"),
        "nationality": pick.get("nationality"),
        "ilju": pick["saju"]["ilju"],
        "currentCoverageForThisIlju": ilju_coverage.get(pick["saju"]["ilju"], 0),
    })

# 6. Output summary
print(f"\nSelected {len(selected)} billionaires for next deep bios")

# Check new coverage
new_coverage = dict(ilju_coverage)
for s in selected:
    ilju = s["ilju"]
    new_coverage[ilju] = new_coverage.get(ilju, 0) + 1

new_min = min(new_coverage.get(ilju, 0) for ilju in ALL_60)
new_below3 = sum(1 for ilju in ALL_60 if new_coverage.get(ilju, 0) < 3)
print(f"After adding these 100:")
print(f"  Min coverage per ilju: {new_min}")
print(f"  일주 with < 3 bios: {new_below3}")

# Coverage distribution after
from collections import Counter
dist = Counter(new_coverage.get(ilju, 0) for ilju in ALL_60)
for k in sorted(dist.keys()):
    print(f"  {k} bios: {dist[k]} 일주 values")

# Save
with open("/Users/namu_1/sajubuja/scripts/next-100-deep-bios.json", "w") as f:
    json.dump(selected, f, indent=2, ensure_ascii=False)

print(f"\nSaved to scripts/next-100-deep-bios.json")
