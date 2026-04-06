import * as fs from 'fs';

// Use the Forbes 2023 CSV as authoritative source for selfMade field
const csv = fs.readFileSync('/Users/namu_1/sajubuja/scripts/billionaires-raw.csv', 'utf8');
const lines = csv.split('\n');

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

const header = parseCSVLine(lines[0].replace(/^\uFEFF/, ''));
const NAME_IDX = header.indexOf('personName');
const SELF_MADE_IDX = header.indexOf('selfMade');

// Build name -> selfMade map
const csvSelfMade = new Map<string, boolean>();
for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const name = cols[NAME_IDX]?.replace(/\s*&\s*family$/i, '').trim();
  const sm = cols[SELF_MADE_IDX];
  if (name && sm) {
    csvSelfMade.set(name.toLowerCase(), sm === 'TRUE');
  }
}
console.log(`Loaded ${csvSelfMade.size} selfMade values from CSV`);

// Manual overrides for known inherited heirs not in CSV (or wrong in CSV)
// Korean chaebol heirs especially
const MANUAL_INHERITED = new Set([
  'jay y. lee', 'lee jae-yong',
  'lee boo-jin', 'lee seo-hyun', 'hong ra-hee',
  'koo kwang-mo', 'koo bon-neung', 'koo bon-sik',
  'chung mong-koo', 'mong-koo chung', 'euisun chung', 'chung euisun',
  'chey tae-won',
  'shin dong-bin',
  'cho hyun-joon',
  'kim seung-youn', 'kim dong-kwan',
  'lee jay-hyun',
  'huh tae-soo',
]);

// Read billionaires.ts
const billionairesPath = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
let content = fs.readFileSync(billionairesPath, 'utf8');

// Match each entry's name + wealthOrigin
const entryRegex = /(\{ id: '[^']+', name: ')([^'\\]*(?:\\.[^'\\]*)*)('[^}]*?wealthOrigin: ')([^']+)(' \})/g;

let updated = 0;
let toInherited = 0;
let toSelfMade = 0;
let toMixed = 0;

content = content.replace(entryRegex, (match, p1, name, p3, oldOrigin, p5) => {
  const cleanName = name.replace(/\\'/g, "'").toLowerCase();
  let newOrigin: string | null = null;

  if (MANUAL_INHERITED.has(cleanName)) {
    newOrigin = 'inherited';
  } else if (csvSelfMade.has(cleanName)) {
    newOrigin = csvSelfMade.get(cleanName) ? 'self-made' : 'inherited';
  }

  if (newOrigin && newOrigin !== oldOrigin) {
    updated++;
    if (newOrigin === 'inherited') toInherited++;
    else if (newOrigin === 'self-made') toSelfMade++;
    else toMixed++;
    return p1 + name + p3 + newOrigin + p5;
  }
  return match;
});

fs.writeFileSync(billionairesPath, content);
console.log(`Updated ${updated} entries`);
console.log(`  -> inherited: ${toInherited}`);
console.log(`  -> self-made: ${toSelfMade}`);
console.log(`  -> mixed: ${toMixed}`);
