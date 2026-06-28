/**
 * Merge cowork patch files into enriched-billionaires.json.
 *
 * Input:  .cowork/company-name-patches/batch-*.json
 *         Each file is an array of {id, companyKo} objects.
 * Output: companyKo field inserted into the matching person row in
 *         public/enriched-billionaires.json.
 *
 * Skips rows where companyKo is empty string (cowork couldn't determine
 * a company name with confidence).
 *
 * Preserves the original single-line file formatting via raw-string
 * insertion — same approach used for the email-tone work earlier.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ENRICHED = 'public/enriched-billionaires.json';
const PATCH_DIR = '.cowork/company-name-patches';

interface Patch {
  id: string;
  companyKo: string;
}

async function main() {
  // 1) Collect all patches
  const patches = new Map<string, string>();
  const files = (await readdir(PATCH_DIR))
    .filter((f) => f.startsWith('batch-') && f.endsWith('.json'))
    .sort();

  let totalRows = 0;
  let nonEmpty = 0;
  for (const f of files) {
    const raw = await readFile(join(PATCH_DIR, f), 'utf8');
    const arr = JSON.parse(raw) as Patch[];
    for (const p of arr) {
      totalRows++;
      if (!p.companyKo) continue;
      nonEmpty++;
      patches.set(p.id, p.companyKo);
    }
  }
  console.log(`Patch files: ${files.length}`);
  console.log(`Total rows: ${totalRows}, non-empty companyKo: ${nonEmpty}`);

  // 2) Read enriched file as raw text
  const raw = await readFile(ENRICHED, 'utf8');

  // Sanity check — make sure people don't already have companyKo (we don't
  // want to double-insert on a re-run).
  if (raw.includes('"companyKo":')) {
    console.error('enriched-billionaires.json already contains "companyKo" — skipping to avoid double-insert. Restore from git first if you want to re-merge.');
    process.exit(1);
  }

  // 3) For each patch, locate the person row by id marker and insert
  //    "companyKo": "..." right after "id": "...",
  let out = raw;
  let inserted = 0;
  const misses: string[] = [];

  for (const [id, companyKo] of patches) {
    const idMarker = `"id": "${id}",`;
    const idx = out.indexOf(idMarker);
    if (idx === -1) {
      misses.push(id);
      continue;
    }
    const insertion = `"companyKo": ${JSON.stringify(companyKo)},`;
    out = out.slice(0, idx + idMarker.length) + insertion + out.slice(idx + idMarker.length);
    inserted++;
  }

  await writeFile(ENRICHED, out, 'utf8');

  console.log(`Inserted: ${inserted}`);
  if (misses.length) {
    console.warn(`Could not locate ${misses.length} ids in enriched file (first 10): ${misses.slice(0, 10).join(', ')}`);
  }

  // 4) Verify the file still parses
  const parsed = JSON.parse(out) as Array<Record<string, unknown>>;
  const sample = parsed.filter((p) => p.companyKo).slice(0, 5);
  console.log('\nSample of newly-set companyKo:');
  for (const p of sample) {
    console.log(`  ${p.nameKo || p.name}: ${p.source} → ${p.companyKo}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
