import * as fs from 'fs';

// ─── Country code map (copied from expand-data.ts) ───
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
  if (!country) return '';
  return COUNTRY_TO_CODE[country] || country.substring(0, 2).toUpperCase();
}

interface Entry {
  id: string;
  name: string;
  nameKo?: string;
  birthday: string;
  netWorth: number;
  nationality: string;
  industry: string;
  gender: string;
  source: string;
  photoUrl: string;
}

function stripFamily(name: string): string {
  return name.replace(/\s*&\s*family$/i, '').trim();
}

// ─── Extract existing nameKo mappings ───
const existingFile = fs.readFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', 'utf8');
const nameKoMap = new Map<string, string>();

// Parse each entry line — match name and nameKo if present
const entryRegex = /\{\s*id:[^}]*?name:\s*'((?:[^'\\]|\\.)*)'[^}]*?\}/g;
let m;
let parsedExisting = 0;
while ((m = entryRegex.exec(existingFile)) !== null) {
  parsedExisting++;
  const block = m[0];
  const name = m[1].replace(/\\'/g, "'");
  const koMatch = block.match(/nameKo:\s*'((?:[^'\\]|\\.)*)'/);
  if (koMatch) {
    const ko = koMatch[1].replace(/\\'/g, "'");
    nameKoMap.set(stripFamily(name), ko);
  }
}
console.log(`Parsed ${parsedExisting} existing entries, ${nameKoMap.size} have nameKo`);

// ─── Read Forbes data ───
const raw = fs.readFileSync('/tmp/forbes-billionaires.json', 'utf8');
const data = JSON.parse(raw);
const persons: any[] = data.personList.personsLists;
console.log(`Forbes entries: ${persons.length}`);

// ─── Build entries ───
const entries: Entry[] = [];
let skippedNoBirthday = 0;
let placeholderPhotos = 0;
let realPhotos = 0;
let preservedKo = 0;

for (const p of persons) {
  const name = stripFamily(p.personName || '');
  if (!name) continue;

  // Birthday — birthDate is ms since epoch (can be negative for pre-1970)
  const bd = p.birthDate;
  if (bd === null || bd === undefined || bd === 0) {
    skippedNoBirthday++;
    continue;
  }
  const date = new Date(Number(bd));
  if (isNaN(date.getTime())) {
    skippedNoBirthday++;
    continue;
  }
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) {
    skippedNoBirthday++;
    continue;
  }
  const birthday = `${year}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

  const netWorth = Math.round((Number(p.finalWorth) / 1000) * 10) / 10;
  const nationality = getCountryCode(p.countryOfCitizenship || '');
  const industry = Array.isArray(p.industries) && p.industries.length > 0 ? p.industries[0] : '';
  const gender = p.gender === 'F' ? 'F' : 'M';
  const source = p.source || '';

  let photoUrl: string;
  if (p.squareImage && typeof p.squareImage === 'string' && p.squareImage.trim() !== '') {
    photoUrl = p.squareImage;
    realPhotos++;
  } else {
    photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name).replace(/%20/g, '+')}&size=200&background=random&bold=true`;
    placeholderPhotos++;
  }

  const ko = nameKoMap.get(name);
  if (ko) preservedKo++;

  entries.push({
    id: '',
    name,
    ...(ko ? { nameKo: ko } : {}),
    birthday,
    netWorth,
    nationality,
    industry,
    gender,
    source,
    photoUrl,
  });
}

// Sort by netWorth descending
entries.sort((a, b) => b.netWorth - a.netWorth);

// Reassign sequential ids
entries.forEach((e, i) => { e.id = String(i + 1); });

console.log(`Built ${entries.length} entries (skipped ${skippedNoBirthday} for missing/invalid birthday)`);
console.log(`  - nameKo preserved: ${preservedKo}`);
console.log(`  - real photos: ${realPhotos}`);
console.log(`  - placeholder photos: ${placeholderPhotos}`);

// ─── Serialize ───
function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const lines: string[] = [];
lines.push("import { Person } from '../saju/types';");
lines.push('');
lines.push('export const billionaires: Person[] = [');
for (const e of entries) {
  const parts: string[] = [];
  parts.push(`id: '${e.id}'`);
  parts.push(`name: '${esc(e.name)}'`);
  if (e.nameKo) parts.push(`nameKo: '${esc(e.nameKo)}'`);
  parts.push(`birthday: '${e.birthday}'`);
  parts.push(`netWorth: ${e.netWorth}`);
  parts.push(`nationality: '${esc(e.nationality)}'`);
  parts.push(`industry: '${esc(e.industry)}'`);
  parts.push(`gender: '${e.gender}'`);
  parts.push(`source: '${esc(e.source)}'`);
  parts.push(`photoUrl: '${esc(e.photoUrl)}'`);
  lines.push(`  { ${parts.join(', ')} },`);
}
lines.push('];');
lines.push('');

fs.writeFileSync('/Users/namu_1/sajubuja/src/lib/data/billionaires.ts', lines.join('\n'));
console.log('Wrote billionaires.ts');

// Show top 5
console.log('\nTop 5 by net worth:');
for (let i = 0; i < 5; i++) {
  const e = entries[i];
  console.log(`  ${e.id}. ${e.name} — $${e.netWorth}B (${e.nationality})`);
}
