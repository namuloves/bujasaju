#!/usr/bin/env python3
"""Merge birthday batch results and apply to public/billionaires.json"""

import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
BILLIONAIRES_FILE = os.path.join(PROJECT_DIR, "public", "billionaires.json")
FIX_FILE = os.path.join(SCRIPT_DIR, "fix-birthdays-jan1.json")

# Load the target list to get all IDs we need to update
with open(FIX_FILE, "r", encoding="utf-8") as f:
    fix_data = json.load(f)
all_target_ids = {p["id"] for p in fix_data["people"]}
print(f"Total target IDs from fix file: {len(all_target_ids)}")

# Load and merge all batch results
merged = {}
for i in range(1, 6):
    batch_file = os.path.join(SCRIPT_DIR, f"birthday-batch{i}.json")
    if not os.path.exists(batch_file):
        print(f"WARNING: {batch_file} not found!")
        continue
    with open(batch_file, "r", encoding="utf-8") as f:
        batch = json.load(f)
    print(f"Batch {i}: {len(batch)} entries")
    merged.update(batch)

print(f"\nTotal merged entries: {len(merged)}")

# Count results
confirmed = 0
null_count = 0
still_jan1 = 0
changed_date = 0

for id_str, val in merged.items():
    if val is None:
        null_count += 1
    elif val.endswith("-01-01"):
        still_jan1 += 1
    else:
        changed_date += 1
        confirmed += 1

print(f"Confirmed (non-Jan-1 date): {changed_date}")
print(f"Still Jan 1 (year-only confirmation): {still_jan1}")
print(f"Set to null (unknown): {null_count}")

# Check for IDs in fix list but not in merged results
missing_from_research = all_target_ids - set(merged.keys())
if missing_from_research:
    print(f"\nWARNING: {len(missing_from_research)} IDs not researched:")
    for mid in sorted(missing_from_research, key=int):
        # Find the name
        name = next((p["name"] for p in fix_data["people"] if p["id"] == mid), "?")
        print(f"  ID {mid}: {name}")
    # Set missing ones to null
    for mid in missing_from_research:
        merged[mid] = None
        null_count += 1
    print(f"Setting all missing to null. Updated null count: {null_count}")

# Now load billionaires.json and apply updates
print(f"\nLoading {BILLIONAIRES_FILE}...")
with open(BILLIONAIRES_FILE, "r", encoding="utf-8") as f:
    billionaires = json.load(f)
print(f"Loaded {len(billionaires)} billionaires")

# Build index by id
updates_applied = 0
not_found = []
for entry in billionaires:
    eid = str(entry.get("id", ""))
    if eid in merged:
        new_val = merged[eid]
        old_val = entry.get("birthday")
        entry["birthday"] = new_val
        updates_applied += 1

print(f"\nUpdates applied: {updates_applied}")
if updates_applied != len(merged):
    print(f"WARNING: Expected {len(merged)} updates but only applied {updates_applied}")
    # Find which IDs weren't found in billionaires.json
    billionaire_ids = {str(e.get("id", "")) for e in billionaires}
    missing = set(merged.keys()) - billionaire_ids
    if missing:
        print(f"IDs not found in billionaires.json: {sorted(missing, key=lambda x: int(x) if x.isdigit() else 0)[:20]}...")

# Save
with open(BILLIONAIRES_FILE, "w", encoding="utf-8") as f:
    json.dump(billionaires, f, ensure_ascii=False, indent=2)
print(f"\nSaved updated billionaires.json")

# Final summary
print(f"\n{'='*50}")
print(f"BIRTHDAY UPDATE SUMMARY")
print(f"{'='*50}")
print(f"Total people checked:       {len(merged)}")
print(f"Confirmed new dates:        {changed_date}")
print(f"Kept as Jan 1 (year only):  {still_jan1}")
print(f"Set to null (unknown):      {null_count}")
print(f"Updates applied:            {updates_applied}")
print(f"{'='*50}")
