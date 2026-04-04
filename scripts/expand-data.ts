import * as fs from 'fs';

// ─── Load existing curated billionaires ───
const existingFile = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');
// Extract names from existing data to avoid duplicates
const existingNames = new Set<string>();
const nameRegex = /name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/g;
let match;
while ((match = nameRegex.exec(existingFile)) !== null) {
  existingNames.add(match[1].replace(/\\'/g, "'").toLowerCase().trim());
}
console.log(`Existing curated entries: ${existingNames.size}`);

// ─── Parse raw CSV ───
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
const idx = (name: string) => header.indexOf(name);
const RANK = idx('rank');
const WORTH = idx('finalWorth');
const NAME = idx('personName');
const COUNTRY = idx('countryOfCitizenship');
const SOURCE = idx('source');
const INDUSTRY = idx('industries');
const GENDER = idx('gender');
const BIRTH_YEAR = idx('birthYear');
const BIRTH_MONTH = idx('birthMonth');
const BIRTH_DAY = idx('birthDay');
const ORG = idx('organization');

const COUNTRY_TO_CODE: Record<string, string> = {
  'United States': 'US', 'China': 'CN', 'India': 'IN', 'Germany': 'DE', 'Russia': 'RU',
  'France': 'FR', 'Brazil': 'BR', 'Canada': 'CA', 'Italy': 'IT', 'United Kingdom': 'GB',
  'Hong Kong': 'HK', 'Taiwan': 'TW', 'Japan': 'JP', 'South Korea': 'KR', 'Mexico': 'MX',
  'Australia': 'AU', 'Singapore': 'SG', 'Spain': 'ES', 'Israel': 'IL', 'Sweden': 'SE',
  'Netherlands': 'NL', 'Switzerland': 'CH', 'Thailand': 'TH', 'Philippines': 'PH',
  'Indonesia': 'ID', 'Malaysia': 'MY', 'South Africa': 'ZA', 'Nigeria': 'NG', 'Egypt': 'EG',
  'Saudi Arabia': 'SA', 'United Arab Emirates': 'AE', 'Austria': 'AT', 'Denmark': 'DK',
  'Chile': 'CL', 'Colombia': 'CO', 'New Zealand': 'NZ', 'Ireland': 'IE', 'Ukraine': 'UA',
  'Czech Republic': 'CZ', 'Georgia': 'GE', 'Lebanon': 'LB', 'Pakistan': 'PK',
  'Portugal': 'PT', 'Argentina': 'AR', 'Turkey': 'TR', 'Poland': 'PL', 'Norway': 'NO',
  'Finland': 'FI', 'Belgium': 'BE', 'Greece': 'GR', 'Peru': 'PE', 'Venezuela': 'VE',
  'Vietnam': 'VN', 'Kazakhstan': 'KZ', 'Nepal': 'NP', 'Morocco': 'MA', 'Algeria': 'DZ',
  'Tanzania': 'TZ', 'Romania': 'RO', 'Eswatini': 'SZ', 'Zimbabwe': 'ZW', 'Oman': 'OM',
  'Kuwait': 'KW', 'Qatar': 'QA', 'Bahrain': 'BH', 'Cyprus': 'CY', 'Monaco': 'MC',
  'Liechtenstein': 'LI', 'Barbados': 'BB', 'Belize': 'BZ', 'Bulgaria': 'BG', 'Hungary': 'HU',
  'Guernsey': 'GG', 'Macau': 'MO', 'Bermuda': 'BM', 'Slovakia': 'SK', 'Slovenia': 'SI',
  'Latvia': 'LV', 'Lithuania': 'LT', 'Estonia': 'EE', 'Iceland': 'IS', 'Luxembourg': 'LU',
  'Malta': 'MT', 'Uruguay': 'UY', 'Panama': 'PA', 'Costa Rica': 'CR', 'Dominican Republic': 'DO',
  'Guatemala': 'GT', 'Ecuador': 'EC', 'Sri Lanka': 'LK', 'Myanmar': 'MM', 'Cambodia': 'KH',
  'Bangladesh': 'BD', 'Uzbekistan': 'UZ', 'Turkmenistan': 'TM',
};

function getCountryCode(country: string): string {
  return COUNTRY_TO_CODE[country] || country.substring(0, 2).toUpperCase();
}

interface Entry {
  id: string;
  name: string;
  birthday: string;
  netWorth: number;
  nationality: string;
  industry: string;
  gender: string;
  source: string;
  photoUrl: string;
}

const newEntries: Entry[] = [];
const seenNames = new Set<string>();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = parseCSVLine(line);
  const rawName = cols[NAME]?.replace(/\s*&\s*family$/i, '').trim();
  if (!rawName) continue;

  const nameLower = rawName.toLowerCase().trim();
  if (seenNames.has(nameLower)) continue;
  seenNames.add(nameLower);

  // Skip if already in curated data
  if (existingNames.has(nameLower)) continue;

  const birthYear = parseInt(cols[BIRTH_YEAR]);
  const birthMonth = parseInt(cols[BIRTH_MONTH]);
  const birthDay = parseInt(cols[BIRTH_DAY]);

  if (!birthYear || birthYear < 1900 || !birthMonth || !birthDay) continue;
  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) continue;

  const birthday = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  const netWorth = parseFloat(cols[WORTH]) / 1000;
  const country = cols[COUNTRY] || '';
  const nationality = getCountryCode(country);
  const industry = cols[INDUSTRY] || '';
  const gender = cols[GENDER] === 'F' ? 'F' : 'M';
  const source = cols[SOURCE] || cols[ORG] || industry;
  const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(rawName)}&size=200&background=random&bold=true`;

  newEntries.push({
    id: '', // will be reassigned
    name: rawName,
    birthday,
    netWorth: Math.round(netWorth * 10) / 10,
    nationality,
    industry,
    gender,
    source,
    photoUrl,
  });
}

console.log(`New entries to add: ${newEntries.length}`);

// Generate TS array entries for the new people
const newTsLines = newEntries.map((e) =>
  `  { id: '0', name: '${e.name.replace(/'/g, "\\'")}', birthday: '${e.birthday}', netWorth: ${e.netWorth}, nationality: '${e.nationality}', industry: '${e.industry.replace(/'/g, "\\'")}', gender: '${e.gender}', source: '${e.source.replace(/'/g, "\\'")}', photoUrl: '${e.photoUrl.replace(/'/g, "\\'")}' },`
);

// Read existing file and append new entries before the closing bracket
const closingIndex = existingFile.lastIndexOf('];');
const updatedFile = existingFile.substring(0, closingIndex) + newTsLines.join('\n') + '\n];\n';

fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', updatedFile);
console.log(`Total entries now: ${existingNames.size + newEntries.length}`);
console.log('Written to billionaires.ts');
