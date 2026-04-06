import * as fs from 'fs';
import * as https from 'https';

// Wikipedia-only photo fetcher for ui-avatars placeholder entries.
// Strategies (in order):
//   1. English Wikipedia REST API summary
//   2. Multi-language Wikipedia pageimages (lang chosen by nationality)
//   3. English Wikipedia search with name + source company
// Strict validation: rejects logos, flags, buildings, SVGs, wrong-person filenames.

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/photo-progress-wiki.json';

const REQUEST_DELAY_MS = 200;
let lastRequestTime = 0;

async function rateLimitDelay(): Promise<void> {
  const elapsed = Date.now() - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'User-Agent': 'SajubujaBot/1.0 (https://sajubuja.com; photo-fetcher)',
      Accept: 'application/json',
    };
    const req = https.get(url, { headers }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        if (res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          httpsGet(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (c: string) => (data += c));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function rateLimitedGet(url: string): Promise<string> {
  await rateLimitDelay();
  return httpsGet(url);
}

// --- Validation ---

const REJECT_PATTERNS = [
  'logo',
  'wordmark',
  'brand',
  'flag_of',
  'emblem_of',
  'coat_of_arms',
  'seal_of',
  'map_of',
  'headquarters',
  '_hq',
  'replace_this_image',
  'no-pic',
  'no_pic',
  'placeholder',
  'building',
  'tower',
  'plaza',
  'stadium',
  'museum',
  'church',
  'temple',
  'tomb',
];

function isValidPhotoUrl(url: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  const decodedLower = decoded.toLowerCase();
  const urlLower = url.toLowerCase();

  if (urlLower.endsWith('.svg') || decodedLower.endsWith('.svg')) return false;
  if (urlLower.includes('/math/') || urlLower.includes('/special:')) return false;

  for (const pattern of REJECT_PATTERNS) {
    if (decodedLower.includes(pattern)) return false;
  }

  const pathParts = decoded.split('/');
  const filename = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
  if (/\bHQ\b/.test(filename)) return false;

  return true;
}

// Reject if filename contains a clearly different person's name
function filenameMatchesPerson(url: string, personName: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  const pathParts = decoded.split('/');
  const filename = (pathParts[pathParts.length - 1] || '').toLowerCase();

  // Strip extension and size prefix like "400px-"
  const cleaned = filename
    .replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')
    .replace(/^\d+px-/, '');

  // Tokenize filename: split on non-alphanumeric
  const fnTokens = cleaned.split(/[^a-z]+/).filter((t) => t.length >= 3);
  if (fnTokens.length === 0) return true; // can't tell, accept

  const nameTokens = personName
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 3);
  if (nameTokens.length === 0) return true;

  // Filename must contain at least one of the person's name tokens
  const hasNameToken = nameTokens.some((nt) => fnTokens.includes(nt));
  return hasNameToken;
}

// --- Name utilities ---

function generateNameVariations(name: string): string[] {
  const variations = [name];
  const noSuffix = name.replace(/\s+(Jr\.?|Sr\.?|III|II|IV)$/i, '').trim();
  if (noSuffix !== name) variations.push(noSuffix);
  const parts = name.split(' ');
  if (parts.length > 2) {
    variations.push(parts[0] + ' ' + parts[parts.length - 1]);
  }
  return [...new Set(variations)];
}

// --- Person type / progress ---

interface BillionaireEntry {
  id: string;
  name: string;
  nameKo?: string;
  birthday: string;
  nationality: string;
  source: string;
  oldPhotoUrl: string;
}

interface ProgressData {
  found: Record<string, { url: string; lang: string }>;
  attempted: string[];
}

function loadProgress(): ProgressData {
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    }
  } catch {}
  return { found: {}, attempted: [] };
}

function saveProgress(progress: ProgressData): void {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// --- Parse billionaires.ts ---

function parsePlaceholderEntries(fileContent: string): BillionaireEntry[] {
  const entries: BillionaireEntry[] = [];
  const entryRegex =
    /\{[^}]*?id:\s*'([^']+)'[^}]*?name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'[^}]*?photoUrl:\s*'(https:\/\/ui-avatars\.com[^']*)'/g;
  let match;
  while ((match = entryRegex.exec(fileContent)) !== null) {
    const fullMatch = match[0];
    const id = match[1];
    const name = match[2].replace(/\\'/g, "'");
    const oldPhotoUrl = match[3];

    const nameKoMatch = fullMatch.match(/nameKo:\s*'([^']*)'/);
    const birthdayMatch = fullMatch.match(/birthday:\s*'([^']*)'/);
    const nationalityMatch = fullMatch.match(/nationality:\s*'([^']*)'/);
    const sourceMatch = fullMatch.match(/source:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);

    entries.push({
      id,
      name,
      nameKo: nameKoMatch?.[1],
      birthday: birthdayMatch?.[1] || '',
      nationality: nationalityMatch?.[1] || '',
      source: sourceMatch?.[1]?.replace(/\\'/g, "'") || '',
      oldPhotoUrl,
    });
  }
  return entries;
}

// --- Language selection ---

function getWikipediaLangs(nationality: string): string[] {
  const langs: string[] = [];
  const nat = nationality.toUpperCase();
  const nats = nat.split('/');

  for (const n of nats) {
    switch (n) {
      case 'CN':
      case 'TW':
      case 'HK':
        langs.push('zh');
        break;
      case 'JP':
        langs.push('ja');
        break;
      case 'KR':
        langs.push('ko');
        break;
      case 'DE':
      case 'AT':
      case 'CH':
        langs.push('de');
        break;
      case 'FR':
        langs.push('fr');
        break;
      case 'IT':
        langs.push('it');
        break;
      case 'ES':
      case 'MX':
      case 'AR':
      case 'CL':
      case 'CO':
      case 'PE':
      case 'VE':
        langs.push('es');
        break;
      case 'BR':
      case 'PT':
        langs.push('pt');
        break;
      case 'RU':
        langs.push('ru');
        break;
      case 'SE':
      case 'NO':
      case 'DK':
      case 'FI':
        langs.push('sv');
        break;
      case 'NL':
      case 'BE':
        langs.push('nl');
        break;
      case 'TH':
        langs.push('th');
        break;
      case 'ID':
        langs.push('id');
        break;
      case 'TR':
        langs.push('tr');
        break;
      case 'PL':
        langs.push('pl');
        break;
      case 'CZ':
        langs.push('cs');
        break;
      case 'IL':
        langs.push('he');
        break;
      case 'GR':
        langs.push('el');
        break;
      case 'UA':
        langs.push('uk');
        break;
      case 'VN':
        langs.push('vi');
        break;
      case 'IN':
        langs.push('hi');
        break;
    }
  }
  return [...new Set(langs)];
}

const PERSON_DESCRIPTION_TERMS = [
  'businessman',
  'businesswoman',
  'billionaire',
  'entrepreneur',
  'investor',
  'founder',
  'executive',
  'ceo',
  'chairman',
  'chairwoman',
  'philanthropist',
  'industrialist',
  'magnate',
  'tycoon',
  'business',
  'banker',
  'financier',
  'engineer',
  'developer',
  'heiress',
  'heir',
  'born',
];

function titleMatchesName(title: string, name: string): boolean {
  const titleLower = title.toLowerCase();
  const nameLower = name.toLowerCase();
  const nameParts = nameLower.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];

  if (titleLower.includes(nameLower)) return true;
  if (lastName.length > 2 && titleLower.includes(lastName)) return true;
  if (firstName.length > 3 && titleLower.includes(firstName)) return true;
  return false;
}

// --- Strategy 1: English Wikipedia REST API summary ---

async function strategy1_enRest(
  person: BillionaireEntry,
): Promise<{ url: string; lang: string } | null> {
  const variations = generateNameVariations(person.name);

  for (const nameVar of variations) {
    try {
      const encoded = encodeURIComponent(nameVar.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);

      if (!titleMatchesName(data.title || '', person.name)) continue;

      const descAndExtract = ((data.description || '') + ' ' + (data.extract || '')).toLowerCase();
      const isPerson = PERSON_DESCRIPTION_TERMS.some((term) => descAndExtract.includes(term));
      if (!isPerson) continue;

      const candidates = [data.thumbnail?.source, data.originalimage?.source].filter(
        Boolean,
      ) as string[];
      for (const cand of candidates) {
        if (isValidPhotoUrl(cand) && filenameMatchesPerson(cand, person.name)) {
          return { url: cand, lang: 'en' };
        }
      }
    } catch {}
  }
  return null;
}

// --- Strategy 2: Multi-lang Wikipedia pageimages ---

async function strategy2_multiLang(
  person: BillionaireEntry,
): Promise<{ url: string; lang: string } | null> {
  const langs = getWikipediaLangs(person.nationality);
  if (langs.length === 0) return null;

  for (const lang of langs) {
    let searchName = person.name;
    if (lang === 'ko' && person.nameKo) searchName = person.nameKo;

    // Try direct title lookup
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchName)}&prop=pageimages&pithumbsize=400&format=json&redirects=1`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);
      const pages = data.query?.pages;
      if (pages) {
        for (const page of Object.values(pages) as any[]) {
          if (page.pageid && page.pageid > 0 && page.thumbnail?.source) {
            if (isValidPhotoUrl(page.thumbnail.source)) {
              // For non-Latin scripts, can't validate filename against English name reliably
              const isLatin = /^[a-z]+$/i.test(lang) && ['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'sv', 'pl', 'cs', 'tr', 'id'].includes(lang);
              if (!isLatin || filenameMatchesPerson(page.thumbnail.source, person.name)) {
                return { url: page.thumbnail.source, lang };
              }
            }
          }
        }
      }
    } catch {}

    // Search-based lookup
    try {
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchName)}&gsrlimit=5&prop=pageimages|description&pithumbsize=400&format=json`;
      const resp = await rateLimitedGet(searchUrl);
      const data = JSON.parse(resp);
      const pages = data.query?.pages;
      if (pages) {
        const lastName = person.name.split(' ').pop()?.toLowerCase() || '';
        for (const page of Object.values(pages) as any[]) {
          if (page.thumbnail?.source) {
            const title = (page.title || '').toLowerCase();
            const desc = (page.description || '').toLowerCase();
            // For Latin-script langs, require last name in title
            const isLatin = ['en', 'de', 'fr', 'it', 'es', 'pt', 'nl', 'sv', 'pl', 'cs', 'tr', 'id'].includes(lang);
            const titleOk = !isLatin || (lastName.length > 2 && title.includes(lastName));
            if (titleOk) {
              if (
                !desc.includes('company') &&
                !desc.includes('corporation') &&
                !desc.includes('building') &&
                !desc.includes('city') &&
                !desc.includes('district') &&
                !desc.includes('river')
              ) {
                if (isValidPhotoUrl(page.thumbnail.source)) {
                  if (!isLatin || filenameMatchesPerson(page.thumbnail.source, person.name)) {
                    return { url: page.thumbnail.source, lang };
                  }
                }
              }
            }
          }
        }
      }
    } catch {}
  }
  return null;
}

// --- Strategy 3: English Wikipedia search with name + source ---

async function strategy3_enSearchWithSource(
  person: BillionaireEntry,
): Promise<{ url: string; lang: string } | null> {
  if (!person.source) return null;
  const query = `${person.name} ${person.source}`;

  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages|description&pithumbsize=400&format=json`;
    const resp = await rateLimitedGet(searchUrl);
    const data = JSON.parse(resp);
    const pages = data.query?.pages;
    if (!pages) return null;

    const lastName = person.name.split(' ').pop()?.toLowerCase() || '';
    for (const page of Object.values(pages) as any[]) {
      if (!page.thumbnail?.source) continue;
      const title = (page.title || '').toLowerCase();
      const desc = (page.description || '').toLowerCase();
      if (lastName.length <= 2 || !title.includes(lastName)) continue;
      if (
        desc.includes('company') ||
        desc.includes('corporation') ||
        desc.includes('building') ||
        desc.includes('city') ||
        desc.includes('district') ||
        desc.includes('river')
      )
        continue;
      const isPerson =
        !desc ||
        PERSON_DESCRIPTION_TERMS.some((term) => desc.includes(term)) ||
        true; // search results often lack description; allow if title matches
      if (!isPerson) continue;
      if (
        isValidPhotoUrl(page.thumbnail.source) &&
        filenameMatchesPerson(page.thumbnail.source, person.name)
      ) {
        return { url: page.thumbnail.source, lang: 'en-search' };
      }
    }
  } catch {}
  return null;
}

// --- Orchestration ---

async function findPhoto(
  person: BillionaireEntry,
): Promise<{ url: string; lang: string } | null> {
  try {
    const r = await strategy1_enRest(person);
    if (r) return r;
  } catch {}
  try {
    const r = await strategy2_multiLang(person);
    if (r) return r;
  } catch {}
  try {
    const r = await strategy3_enSearchWithSource(person);
    if (r) return r;
  } catch {}
  return null;
}

async function main() {
  console.log('=== Wikipedia Photo Fetcher (placeholders only) ===\n');

  const fileContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const entries = parsePlaceholderEntries(fileContent);
  console.log(`Found ${entries.length} placeholder entries\n`);

  const progress = loadProgress();
  const attemptedSet = new Set(progress.attempted);
  const remaining = entries.filter((e) => !attemptedSet.has(e.name));
  console.log(`Already attempted: ${progress.attempted.length}`);
  console.log(`Already found: ${Object.keys(progress.found).length}`);
  console.log(`Remaining: ${remaining.length}\n`);

  const langStats: Record<string, number> = {};
  let foundThisRun = 0;

  for (let i = 0; i < remaining.length; i++) {
    const person = remaining[i];
    const idx = i + 1;

    try {
      console.log(
        `[${idx}/${remaining.length}] ${person.name} (${person.nationality})...`,
      );
      const result = await findPhoto(person);
      progress.attempted.push(person.name);

      if (result) {
        progress.found[person.name] = result;
        langStats[result.lang] = (langStats[result.lang] || 0) + 1;
        foundThisRun++;
        console.log(`  -> FOUND via ${result.lang}`);
      } else {
        console.log(`  -> not found`);
      }
    } catch (err) {
      progress.attempted.push(person.name);
      console.log(`  -> ERROR: ${err}`);
    }

    if (idx % 10 === 0 || idx === remaining.length) {
      saveProgress(progress);
      console.log(
        `  [Saved: ${Object.keys(progress.found).length} found / ${progress.attempted.length} attempted]`,
      );
    }
  }

  saveProgress(progress);

  // Rewrite billionaires.ts
  console.log('\n=== Rewriting billionaires.ts ===\n');
  let updatedContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  let replacedCount = 0;

  const allEntries = parsePlaceholderEntries(updatedContent);
  const entryByName = new Map(allEntries.map((e) => [e.name, e]));

  for (const [name, info] of Object.entries(progress.found)) {
    const entry = entryByName.get(name);
    if (entry && updatedContent.includes(entry.oldPhotoUrl)) {
      const safeNewUrl = info.url.replace(/'/g, '%27');
      updatedContent = updatedContent.replace(entry.oldPhotoUrl, safeNewUrl);
      replacedCount++;
    }
  }

  fs.writeFileSync(BILLIONAIRES_PATH, updatedContent);
  console.log(`Replaced ${replacedCount} photo URLs`);

  const finalContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const finalPlaceholders = (finalContent.match(/ui-avatars\.com/g) || []).length;

  const totalFound = Object.keys(progress.found).length;
  console.log('\n=== Summary ===');
  console.log(`Total placeholders at start: ${entries.length}`);
  console.log(`Total found (cumulative):     ${totalFound}`);
  console.log(`Found this run:               ${foundThisRun}`);
  console.log(`Final placeholder count:      ${finalPlaceholders}`);
  console.log('\nBy language (this run):');
  for (const [lang, count] of Object.entries(langStats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang.padEnd(12)} ${count}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
