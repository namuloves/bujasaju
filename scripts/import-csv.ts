import * as fs from 'fs';

const csv = fs.readFileSync('/Users/namu_1/sajubuja/scripts/billionaires-raw.csv', 'utf8');
const lines = csv.split('\n');
const header = lines[0].replace(/^\uFEFF/, '').split(',');

// Find column indices
const idx = (name: string) => header.indexOf(name);
const RANK = idx('rank');
const WORTH = idx('finalWorth');
const NAME = idx('personName');
const COUNTRY = idx('countryOfCitizenship');
const CITY = idx('city');
const SOURCE = idx('source');
const INDUSTRY = idx('industries');
const GENDER = idx('gender');
const BIRTH_YEAR = idx('birthYear');
const BIRTH_MONTH = idx('birthMonth');
const BIRTH_DAY = idx('birthDay');
const ORG = idx('organization');

console.log('Columns:', header.join(', '));
console.log('Indices:', { RANK, WORTH, NAME, COUNTRY, SOURCE, INDUSTRY, GENDER, BIRTH_YEAR, BIRTH_MONTH, BIRTH_DAY, ORG });

// Country code mapping
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

// Parse CSV (handle commas in quoted fields)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
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

const entries: Entry[] = [];
const seenNames = new Set<string>();

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = parseCSVLine(line);
  const name = cols[NAME]?.replace(/\s*&\s*family$/i, '').trim();
  if (!name || seenNames.has(name)) continue;

  const birthYear = parseInt(cols[BIRTH_YEAR]);
  const birthMonth = parseInt(cols[BIRTH_MONTH]);
  const birthDay = parseInt(cols[BIRTH_DAY]);

  // Skip if no valid birthday
  if (!birthYear || birthYear < 1900 || !birthMonth || !birthDay) continue;
  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) continue;

  const birthday = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  const netWorth = parseFloat(cols[WORTH]) / 1000; // Convert millions to billions
  const country = cols[COUNTRY] || '';
  const nationality = getCountryCode(country);
  const industry = cols[INDUSTRY] || '';
  const gender = cols[GENDER] === 'F' ? 'F' : 'M';
  const source = cols[SOURCE] || cols[ORG] || industry;

  const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&bold=true`;

  seenNames.add(name);
  entries.push({
    id: String(entries.length + 1),
    name,
    birthday,
    netWorth: Math.round(netWorth * 10) / 10,
    nationality,
    industry,
    gender,
    source,
    photoUrl,
  });
}

// Sort by net worth
entries.sort((a, b) => b.netWorth - a.netWorth);

// Re-assign IDs after sort
entries.forEach((e, i) => { e.id = String(i + 1); });

console.log(`Parsed ${entries.length} billionaires with valid birthdays`);
console.log(`Top 5: ${entries.slice(0, 5).map(e => `${e.name} ($${e.netWorth}B)`).join(', ')}`);
console.log(`Bottom 5: ${entries.slice(-5).map(e => `${e.name} ($${e.netWorth}B)`).join(', ')}`);

// Write out
const tsLines = entries.map((e) =>
  `  { id: '${e.id}', name: '${e.name.replace(/'/g, "\\'")}', birthday: '${e.birthday}', netWorth: ${e.netWorth}, nationality: '${e.nationality}', industry: '${e.industry.replace(/'/g, "\\'")}', gender: '${e.gender}', source: '${e.source.replace(/'/g, "\\'")}', photoUrl: '${e.photoUrl.replace(/'/g, "\\'")}' },`
);

const output = `import { Person } from '../saju/types';

export const billionaires: Person[] = [
${tsLines.join('\n')}
];
`;

fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', output);
console.log('Written to billionaires.ts');
