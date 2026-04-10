import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

// Aggressive photo-fetching script for remaining ~258 billionaires
// Uses relaxed Wikidata matching, multi-language Wikipedia, Forbes, DuckDuckGo, and SPARQL

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/photo-progress-v3.json';

// Rate limiting configuration
const RATE_LIMITS: Record<string, number> = {
  'www.wikidata.org': 1500,
  'query.wikidata.org': 1500,
  'api.duckduckgo.com': 500,
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

function httpsGet(url: string, acceptHtml = false, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) { reject(new Error('Too many redirects')); return; }
    const protocol = url.startsWith('https') ? https : http;
    const headers: Record<string, string> = {
      'User-Agent': 'BujasajuBot/1.0 (https://bujasaju.com; photo-fetcher)',
      'Accept': acceptHtml ? 'text/html,application/xhtml+xml' : 'application/json',
    };

    const req = protocol.get(url, { headers }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0)) {
        if (res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          httpsGet(redirectUrl, acceptHtml, maxRedirects - 1).then(resolve).catch(reject);
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

  const rejectPatterns = [
    'logo', '_ci', 'wordmark', 'brand',
    'flag_of', 'emblem_of', 'coat_of_arms', 'seal_of', 'map_of',
    'headquarters', '_hq',
    'replace_this_image', 'no-pic', 'no_pic', 'placeholder',
    'building', 'tower', 'plaza', 'stadium', 'museum', 'church', 'temple', 'tomb',
    'company', 'corporation', 'group_logo',
  ];

  for (const pattern of rejectPatterns) {
    if (decodedLower.includes(pattern)) return false;
  }

  const pathParts = decoded.split('/');
  const filename = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || '';
  if (/\bHQ\b/.test(filename)) return false;

  return true;
}

// --- Name utilities ---

function generateNameVariations(name: string, nationality: string): string[] {
  const variations = [name];
  const noSuffix = name.replace(/\s+(Jr\.?|Sr\.?|III|II|IV)$/i, '').trim();
  if (noSuffix !== name) variations.push(noSuffix);
  const parts = name.split(' ');
  if (parts.length > 2) {
    variations.push(parts[0] + ' ' + parts[parts.length - 1]);
  }
  const nat = nationality.toUpperCase();
  const asianNats = ['CN', 'TW', 'HK', 'SG'];
  if (asianNats.some(n => nat.includes(n)) && parts.length >= 2) {
    const reversed = parts[parts.length - 1] + ' ' + parts.slice(0, -1).join(' ');
    if (!variations.includes(reversed)) variations.push(reversed);
  }
  return [...new Set(variations)];
}

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
// Strategy 1: Wikidata with RELAXED birthday matching (year-only)
// ============================

async function strategy1_wikidata(person: BillionaireEntry): Promise<string | null> {
  const variations = generateNameVariations(person.name, person.nationality);
  const personYear = person.birthday ? person.birthday.split('-')[0] : '';

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

          const p31 = claims?.P31;
          if (!p31) continue;
          const isHuman = p31.some((c: any) => c.mainsnak?.datavalue?.value?.id === 'Q5');
          if (!isHuman) continue;

          // RELAXED birthday verification - year only
          if (personYear) {
            const p569 = claims?.P569;
            if (p569 && p569.length > 0) {
              const wdBirthday = p569[0]?.mainsnak?.datavalue?.value?.time;
              if (wdBirthday) {
                const wdDate = wdBirthday.replace(/^\+/, '').split('T')[0];
                const wdYear = wdDate.split('-')[0];
                if (wdYear !== personYear) continue;
              }
            }
          }

          const p18 = claims?.P18;
          if (p18 && p18.length > 0) {
            const filename = p18[0].mainsnak?.datavalue?.value;
            if (filename) {
              const thumbUrl = commonsThumbUrl(filename);
              if (isValidPhotoUrl(thumbUrl)) return thumbUrl;
            }
          }
        } catch { continue; }
      }
    } catch { continue; }
  }
  return null;
}

// ============================
// Strategy 2: Multi-language Wikipedia with BROADER search
// ============================

function getWikipediaLangs(nationality: string): string[] {
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
      case 'IN': langs.push('hi'); break;
      case 'PL': langs.push('pl'); break;
      case 'CZ': langs.push('cs'); break;
      case 'GR': langs.push('el'); break;
      case 'IL': langs.push('he'); break;
      case 'EG': case 'SA': case 'AE': case 'LB': case 'IQ': langs.push('ar'); break;
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
  if (titleLower.includes(nameLower)) return true;
  if (lastName.length > 2 && titleLower.includes(lastName)) return true;
  if (firstName.length > 3 && titleLower.includes(firstName)) return true;
  return false;
}

async function strategy2_wikipedia(person: BillionaireEntry): Promise<string | null> {
  const langs = getWikipediaLangs(person.nationality);
  const nameVariations = generateNameVariations(person.name, person.nationality);

  for (const lang of langs) {
    for (const nameVar of nameVariations) {
      let searchName = nameVar;
      if (lang === 'ko' && person.nameKo) searchName = person.nameKo;

      // Direct title lookup
      try {
        const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchName)}&prop=pageimages&pithumbsize=400&format=json&redirects=1`;
        const resp = await rateLimitedGet(url);
        const data = JSON.parse(resp);
        const pages = data.query?.pages;
        if (pages) {
          for (const page of Object.values(pages) as any[]) {
            if (page.pageid && page.pageid > 0 && page.thumbnail?.source) {
              if (isValidPhotoUrl(page.thumbnail.source)) return page.thumbnail.source;
            }
          }
        }
      } catch {}

      // Disambiguation suffixes (en only)
      if (lang === 'en') {
        for (const suffix of ['(businessman)', '(entrepreneur)', '(industrialist)', '(billionaire)']) {
          try {
            const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchName + ' ' + suffix)}&prop=pageimages&pithumbsize=400&format=json&redirects=1`;
            const resp = await rateLimitedGet(url);
            const data = JSON.parse(resp);
            const pages = data.query?.pages;
            if (pages) {
              for (const page of Object.values(pages) as any[]) {
                if (page.pageid && page.pageid > 0 && page.thumbnail?.source) {
                  if (isValidPhotoUrl(page.thumbnail.source)) return page.thumbnail.source;
                }
              }
            }
          } catch {}
        }
      }
    }

    // Search queries
    const searchQueries = [person.name, `${person.name} billionaire`];
    if (person.source) searchQueries.push(`${person.name} ${person.source}`);

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages|description&pithumbsize=400&format=json`;
        const resp = await rateLimitedGet(searchUrl);
        const data = JSON.parse(resp);
        const pages = data.query?.pages;
        if (pages) {
          const lastName = person.name.split(' ').pop()?.toLowerCase() || '';
          for (const page of Object.values(pages) as any[]) {
            if (page.thumbnail?.source) {
              const title = (page.title || '').toLowerCase();
              const desc = (page.description || '').toLowerCase();
              if (lastName.length > 2 && title.includes(lastName)) {
                if (!desc.includes('company') && !desc.includes('corporation') &&
                    !desc.includes('building') && !desc.includes('city') &&
                    !desc.includes('district') && !desc.includes('river')) {
                  if (isValidPhotoUrl(page.thumbnail.source)) return page.thumbnail.source;
                }
              }
            }
          }
        }
      } catch {}
    }
  }
  return null;
}

// ============================
// Strategy 3: Forbes with MORE slug variations
// ============================

function generateForbeSlugs(name: string): string[] {
  const slugs: string[] = [];
  const clean = name
    .replace(/['\u2019]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim();

  const standard = clean.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (standard) slugs.push(standard);

  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const firstLast = `${parts[0]}-${parts[parts.length - 1]}`.toLowerCase();
    if (firstLast !== standard) slugs.push(firstLast);
    if (parts[parts.length - 1].length > 3) {
      slugs.push(parts[parts.length - 1].toLowerCase());
    }
  }

  const noSuffix = name.replace(/\s+(Jr\.?|Sr\.?|III|II|IV|,\s*Jr\.?|,\s*Sr\.?)$/i, '').trim();
  if (noSuffix !== name) {
    const cleanNoSuffix = noSuffix.replace(/['\u2019]/g, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const slug = cleanNoSuffix.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }

  return [...new Set(slugs)];
}

async function strategy3_forbes(person: BillionaireEntry): Promise<string | null> {
  const slugs = generateForbeSlugs(person.name);

  for (const slug of slugs) {
    if (!slug) continue;
    try {
      const url = `https://www.forbes.com/profile/${slug}/`;
      const html = await rateLimitedGet(url, true);

      const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
        || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
      if (ogMatch && ogMatch[1]) {
        const imageUrl = ogMatch[1];
        if (imageUrl.includes('no-pic') || imageUrl.includes('no_pic')) continue;
        if (imageUrl.includes('imageio.forbes.com') || imageUrl.includes('specials-images') || imageUrl.includes('imageserve')) {
          return imageUrl;
        }
        if (imageUrl.includes('forbes') && !imageUrl.includes('default') && !imageUrl.includes('logo')) {
          return imageUrl;
        }
      }
    } catch {}
  }
  return null;
}

// ============================
// Strategy 4: DuckDuckGo Instant Answer API
// ============================

async function strategy4_duckduckgo(person: BillionaireEntry): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${person.name} billionaire`);
    const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1`;
    const resp = await rateLimitedGet(url);
    const data = JSON.parse(resp);

    if (data.Image && typeof data.Image === 'string' && data.Image.length > 10) {
      let imageUrl = data.Image;
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      if (isValidPhotoUrl(imageUrl) && !imageUrl.endsWith('.svg')) return imageUrl;
    }

    if (data.Infobox?.content) {
      for (const item of data.Infobox.content) {
        if (item.data_type === 'image' && item.value) {
          let imageUrl = item.value;
          if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
          if (isValidPhotoUrl(imageUrl)) return imageUrl;
        }
      }
    }
  } catch {}

  try {
    const query = encodeURIComponent(person.name);
    const url = `https://api.duckduckgo.com/?q=${query}&format=json&no_html=1`;
    const resp = await rateLimitedGet(url);
    const data = JSON.parse(resp);

    if (data.Image && typeof data.Image === 'string' && data.Image.length > 10) {
      let imageUrl = data.Image;
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      if (isValidPhotoUrl(imageUrl) && !imageUrl.endsWith('.svg')) return imageUrl;
    }
  } catch {}

  return null;
}

// ============================
// Strategy 5: Wikidata SPARQL for remaining
// ============================

async function strategy5_sparql(person: BillionaireEntry): Promise<string | null> {
  const nameVariations = generateNameVariations(person.name, person.nationality);

  for (const nameVar of nameVariations) {
    try {
      const sparql = `SELECT ?item ?image WHERE {
  ?item wdt:P31 wd:Q5 .
  ?item wdt:P18 ?image .
  ?item wdt:P106/wdt:P279* wd:Q43845 .
  ?item rdfs:label "${nameVar}"@en .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 3`;

      const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);
      const bindings = data.results?.bindings;

      if (bindings && bindings.length > 0) {
        for (const binding of bindings) {
          const imageUrl = binding.image?.value;
          if (imageUrl) {
            const filename = decodeURIComponent(imageUrl.split('/').pop() || '');
            if (filename) {
              const thumbUrl = commonsThumbUrl(filename);
              if (isValidPhotoUrl(thumbUrl)) return thumbUrl;
            }
          }
        }
      }
    } catch {}
  }
  return null;
}

// ============================
// Strategy 6: Wiki REST API with person validation
// ============================

const PERSON_DESCRIPTION_TERMS = [
  'businessman', 'businesswoman', 'billionaire', 'entrepreneur',
  'investor', 'founder', 'executive', 'ceo', 'chairman', 'chairwoman',
  'philanthropist', 'industrialist', 'magnate', 'tycoon',
  'business', 'banker', 'financier', 'engineer', 'developer',
  'heiress', 'heir', 'socialite', 'politician', 'born',
];

async function strategy6_wikiRest(person: BillionaireEntry): Promise<string | null> {
  const variations = generateNameVariations(person.name, person.nationality);

  for (const nameVar of variations) {
    try {
      const encoded = encodeURIComponent(nameVar.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);

      if (!titleMatchesName(data.title || '', person.name)) continue;

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
  try {
    const url = await strategy1_wikidata(person);
    if (url) return { url, strategy: 'wikidata' };
  } catch {}

  try {
    const url = await strategy2_wikipedia(person);
    if (url) return { url, strategy: 'wikipedia' };
  } catch {}

  try {
    const url = await strategy3_forbes(person);
    if (url) return { url, strategy: 'forbes' };
  } catch {}

  try {
    const url = await strategy4_duckduckgo(person);
    if (url) return { url, strategy: 'duckduckgo' };
  } catch {}

  try {
    const url = await strategy5_sparql(person);
    if (url) return { url, strategy: 'sparql' };
  } catch {}

  try {
    const url = await strategy6_wikiRest(person);
    if (url) return { url, strategy: 'wiki-rest' };
  } catch {}

  return { url: null, strategy: 'none' };
}

async function main() {
  console.log('=== Aggressive Photo Fetcher (remaining billionaires) ===\n');

  const fileContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const entries = parsePlaceholderEntries(fileContent);
  console.log(`Found ${entries.length} people with placeholder photos\n`);

  const progress = loadProgress();
  const attemptedSet = new Set(progress.attempted);

  // Only process entries NOT already attempted in v3 progress
  let toProcess = entries.filter(e => !attemptedSet.has(e.name));

  if (toProcess.length === 0) {
    // Re-attempt all entries that were attempted but not found
    toProcess = entries.filter(e => !progress.found[e.name]);
    console.log(`All previously attempted. Re-trying ${toProcess.length} not-found entries...\n`);
    // Reset attempted list to only keep found ones
    progress.attempted = [...Object.keys(progress.found)];
  } else {
    console.log(`Already attempted (v3): ${progress.attempted.length}`);
    console.log(`Already found (v3): ${Object.keys(progress.found).length}`);
    console.log(`Remaining to try: ${toProcess.length}\n`);
  }

  const stats: Record<string, number> = { wikidata: 0, wikipedia: 0, forbes: 0, duckduckgo: 0, sparql: 0, 'wiki-rest': 0, none: 0, errors: 0 };

  for (let i = 0; i < toProcess.length; i++) {
    const person = toProcess[i];
    const idx = i + 1;

    try {
      console.log(`[${idx}/${toProcess.length}] ${person.name} (${person.nationality}, ${person.birthday})...`);
      const result = await findPhoto(person);

      progress.attempted.push(person.name);

      if (result.url) {
        progress.found[person.name] = result.url;
        stats[result.strategy] = (stats[result.strategy] || 0) + 1;
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

    if (idx % 10 === 0 || idx === toProcess.length) {
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

  const totalFound = Object.keys(progress.found).length;
  const stillPlaceholder = parsePlaceholderEntries(fs.readFileSync(BILLIONAIRES_PATH, 'utf8')).length;
  console.log('\n=== Summary ===');
  console.log(`Total placeholder entries (original): ${entries.length}`);
  console.log(`Total attempted: ${progress.attempted.length}`);
  console.log(`Total photos found: ${totalFound}`);
  console.log(`Still placeholder: ${stillPlaceholder}`);
  console.log('\nBy strategy (this run):');
  for (const [strategy, count] of Object.entries(stats)) {
    if (count > 0) console.log(`  ${strategy}: ${count}`);
  }
}

main().catch(console.error);
