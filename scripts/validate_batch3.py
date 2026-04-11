#!/usr/bin/env python3
"""Validate batch 3 deep bio files (101-150) for correctness."""

import json
import os
import sys

DEEP_BIOS_DIR = os.path.join(os.path.dirname(__file__), "deep-bios")

# Expected ID mapping from targetList
EXPECTED_IDS = {
    "101-julia-koch.json": "23",
    "102-vladimir-potanin.json": "75",
    "103-vagit-alekperov.json": "77",
    "104-leonid-mikhelson.json": "80",
    "105-francois-pinault.json": "81",
    "106-stefan-quandt.json": "82",
    "107-susanne-klatten.json": "83",
    "108-huang-shilin.json": "84",
    "109-andreas-von-bechtolsheim.json": "86",
    "110-reinhold-wuerth.json": "88",
    "111-emmanuel-besnier.json": "89",
    "112-vicky-safra.json": "90",
    "113-israel-englander.json": "91",
    "114-rick-cohen.json": "92",
    "115-suleiman-kerimov.json": "93",
    "116-cyrus-poonawalla.json": "95",
    "117-vladimir-lisin.json": "96",
    "118-gina-rinehart.json": "97",
    "119-lei-jun.json": "98",
    "120-pham-nhat-vuong.json": "99",
    "121-dilip-shanghvi.json": "100",
    "122-daniel-gilbert.json": "101",
    "123-gennady-timchenko.json": "102",
    "124-christy-walton.json": "103",
    "125-dang-yanbao.json": "104",
    "126-david-tepper.json": "105",
    "127-wang-chuanfu.json": "106",
    "128-steve-cohen.json": "107",
    "129-harry-triguboff.json": "108",
    "130-diane-hendricks.json": "110",
    "131-jay-y-lee.json": "111",
    "132-stanley-kroenke.json": "112",
    "133-stefan-persson.json": "113",
    "134-todd-graves.json": "114",
    "135-john-fredriksen.json": "115",
    "136-michael-platt.json": "116",
    "137-zhong-huijuan.json": "117",
    "138-eric-li.json": "118",
    "139-prince-alwaleed-bin-talal-alsaud.json": "119",
    "140-ernest-garcia-ii.json": "120",
    "141-yu-yong.json": "121",
    "142-andrey-melnichenko.json": "122",
    "143-henry-nicholas-iii.json": "123",
    "144-jerry-jones.json": "124",
    "145-nancy-walton-laurie.json": "125",
    "146-renata-kellnerova.json": "126",
    "147-philip-anschutz.json": "127",
    "148-kumar-birla.json": "128",
    "149-andrew-forrest.json": "129",
    "150-donald-bren.json": "130",
}

# Required Korean fields to check
REQUIRED_KO_FIELDS = {
    "childhood": ["birthPlaceKo", "familyBackgroundKo", "educationKo", "earlyLifeKo"],
    "careerTimeline": ["eventKo"],  # each item
    "failures": ["descriptionKo", "lessonKo"],  # each item
    "quotes": ["textKo", "contextKo"],  # each item
    "personalTraits": ["knownForKo", "philanthropyKo", "controversiesKo"],
}

errors = []
warnings = []
files_checked = 0
files_missing = []

for filename, expected_id in EXPECTED_IDS.items():
    filepath = os.path.join(DEEP_BIOS_DIR, filename)

    if not os.path.exists(filepath):
        files_missing.append(filename)
        errors.append(f"MISSING: {filename}")
        continue

    files_checked += 1

    # 1. Valid JSON check
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        errors.append(f"JSON ERROR in {filename}: {e}")
        continue

    # 2. ID check
    actual_id = data.get("id")
    if str(actual_id) != str(expected_id):
        errors.append(f"ID MISMATCH in {filename}: expected '{expected_id}', got '{actual_id}'")

    # 3. Korean fields in childhood
    childhood = data.get("childhood", {})
    for field in REQUIRED_KO_FIELDS["childhood"]:
        val = childhood.get(field)
        if val is None or (isinstance(val, str) and val.strip() == ""):
            errors.append(f"MISSING FIELD in {filename}: childhood.{field}")

    # 4. Korean fields in careerTimeline
    timeline = data.get("careerTimeline", [])
    if len(timeline) < 5:
        warnings.append(f"LOW COUNT in {filename}: careerTimeline has only {len(timeline)} events (min 5 recommended)")
    for i, item in enumerate(timeline):
        if "eventKo" not in item or not item.get("eventKo"):
            errors.append(f"MISSING FIELD in {filename}: careerTimeline[{i}].eventKo")
        if "event" not in item or not item.get("event"):
            errors.append(f"MISSING FIELD in {filename}: careerTimeline[{i}].event")

    # 5. Korean fields in failures
    fails = data.get("failures", [])
    if len(fails) < 2:
        warnings.append(f"LOW COUNT in {filename}: failures has only {len(fails)} entries (min 2 recommended)")
    for i, item in enumerate(fails):
        for field in REQUIRED_KO_FIELDS["failures"]:
            if field not in item or not item.get(field):
                errors.append(f"MISSING FIELD in {filename}: failures[{i}].{field}")

    # 6. wealthHistory - check netWorth is in billions (should be < 1000)
    wealth = data.get("wealthHistory", [])
    if len(wealth) < 5:
        warnings.append(f"LOW COUNT in {filename}: wealthHistory has only {len(wealth)} entries (min 5 recommended)")
    for i, item in enumerate(wealth):
        nw = item.get("netWorth")
        if nw is not None and nw > 999:
            errors.append(f"NETWORTH FORMAT in {filename}: wealthHistory[{i}].netWorth = {nw} (should be in billions, e.g. 24.5)")

    # 7. Korean fields in quotes
    quotes = data.get("quotes", [])
    if len(quotes) < 3:
        warnings.append(f"LOW COUNT in {filename}: quotes has only {len(quotes)} entries (min 3 recommended)")
    for i, item in enumerate(quotes):
        for field in REQUIRED_KO_FIELDS["quotes"]:
            if field not in item or not item.get(field):
                errors.append(f"MISSING FIELD in {filename}: quotes[{i}].{field}")

    # 8. Korean fields in personalTraits
    traits = data.get("personalTraits", {})
    for field in REQUIRED_KO_FIELDS["personalTraits"]:
        val = traits.get(field)
        if val is None or (isinstance(val, str) and val.strip() == ""):
            errors.append(f"MISSING FIELD in {filename}: personalTraits.{field}")

    # 9. Books - check for Ko fields
    books = data.get("books", {})
    for i, item in enumerate(books.get("recommended", [])):
        if "whyKo" not in item or not item.get("whyKo"):
            errors.append(f"MISSING FIELD in {filename}: books.recommended[{i}].whyKo")

# Summary
print("=" * 60)
print(f"BATCH 3 VALIDATION REPORT")
print("=" * 60)
print(f"Files expected: {len(EXPECTED_IDS)}")
print(f"Files checked:  {files_checked}")
print(f"Files missing:  {len(files_missing)}")
print(f"Errors:         {len(errors)}")
print(f"Warnings:       {len(warnings)}")
print("=" * 60)

if files_missing:
    print(f"\nMISSING FILES ({len(files_missing)}):")
    for f in files_missing:
        print(f"  - {f}")

if errors:
    print(f"\nERRORS ({len(errors)}):")
    for e in errors:
        print(f"  - {e}")

if warnings:
    print(f"\nWARNINGS ({len(warnings)}):")
    for w in warnings:
        print(f"  - {w}")

if not errors and not files_missing:
    print("\nAll batch 3 files passed validation!")

sys.exit(1 if errors or files_missing else 0)
