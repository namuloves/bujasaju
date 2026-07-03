/**
 * Conservative reshape pass for v2 deep bios that fail validation only because
 * of MECHANICAL schema drift — never invents content.
 *
 * What it fixes (safe, derivable):
 *   1. careerTimeline[].age / turningPoints[].age / failures[].age
 *      — computed from the person's birthday (year - birthYear). This is the
 *        single biggest error class and is purely arithmetic.
 *
 * What it deliberately does NOT touch (would require inventing/guessing):
 *   - childhood.summaryKo -> birthPlaceKo/familyBackgroundKo/earlyLifeKo
 *     (can't split one blob into three facts without fabricating)
 *   - old moneyMechanics / characterKo keys (different meaning, not a rename)
 *   - thin timelines / <3 failures / <2 turningPoints (need research)
 *
 * Usage:
 *   node scripts/reshape-deep-bio-v2.mjs --dry   # report only, write nothing
 *   node scripts/reshape-deep-bio-v2.mjs         # apply age fixes in place
 *
 * After applying, re-run scripts/validate-deep-bio-v2.mjs to see the new pass
 * count, then rebuild the index.
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bioDir = path.join(root, 'public', 'deep-bios-v2');
const people = JSON.parse(
  fs.readFileSync(path.join(root, 'public', 'billionaires.json'), 'utf8'),
);
const birthYearById = new Map(
  people
    .filter((p) => p.birthday)
    .map((p) => [String(p.id), Number(String(p.birthday).slice(0, 4))]),
);

const dry = process.argv.includes('--dry');
const files = fs.readdirSync(bioDir).filter((f) => /^\d+\.json$/.test(f));

let filesChanged = 0;
let agesAdded = 0;
let skippedNoBirthYear = 0;

function addAges(events, birthYear) {
  let added = 0;
  if (!Array.isArray(events)) return 0;
  for (const e of events) {
    if (
      e &&
      Number.isInteger(e.year) &&
      !Number.isFinite(e.age) &&
      Number.isFinite(birthYear)
    ) {
      e.age = e.year - birthYear;
      added += 1;
    }
  }
  return added;
}

for (const file of files) {
  const id = file.replace(/\.json$/, '');
  const birthYear = birthYearById.get(id);
  if (!Number.isFinite(birthYear)) {
    continue; // no birthday in DB -> can't derive age, leave untouched
  }

  const filePath = path.join(bioDir, file);
  let bio;
  try {
    bio = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    continue;
  }

  const before =
    addAges(bio.careerTimeline, birthYear) +
    addAges(bio.turningPoints, birthYear) +
    addAges(bio.failures, birthYear);

  if (before > 0) {
    agesAdded += before;
    filesChanged += 1;
    if (!dry) {
      fs.writeFileSync(filePath, JSON.stringify(bio, null, 2) + '\n');
    }
  }
}

console.log(dry ? '(dry run — no files written)' : '(applied)');
console.log(`Files with age fields added: ${filesChanged}`);
console.log(`Total age values filled: ${agesAdded}`);
console.log(
  `\nNote: this only fixes the derivable 'age' errors. Files still failing after\n` +
    `this need content work (childhood split, key remap, or more research) —\n` +
    `re-run scripts/validate-deep-bio-v2.mjs to see what remains.`,
);
