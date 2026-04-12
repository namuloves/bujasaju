#!/usr/bin/env python3
"""
Fix remaining issues:
1. Add Shintaro Tsuji (id 3309) birthday: 1927-12-07
2. Convert any remaining -01-01 placeholders to null for the target list
3. But KEEP confirmed Jan 1 dates if the agent explicitly verified them
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
BILLIONAIRES_FILE = os.path.join(PROJECT_DIR, "public", "billionaires.json")
FIX_FILE = os.path.join(SCRIPT_DIR, "fix-birthdays-jan1.json")

# Load target list
with open(FIX_FILE, "r", encoding="utf-8") as f:
    fix_data = json.load(f)
target_ids = {p["id"] for p in fix_data["people"]}

# Load batch results to find which Jan 1 dates were explicitly confirmed vs just left as-is
confirmed_jan1 = set()  # IDs where agents explicitly confirmed Jan 1 as real birthday
for i in range(1, 6):
    batch_file = os.path.join(SCRIPT_DIR, f"birthday-batch{i}.json")
    if not os.path.exists(batch_file):
        continue
    with open(batch_file, "r", encoding="utf-8") as f:
        batch = json.load(f)
    # If the value is a string ending in -01-01 but different year from the placeholder,
    # the agent found something. If same year-01-01, it's likely unchanged.
    for id_str, val in batch.items():
        if val is not None and val.endswith("-01-01"):
            # Check if year matches the original placeholder
            orig = next((p for p in fix_data["people"] if p["id"] == id_str), None)
            if orig:
                orig_year = orig["currentBirthday"][:4]
                new_year = val[:4]
                if new_year != orig_year:
                    # Agent changed the year - they found something
                    confirmed_jan1.add(id_str)
                # If same year, it's still a placeholder - will be set to null

# Load billionaires
with open(BILLIONAIRES_FILE, "r", encoding="utf-8") as f:
    billionaires = json.load(f)

# Apply fixes
nullified = 0
tsuji_fixed = False

for entry in billionaires:
    eid = str(entry.get("id", ""))

    # Fix Shintaro Tsuji
    if eid == "3309":
        entry["birthday"] = "1927-12-07"
        tsuji_fixed = True
        continue

    # For target IDs that still have -01-01 dates and aren't explicitly confirmed
    if eid in target_ids and eid not in confirmed_jan1:
        bday = entry.get("birthday")
        if bday is not None and isinstance(bday, str) and bday.endswith("-01-01"):
            entry["birthday"] = None
            nullified += 1

# Save
with open(BILLIONAIRES_FILE, "w", encoding="utf-8") as f:
    json.dump(billionaires, f, ensure_ascii=False, indent=2)

print(f"Tsuji fixed: {tsuji_fixed}")
print(f"Jan-1 placeholders nullified: {nullified}")
print(f"Confirmed Jan-1 dates kept: {len(confirmed_jan1)}")

# Final count
confirmed_dates = 0
null_dates = 0
for entry in billionaires:
    eid = str(entry.get("id", ""))
    if eid in target_ids or eid == "3309":
        bday = entry.get("birthday")
        if bday is None:
            null_dates += 1
        else:
            confirmed_dates += 1

print(f"\n{'='*50}")
print(f"FINAL BIRTHDAY UPDATE SUMMARY")
print(f"{'='*50}")
print(f"Total people processed:     {len(target_ids) + 1}")
print(f"Confirmed real birthdays:   {confirmed_dates}")
print(f"Set to null (unknown):      {null_dates}")
print(f"{'='*50}")
