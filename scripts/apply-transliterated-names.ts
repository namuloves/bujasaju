/**
 * Apply transliterated Korean names from scripts/transliterated-names.json
 * into public/billionaires.json.
 *
 * Usage:
 *   tsx scripts/apply-transliterated-names.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface TransliterationResult {
  id: string;
  name: string;
  nationality: string;
  nameKo: string;
}

const dataPath = path.join(process.cwd(), 'public', 'billionaires.json');
const transliterationsPath = path.join(process.cwd(), 'scripts', 'transliterated-names.json');

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const transliterations: TransliterationResult[] = JSON.parse(
  fs.readFileSync(transliterationsPath, 'utf8'),
);

const map = new Map(transliterations.map((t) => [t.id, t.nameKo]));

let updated = 0;
for (const person of data) {
  const ko = map.get(person.id);
  if (ko && (!person.nameKo || person.nameKo === person.name)) {
    person.nameKo = ko;
    updated++;
  }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log(`Updated ${updated} names in billionaires.json`);
