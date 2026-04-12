#!/usr/bin/env python3
"""Analyze deep bio coverage at the 일주 × 월지 intersection level."""

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 1. Load billionaires
with open(ROOT / "public" / "enriched-billionaires.json") as f:
    billionaires = json.load(f)

# 2. Parse DEEP_BIO_IDS from deepBio.ts
ts_path = ROOT / "src" / "lib" / "deepBio.ts"
ts_text = ts_path.read_text()
match = re.search(r"const DEEP_BIO_IDS = new Set\(\[(.*?)\]\)", ts_text, re.DOTALL)
deep_bio_ids = set(re.findall(r"'(\d+)'", match.group(1)))
print(f"Total deep bio IDs: {len(deep_bio_ids)}")

# 3. Build ilju×wolji buckets
combos = defaultdict(lambda: {"total": 0, "deep": 0, "people": []})

for p in billionaires:
    saju = p.get("saju")
    if not saju:
        continue
    ilju = saju.get("ilju")
    wolji = saju.get("wolji")
    if not ilju or not wolji:
        continue
    key = f"{ilju}_{wolji}"
    combos[key]["total"] += 1
    has_deep = p["id"] in deep_bio_ids
    if has_deep:
        combos[key]["deep"] += 1
    combos[key]["people"].append({
        "id": p["id"],
        "name": p["name"],
        "netWorth": p.get("netWorth", 0),
        "hasDeepBio": has_deep,
    })

# Sort people by net worth descending
for v in combos.values():
    v["people"].sort(key=lambda x: x["netWorth"], reverse=True)

# 4. Classify
critical = []  # 0 deep bios
low = []       # 1 deep bio

for key, data in sorted(combos.items()):
    ilju, wolji = key.split("_")
    entry = {
        "ilju": ilju,
        "wolji": wolji,
        "total": data["total"],
        "deepBioCount": data["deep"],
    }
    if data["deep"] == 0:
        entry["candidates"] = [
            {"id": p["id"], "name": p["name"], "netWorth": p["netWorth"]}
            for p in data["people"][:3]
        ]
        critical.append(entry)
    elif data["deep"] == 1:
        entry["candidates"] = [
            {"id": p["id"], "name": p["name"], "netWorth": p["netWorth"]}
            for p in data["people"] if not p["hasDeepBio"]
        ][:3]
        low.append(entry)

total_combos = len(combos)
zero_deep = len(critical)
one_deep = len(low)

# 5. Print summary
print(f"\n=== 일주×월지 Coverage Summary ===")
print(f"Total combos with ≥1 billionaire: {total_combos}")
print(f"Combos with 0 deep bios (CRITICAL): {zero_deep}")
print(f"Combos with 1 deep bio (LOW):       {one_deep}")
print(f"Combos with 2+ deep bios (OK):      {total_combos - zero_deep - one_deep}")

print(f"\n=== CRITICAL combos (0 deep bios) — {zero_deep} total ===")
# Sort critical by total billionaires descending (most impactful first)
critical.sort(key=lambda x: x["total"], reverse=True)
for c in critical:
    cands = ", ".join(f"{p['name']} (${p['netWorth']}B)" for p in c["candidates"])
    print(f"  {c['ilju']}+{c['wolji']} ({c['total']} people) → {cands}")

print(f"\n=== LOW combos (1 deep bio) — {one_deep} total ===")
low.sort(key=lambda x: x["total"], reverse=True)
for l in low:
    cands = ", ".join(f"{p['name']} (${p['netWorth']}B)" for p in l["candidates"][:2])
    print(f"  {l['ilju']}+{l['wolji']} ({l['total']} people) → next: {cands}")

# 6. Save JSON output
output = {
    "summary": {
        "totalCombos": total_combos,
        "zeroDeepBios": zero_deep,
        "oneDeepBio": one_deep,
        "twoOrMoreDeepBios": total_combos - zero_deep - one_deep,
        "totalDeepBioIds": len(deep_bio_ids),
    },
    "critical": critical,
    "low": low,
}

out_path = ROOT / "scripts" / "ilju-wolji-coverage.json"
with open(out_path, "w") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
print(f"\nSaved to {out_path}")
