/**
 * Apply cowork-produced company names from
 *   .cowork/missing-companies-output.json
 * onto public/billionaires.json.
 *
 * Output file shape: [{ id, company }, ...]. Records with company === null
 * or missing are skipped. Existing company fields are NOT overwritten —
 * this script only fills blanks.
 *
 * Run:   npx tsx scripts/merge-companies.ts
 *        npx tsx scripts/merge-companies.ts --dry
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const BILLIONAIRES = join(ROOT, 'public', 'billionaires.json');
const COWORK_OUT = join(ROOT, '.cowork', 'missing-companies-output.json');

const dryRun = process.argv.includes('--dry');

interface Person {
  id: string;
  name: string;
  nameKo?: string;
  company?: string;
}
interface CoworkEntry {
  id: string;
  company: string | null;
}

function main() {
  const all: Person[] = JSON.parse(readFileSync(BILLIONAIRES, 'utf8'));
  const patches: CoworkEntry[] = JSON.parse(readFileSync(COWORK_OUT, 'utf8'));

  const byId = new Map(all.map((p) => [String(p.id), p]));
  let applied = 0;
  let skippedAlreadySet = 0;
  let skippedNull = 0;
  let unknownId = 0;

  for (const patch of patches) {
    if (!patch.company || !patch.company.trim()) {
      skippedNull++;
      continue;
    }
    const p = byId.get(String(patch.id));
    if (!p) {
      unknownId++;
      continue;
    }
    if (p.company) {
      skippedAlreadySet++;
      continue;
    }
    p.company = patch.company.trim();
    applied++;
  }

  console.log(`Patches read:        ${patches.length}`);
  console.log(`Applied:             ${applied}`);
  console.log(`Skipped (null):      ${skippedNull}`);
  console.log(`Skipped (existing):  ${skippedAlreadySet}`);
  console.log(`Unknown id:          ${unknownId}`);

  if (!dryRun) {
    writeFileSync(BILLIONAIRES, JSON.stringify(all, null, 2));
    console.log(`\nWrote ${BILLIONAIRES}`);
  } else {
    console.log('\n[dry-run] No file written.');
  }
}

main();
