import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

// Careful photo-fetching script with strict validation
// Rejects logos, flags, buildings, maps, SVGs, and other non-portrait images

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/photo-progress-v2.json';

// Rate limiting configuration (ms between requests to same domain)
const RATE_LIMITS: Record<string, number> = {
  'www.wikidata.org': 1500,
  'query.wikidata.org': 1500,
  'en.wikipedia.org': 200,
  'ko.wikipedia.org': 200,
  'zh.wikipedia.org': 200,
  'ja.wikipedia.org': 200,
  'de.wikipedia.org': 200,
  'fr.wikipedia.org': 200,
  'it.wikipedia.org': 200,
  'es.wikipedia.org': 200,
  'pt.wikipedia.org': 200,
  'ru.wikipedia.org': 200,
  'sv.wikipedia.org': 200,
  'nl.wikipedia.org': 200,
  'th.wikipedia.org': 200,
  'id.wikipedia.org': 200,
  'tr.wikipedia.org': 200,
  'www.forbes.com': 1000,
};

const lastRequestTime: Record<string, number> = {};

async function rateLimitDelay(domain: string): Promise<void> {
  const delay = RATE_LIMITS[domain] || 200;
  const last = lastRequestTime[domain] || 0;
  const elapsed = Date.now() - last;
  if (elapsed < delay) {
    await new Promise(r => setTimeout(r, delay - elapsed));
  }
  lastRequestTime[domain] = Date.now();
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function httpsGet(url: string, acceptHtml = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const headers: Record<string, string> = {
      'User-Agent': 'SajubujaBot/1.0 (https://sajubuja.com; photo-fetcher)',
    };
    headers['Accept'] = acceptHtml
      ? 'text/html,application/xhtml+xml'
      : 'application/json';

    const req = protocol.get(url, { headers }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        if (res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          httpsGet(redirectUrl, acceptHtml).then(resolve).catch(reject);
          return;
        }
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk: string) => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function rateLimitedGet(url: string, acceptHtml = false): Promise<string> {
  const domain = getDomain(url);
  if (domain) await rateLimitDelay(domain);
  return httpsGet(url, acceptHtml);
}

// --- Photo URL validation ---

function isValidPhotoUrl(url: string): boolean {
  // Decode the URL path for filename checking
  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    decoded = url;
  }
  const decodedLower = decoded.toLowerCase();
  const urlLower = url.toLowerCase();

  // Reject SVG extension
  if (urlLower.endsWith('.svg') || decodedLower.endsWith('.svg')) {
    return false;
  }

  // Reject Wikipedia special pages
  if (urlLower.includes('/math/') || urlLower.includes('/special:')) {
    return false;
  }

  // Reject patterns (case-insensitive on decoded URL)
  const rejectPatterns = [
    'logo', '_ci', 'wordmark', 'brand',
    'flag_of', 'emblem_of',
    'coat_of_arms', 'seal_of',
    'map_of',
    'headquarters', '_hq',
    'replace_this_image', 'no-pic', 'no_pic', 'placeholder',
    'building', 'tower', 'plaza', 'stadium', 'museum', 'church', 'temple', 'tomb',
    'company', 'corporation', 'group_logo',
  ];

  for (const pattern of rejectPatterns) {
    if (decodedLower.includes(pattern)) {
      return false;
    }
  }

  // Also check for "HQ" as a standalone word in the filename part
  const pathParts = decoded.split('/');
  const filename = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
  if (/\bHQ\b/.test(filename)) {
    return false;
  }

  return true;
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

// --- MD5 thumbnail URL construction ---

function commonsThumbUrl(filename: string): string {
  const normalized = filename.replace(/ /g, '_');
  const md5 = crypto.createHash('md5').update(normalized).digest('hex');
  const a = md5[0];
  const ab = md5[0] + md5[1];
  const encodedFilename = encodeURIComponent(normalized);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${encodedFilename}/400px-${encodedFilename}`;
}

// --- Person type ---

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
  found: Record<string, string>;
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
  const entryRegex = /\{[^}]*?id:\s*'([^']+)'[^}]*?name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'[^}]*?photoUrl:\s*'(https:\/\/ui-avatars\.com[^']*)'/g;
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

// ============================
// Strategy 1: Wikidata wbsearchentities with STRICT birthday verification
// ============================

async function strategy1_wikidata(person: BillionaireEntry): Promise<string | null> {
  const variations = generateNameVariations(person.name);

  for (const nameVar of variations) {
    try {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(nameVar)}&language=en&format=json&limit=10&type=item`;
      const searchResponse = await rateLimitedGet(searchUrl);
      const searchData = JSON.parse(searchResponse);

      if (!searchData.search?.length) continue;

      for (const result of searchData.search) {
        const qid = result.id;
        try {
          const claimsUrl = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${qid}&format=json`;
          const claimsResponse = await rateLimitedGet(claimsUrl);
          const claimsData = JSON.parse(claimsResponse);
          const claims = claimsData.claims;

          // Verify P31 = Q5 (human)
          const p31 = claims?.P31;
          if (!p31) continue;
          const isHuman = p31.some((c: any) =>
            c.mainsnak?.datavalue?.value?.id === 'Q5'
          );
          if (!isHuman) continue;

          // STRICT birthday verification
          if (person.birthday) {
            const p569 = claims?.P569;
            if (p569 && p569.length > 0) {
              const wdBirthday = p569[0]?.mainsnak?.datavalue?.value?.time;
              if (wdBirthday) {
                const wdDate = wdBirthday.replace(/^\+/, '').split('T')[0];
                if (wdDate !== person.birthday) continue;
              } else {
                continue; // No parseable birthday, skip
              }
            } else {
              continue; // No birthday claim, skip
            }
          }

          // Check P18 (image)
          const p18 = claims?.P18;
          if (p18 && p18.length > 0) {
            const filename = p18[0].mainsnak?.datavalue?.value;
            if (filename) {
              const thumbUrl = commonsThumbUrl(filename);
              if (isValidPhotoUrl(thumbUrl)) {
                return thumbUrl;
              }
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ============================
// Strategy 2: Forbes profile og:image
// ============================

function generateForbesSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function strategy2_forbes(person: BillionaireEntry): Promise<string | null> {
  const variations = generateNameVariations(person.name);

  for (const nameVar of variations) {
    const slug = generateForbesSlug(nameVar);
    if (!slug) continue;

    try {
      const url = `https://www.forbes.com/profile/${slug}/`;
      const html = await rateLimitedGet(url, true);

      const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
        || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
      if (ogMatch && ogMatch[1]) {
        const imageUrl = ogMatch[1];
        // Reject generic Forbes "no-pic" images
        if (imageUrl.includes('no-pic') || imageUrl.includes('no_pic')) continue;
        // Accept imageio.forbes.com URLs
        if (imageUrl.includes('imageio.forbes.com') || imageUrl.includes('specials-images') || imageUrl.includes('imageserve')) {
          return imageUrl;
        }
        // Accept non-trivial image URLs from forbes
        if (imageUrl.includes('forbes') && !imageUrl.includes('default') && !imageUrl.includes('logo')) {
          return imageUrl;
        }
      }
    } catch {
      // Forbes might 404 or block
    }
  }
  return null;
}

// ============================
// Strategy 3: Wikipedia pageimages with title match validation
// ============================

function getWikipediaLangs(nationality: string, nameKo?: string): string[] {
  const langs: string[] = [];
  const nat = nationality.toUpperCase();
  const nats = nat.split('/');

  for (const n of nats) {
    switch (n) {
      case 'CN': case 'TW': case 'HK': langs.push('zh'); break;
      case 'JP': langs.push('ja'); break;
      case 'KR': langs.push('ko'); break;
      case 'DE': case 'AT': case 'CH': langs.push('de'); break;
      case 'FR': langs.push('fr'); break;
      case 'IT': langs.push('it'); break;
      case 'ES': case 'MX': case 'AR': case 'CL': case 'CO': langs.push('es'); break;
      case 'BR': langs.push('pt'); break;
      case 'RU': langs.push('ru'); break;
      case 'SE': case 'NO': case 'DK': case 'FI': langs.push('sv'); break;
      case 'NL': case 'BE': langs.push('nl'); break;
      case 'TH': langs.push('th'); break;
      case 'ID': langs.push('id'); break;
      case 'TR': langs.push('tr'); break;
    }
  }

  if (!langs.includes('en')) langs.push('en');
  return [...new Set(langs)];
}

function titleMatchesName(title: string, name: string): boolean {
  const titleLower = title.toLowerCase();
  const nameLower = name.toLowerCase();
  const nameParts = nameLower.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];

  // Title contains the full name
  if (titleLower.includes(nameLower)) return true;
  // Title contains last name
  if (lastName.length > 2 && titleLower.includes(lastName)) return true;
  // Title contains first name (only for longer first names to avoid false positives)
  if (firstName.length > 3 && titleLower.includes(firstName)) return true;

  return false;
}

async function strategy3_wikipedia(person: BillionaireEntry): Promise<string | null> {
  const langs = getWikipediaLangs(person.nationality, person.nameKo);

  for (const lang of langs) {
    let searchName = person.name;
    if (lang === 'ko' && person.nameKo) {
      searchName = person.nameKo;
    }

    // Try 1: Direct title lookup - only accept if page title matches
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchName)}&prop=pageimages&pithumbsize=400&format=json&redirects=1`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);
      const pages = data.query?.pages;
      if (pages) {
        for (const page of Object.values(pages) as any[]) {
          if (page.pageid && page.pageid > 0 && page.thumbnail?.source) {
            if (titleMatchesName(page.title, person.name) && isValidPhotoUrl(page.thumbnail.source)) {
              return page.thumbnail.source;
            }
          }
        }
      }
    } catch {}

    // Try 2: Search with name - only accept if a top result title contains last name
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
            // Title must contain last name
            if (lastName.length > 2 && title.includes(lastName)) {
              // Must not be a company/place page
              if (!desc.includes('company') && !desc.includes('corporation') &&
                  !desc.includes('building') && !desc.includes('city') &&
                  !desc.includes('district') && !desc.includes('river')) {
                if (isValidPhotoUrl(page.thumbnail.source)) {
                  return page.thumbnail.source;
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

// ============================
// Strategy 4: English Wikipedia REST API with person validation
// ============================

const PERSON_DESCRIPTION_TERMS = [
  'businessman', 'businesswoman', 'billionaire', 'entrepreneur',
  'investor', 'founder', 'executive', 'ceo', 'chairman', 'chairwoman',
  'philanthropist', 'industrialist', 'magnate', 'tycoon',
  'business', 'banker', 'financier', 'engineer', 'developer',
  'heiress', 'heir', 'socialite', 'politician', 'born',
];

async function strategy4_wikiRest(person: BillionaireEntry): Promise<string | null> {
  const variations = generateNameVariations(person.name);

  for (const nameVar of variations) {
    try {
      const encoded = encodeURIComponent(nameVar.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);

      // Verify the page title matches the person's name
      if (!titleMatchesName(data.title || '', person.name)) continue;

      // Verify the description/extract mentions person-related terms
      const descAndExtract = ((data.description || '') + ' ' + (data.extract || '')).toLowerCase();
      const isPerson = PERSON_DESCRIPTION_TERMS.some(term => descAndExtract.includes(term));
      if (!isPerson) continue;

      if (data.thumbnail?.source && isValidPhotoUrl(data.thumbnail.source)) {
        return data.thumbnail.source;
      }
      if (data.originalimage?.source && isValidPhotoUrl(data.originalimage.source)) {
        return data.originalimage.source;
      }
    } catch {}
  }

  return null;
}

// ============================
// Main orchestration
// ============================

async function findPhoto(person: BillionaireEntry): Promise<{ url: string | null; strategy: string }> {
  // Strategy 1: Wikidata with strict birthday verification (most reliable)
  try {
    const url = await strategy1_wikidata(person);
    if (url) return { url, strategy: 'wikidata' };
  } catch {}

  // Strategy 2: Forbes profile og:image
  try {
    const url = await strategy2_forbes(person);
    if (url) return { url, strategy: 'forbes' };
  } catch {}

  // Strategy 3: Wikipedia pageimages with title match validation
  try {
    const url = await strategy3_wikipedia(person);
    if (url) return { url, strategy: 'wikipedia' };
  } catch {}

  // Strategy 4: English Wikipedia REST API with description validation
  try {
    const url = await strategy4_wikiRest(person);
    if (url) return { url, strategy: 'wiki-rest' };
  } catch {}

  return { url: null, strategy: 'none' };
}

async function main() {
  console.log('=== Careful Photo Fetcher (with validation) ===\n');

  const fileContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const entries = parsePlaceholderEntries(fileContent);
  console.log(`Found ${entries.length} people with placeholder photos\n`);

  const progress = loadProgress();
  const attemptedSet = new Set(progress.attempted);
  const remaining = entries.filter(e => !attemptedSet.has(e.name));
  console.log(`Already attempted: ${progress.attempted.length}`);
  console.log(`Already found: ${Object.keys(progress.found).length}`);
  console.log(`Remaining: ${remaining.length}\n`);

  const stats = { wikidata: 0, wikipedia: 0, forbes: 0, 'wiki-rest': 0, none: 0, errors: 0 };

  for (let i = 0; i < remaining.length; i++) {
    const person = remaining[i];
    const idx = i + 1;

    try {
      console.log(`[${idx}/${remaining.length}] ${person.name} (${person.nationality}, ${person.birthday})...`);
      const result = await findPhoto(person);

      progress.attempted.push(person.name);

      if (result.url) {
        progress.found[person.name] = result.url;
        stats[result.strategy as keyof typeof stats]++;
        console.log(`  -> FOUND via ${result.strategy}`);
      } else {
        stats.none++;
        console.log(`  -> not found`);
      }
    } catch (err) {
      stats.errors++;
      progress.attempted.push(person.name);
      console.log(`  -> ERROR: ${err}`);
    }

    if (idx % 10 === 0 || idx === remaining.length) {
      saveProgress(progress);
      console.log(`  [Progress saved: ${Object.keys(progress.found).length} found / ${progress.attempted.length} attempted]`);
    }
  }

  saveProgress(progress);

  // Rewrite billionaires.ts
  console.log('\n=== Rewriting billionaires.ts ===\n');
  let updatedContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  let replacedCount = 0;

  const allEntries = parsePlaceholderEntries(updatedContent);
  const entryByName = new Map(allEntries.map(e => [e.name, e]));

  for (const [name, newUrl] of Object.entries(progress.found)) {
    const entry = entryByName.get(name);
    if (entry) {
      if (updatedContent.includes(entry.oldPhotoUrl)) {
        const safeNewUrl = newUrl.replace(/'/g, "%27");
        updatedContent = updatedContent.replace(entry.oldPhotoUrl, safeNewUrl);
        replacedCount++;
      }
    }
  }

  fs.writeFileSync(BILLIONAIRES_PATH, updatedContent);
  console.log(`Replaced ${replacedCount} photo URLs in billionaires.ts`);

  // Summary
  const totalFound = Object.keys(progress.found).length;
  console.log('\n=== Summary ===');
  console.log(`Total placeholder entries: ${entries.length}`);
  console.log(`Total attempted: ${progress.attempted.length}`);
  console.log(`Total found: ${totalFound} (${((totalFound / entries.length) * 100).toFixed(1)}%)`);
  console.log(`Still missing: ${entries.length - totalFound}`);
  console.log('\nBy strategy (this run):');
  console.log(`  Wikidata:        ${stats.wikidata}`);
  console.log(`  Forbes:          ${stats.forbes}`);
  console.log(`  Wikipedia:       ${stats.wikipedia}`);
  console.log(`  Wiki REST:       ${stats['wiki-rest']}`);
  console.log(`  Not found:       ${stats.none}`);
  console.log(`  Errors:          ${stats.errors}`);
}

main().catch(console.error);
