// Applies scripts/korean-names-extracted.json into public/billionaires.json.
// Only sets nameKo when extraction has a non-empty value and the target
// currently lacks one (idempotent).

import * as fs from 'fs';

const DATA_PATH = '/Users/namu_1/sajubuja/public/billionaires.json';
const EXTRACT_PATH = '/Users/namu_1/sajubuja/scripts/korean-names-extracted.json';

interface Extracted {
  id: string;
  name: string;
  nameKo: string;
}

function main() {
  const extracted: Record<string, Extracted> = JSON.parse(
    fs.readFileSync(EXTRACT_PATH, 'utf8')
  );
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) as any[];

  let applied = 0;
  let skippedExisting = 0;
  let skippedBlank = 0;
  let notFound = 0;

  for (const person of data) {
    const entry = extracted[person.id];
    if (!entry) {
      notFound++;
      continue;
    }
    const ko = (entry.nameKo || '').trim();
    if (!ko) {
      skippedBlank++;
      continue;
    }
    if (person.nameKo && person.nameKo.trim()) {
      skippedExisting++;
      continue;
    }
    person.nameKo = ko;
    applied++;
  }

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`Applied nameKo: ${applied}`);
  console.log(`Skipped (already had nameKo): ${skippedExisting}`);
  console.log(`Skipped (extraction blank): ${skippedBlank}`);
  console.log(`Not in extraction file: ${notFound}`);
  console.log(`Total people: ${data.length}`);
}

main();
