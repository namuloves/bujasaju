import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

// Comprehensive photo-fetching script
// Strategies: Wikidata wbsearchentities, Multi-language Wikipedia pageimages, Forbes og:image, English Wikipedia REST API

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/photo-progress.json';

// Rate limiting configuration (ms between requests to same domain)
const RATE_LIMITS: Record<string, number> = {
  'www.wikidata.org': 2000,
  'query.wikidata.org': 2000,
  'en.wikipedia.org': 300,
  'ko.wikipedia.org': 300,
  'zh.wikipedia.org': 300,
  'ja.wikipedia.org': 300,
  'de.wikipedia.org': 300,
  'fr.wikipedia.org': 300,
  'it.wikipedia.org': 300,
  'es.wikipedia.org': 300,
  'pt.wikipedia.org': 300,
  'ru.wikipedia.org': 300,
  'sv.wikipedia.org': 300,
  'nl.wikipedia.org': 300,
  'th.wikipedia.org': 300,
  'id.wikipedia.org': 300,
  'tr.wikipedia.org': 300,
  'www.forbes.com': 1500,
};

const lastRequestTime: Record<string, number> = {};

async function rateLimitDelay(domain: string): Promise<void> {
  const delay = RATE_LIMITS[domain] || 300;
  const last = lastRequestTime[domain] || 0;
  const elapsed = Date.now() - last;
  if (elapsed < delay) {
    await new Promise(r => setTimeout(r, delay - elapsed));
  }
  lastRequestTime[domain] = Date.now();
}

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return '';
  }
}

function httpsGet(url: string, acceptHtml = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const headers: Record<string, string> = {
      'User-Agent': 'BujasajuBot/1.0 (https://bujasaju.com; photo-fetcher)',
    };
    if (acceptHtml) {
      headers['Accept'] = 'text/html,application/xhtml+xml';
    } else {
      headers['Accept'] = 'application/json';
    }

    const req = protocol.get(url, { headers }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
        if (res.headers.location) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          httpsGet(redirectUrl, acceptHtml).then(resolve).catch(reject);
          // Drain body
          res.resume();
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

// --- Name variation generation ---

function generateNameVariations(name: string): string[] {
  const variations = [name];
  // Remove Jr, Sr, III, II, IV suffixes
  const noSuffix = name.replace(/\s+(Jr\.?|Sr\.?|III|II|IV)$/i, '').trim();
  if (noSuffix !== name) variations.push(noSuffix);
  // Remove middle name/initial
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
  found: Record<string, string>; // name -> new photo URL
  attempted: string[]; // names already attempted
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
  // Match each object entry in the array
  const entryRegex = /\{[^}]*?id:\s*'([^']+)'[^}]*?name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'[^}]*?photoUrl:\s*'(https:\/\/ui-avatars\.com[^']*)'/g;
  let match;
  while ((match = entryRegex.exec(fileContent)) !== null) {
    const fullMatch = match[0];
    const id = match[1];
    const name = match[2].replace(/\\'/g, "'");
    const oldPhotoUrl = match[3];

    // Extract optional fields
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
// Strategy 1: Wikidata wbsearchentities with birthday verification
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
          // Fetch all claims for entity
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

          // Check birthday match (strongest disambiguation signal)
          if (person.birthday) {
            const p569 = claims?.P569;
            if (p569 && p569.length > 0) {
              const wdBirthday = p569[0]?.mainsnak?.datavalue?.value?.time;
              if (wdBirthday) {
                // Wikidata format: +1960-03-15T00:00:00Z
                const wdDate = wdBirthday.replace(/^\+/, '').split('T')[0];
                if (wdDate !== person.birthday) continue; // Birthday mismatch, skip
              }
            }
          }

          // Check P18 (image)
          const p18 = claims?.P18;
          if (p18 && p18.length > 0) {
            const filename = p18[0].mainsnak?.datavalue?.value;
            if (filename) {
              return commonsThumbUrl(filename);
            }
          }
        } catch {
          // Individual entity fetch failed, try next
          continue;
        }
      }
    } catch {
      // Search failed for this name variation, try next
      continue;
    }
  }
  return null;
}

// ============================
// Strategy 2: Multi-language Wikipedia pageimages API
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

  // Always add English as fallback
  if (!langs.includes('en')) langs.push('en');

  return [...new Set(langs)];
}

async function strategy2_wikipedia(person: BillionaireEntry): Promise<string | null> {
  const langs = getWikipediaLangs(person.nationality, person.nameKo);

  for (const lang of langs) {
    // Determine search name
    let searchName = person.name;
    if (lang === 'ko' && person.nameKo) {
      searchName = person.nameKo;
    }

    // Try 1: Direct title lookup
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(searchName)}&prop=pageimages&pithumbsize=400&format=json&redirects=1`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);
      const pages = data.query?.pages;
      if (pages) {
        for (const page of Object.values(pages) as any[]) {
          if (page.thumbnail?.source) {
            return page.thumbnail.source;
          }
        }
      }
    } catch {}

    // Try 2: Search with name + source - use description to verify it's a person
    const searchQueries = [
      searchName,
      searchName + ' ' + person.source,
    ];

    for (const query of searchQueries) {
      try {
        const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages|description&pithumbsize=400&format=json`;
        const resp = await rateLimitedGet(searchUrl);
        const data = JSON.parse(resp);
        const pages = data.query?.pages;
        if (pages) {
          for (const page of Object.values(pages) as any[]) {
            if (page.thumbnail?.source) {
              // Check description to verify it's about a person, not a company/place
              const desc = (page.description || '').toLowerCase();
              const title = (page.title || '').toLowerCase();
              const personName = searchName.toLowerCase();
              // Accept if: title contains the person's last name, or description mentions person-related keywords
              const lastName = personName.split(' ').pop() || '';
              const isPersonPage = title.includes(lastName) &&
                !desc.includes('company') && !desc.includes('corporation') &&
                !desc.includes('building') && !desc.includes('city') &&
                !desc.includes('district') && !desc.includes('river');
              if (isPersonPage) {
                return page.thumbnail.source;
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
// Strategy 3: Forbes profile page og:image
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

async function strategy3_forbes(person: BillionaireEntry): Promise<string | null> {
  const variations = generateNameVariations(person.name);

  for (const nameVar of variations) {
    const slug = generateForbesSlug(nameVar);
    if (!slug) continue;

    try {
      const url = `https://www.forbes.com/profile/${slug}/`;
      const html = await rateLimitedGet(url, true);

      // Extract og:image
      const ogMatch = html.match(/<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/i)
        || html.match(/content="([^"]+)"\s+(?:property|name)="og:image"/i);
      if (ogMatch && ogMatch[1]) {
        const imageUrl = ogMatch[1];
        // Validate it's a real image URL, not a generic Forbes logo
        if (imageUrl.includes('forbes') && !imageUrl.includes('default') && !imageUrl.includes('logo')) {
          return imageUrl;
        }
        // Accept any non-trivial image URL
        if (imageUrl.startsWith('http') && (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('.png') || imageUrl.includes('.webp') || imageUrl.includes('specials-images') || imageUrl.includes('imageserve'))) {
          return imageUrl;
        }
      }
    } catch {
      // Forbes might 404 or block, that's fine
    }
  }
  return null;
}

// ============================
// Strategy 4: English Wikipedia REST API with name variations
// ============================

async function strategy4_wikiRest(person: BillionaireEntry): Promise<string | null> {
  const variations = generateNameVariations(person.name);

  for (const nameVar of variations) {
    // Try REST summary endpoint
    try {
      const encoded = encodeURIComponent(nameVar.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);
      if (data.thumbnail?.source) {
        return data.thumbnail.source;
      }
      if (data.originalimage?.source) {
        return data.originalimage.source;
      }
    } catch {}
  }

  // Try search with name + source
  try {
    const query = person.name + ' ' + person.source;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&prop=pageimages&pithumbsize=400&format=json`;
    const resp = await rateLimitedGet(searchUrl);
    const data = JSON.parse(resp);
    const pages = data.query?.pages;
    if (pages) {
      for (const page of Object.values(pages) as any[]) {
        if (page.thumbnail?.source) {
          return page.thumbnail.source;
        }
      }
    }
  } catch {}

  return null;
}

// ============================
// Main orchestration
// ============================

async function findPhoto(person: BillionaireEntry): Promise<{ url: string | null; strategy: string }> {
  // Strategy 1: Multi-language Wikipedia (fastest, highest hit rate)
  try {
    const url = await strategy2_wikipedia(person);
    if (url) return { url, strategy: 'wikipedia' };
  } catch {}

  // Strategy 2: English Wikipedia REST API
  try {
    const url = await strategy4_wikiRest(person);
    if (url) return { url, strategy: 'wiki-rest' };
  } catch {}

  // Strategy 3: Wikidata with birthday verification (slower but precise)
  try {
    const url = await strategy1_wikidata(person);
    if (url) return { url, strategy: 'wikidata' };
  } catch {}

  // Strategy 4: Forbes og:image
  try {
    const url = await strategy3_forbes(person);
    if (url) return { url, strategy: 'forbes' };
  } catch {}

  return { url: null, strategy: 'none' };
}

async function main() {
  console.log('=== Comprehensive Photo Fetcher ===\n');

  // Load file and parse entries
  const fileContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const entries = parsePlaceholderEntries(fileContent);
  console.log(`Found ${entries.length} people with placeholder photos\n`);

  // Load progress
  const progress = loadProgress();
  const attemptedSet = new Set(progress.attempted);
  const remaining = entries.filter(e => !attemptedSet.has(e.name));
  console.log(`Already attempted: ${progress.attempted.length}`);
  console.log(`Already found: ${Object.keys(progress.found).length}`);
  console.log(`Remaining: ${remaining.length}\n`);

  // Strategy stats
  const stats = { wikidata: 0, wikipedia: 0, forbes: 0, 'wiki-rest': 0, none: 0, errors: 0 };

  for (let i = 0; i < remaining.length; i++) {
    const person = remaining[i];
    const idx = i + 1;

    try {
      console.log(`[${idx}/${remaining.length}] ${person.name} (${person.nationality})...`);
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

    // Save progress every 10 people
    if (idx % 10 === 0 || idx === remaining.length) {
      saveProgress(progress);
      console.log(`  [Progress saved: ${Object.keys(progress.found).length} found / ${progress.attempted.length} attempted]`);
    }
  }

  // Final save
  saveProgress(progress);

  // Now rewrite billionaires.ts with all found URLs
  console.log('\n=== Rewriting billionaires.ts ===\n');
  let updatedContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  let replacedCount = 0;

  // Build a map from name to entry for quick lookup of oldPhotoUrl
  const allEntries = parsePlaceholderEntries(updatedContent);
  const entryByName = new Map(allEntries.map(e => [e.name, e]));

  for (const [name, newUrl] of Object.entries(progress.found)) {
    const entry = entryByName.get(name);
    if (entry) {
      // Direct string replacement of the old URL
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
  console.log(`  Wikipedia:       ${stats.wikipedia}`);
  console.log(`  Forbes:          ${stats.forbes}`);
  console.log(`  Wiki REST:       ${stats['wiki-rest']}`);
  console.log(`  Not found:       ${stats.none}`);
  console.log(`  Errors:          ${stats.errors}`);
}

main().catch(console.error);
