import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';

// Bio + wealth-origin fetcher for all billionaires.
// Sources (in order): Wikipedia REST summary API, Forbes profile page.
// Produces:
//   - bio: one neutral sentence about the person and how they made their fortune
//   - wealthOrigin: 'self-made' | 'inherited' | 'mixed'
//
// Resumable via scripts/bio-progress.json.

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/bio-progress.json';

// ---------- rate limiting ----------

const RATE_LIMITS: Record<string, number> = {
  'en.wikipedia.org': 100,
  'www.forbes.com': 800,
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
  try { return new URL(url).hostname; } catch { return ''; }
}

function httpsGet(url: string, acceptHtml = false, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) { reject(new Error('Too many redirects')); return; }
    const protocol = url.startsWith('https') ? https : http;
    const headers: Record<string, string> = {
      'User-Agent': 'BujasajuBot/1.0 (https://bujasaju.com; bio-fetcher)',
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

// ---------- types ----------

interface BillionaireEntry {
  id: string;
  name: string;
  nameKo?: string;
  birthday: string;
  nationality: string;
  source: string;
  rawEntry: string; // full source-text of the object literal, including braces
}

type WealthOrigin = 'self-made' | 'inherited' | 'mixed';

interface BioResult {
  bio: string;
  wealthOrigin: WealthOrigin;
  strategy: string;
}

interface ProgressData {
  found: Record<string, { bio: string; wealthOrigin: WealthOrigin; strategy: string }>;
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

// ---------- parse billionaires.ts ----------

function parseAllEntries(content: string): BillionaireEntry[] {
  const entries: BillionaireEntry[] = [];
  // Match each { ... } object literal on a single line starting with `  { id:`
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*(\{\s*id:\s*'([^']+)'.*\}),?\s*$/);
    if (!m) continue;
    const rawEntry = m[1];
    const id = m[2];

    const nameMatch = rawEntry.match(/name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1].replace(/\\'/g, "'");

    const nameKoMatch = rawEntry.match(/nameKo:\s*'([^']*)'/);
    const birthdayMatch = rawEntry.match(/birthday:\s*'([^']*)'/);
    const nationalityMatch = rawEntry.match(/nationality:\s*'([^']*)'/);
    const sourceMatch = rawEntry.match(/source:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);

    entries.push({
      id,
      name,
      nameKo: nameKoMatch?.[1],
      birthday: birthdayMatch?.[1] || '',
      nationality: nationalityMatch?.[1] || '',
      source: sourceMatch?.[1]?.replace(/\\'/g, "'") || '',
      rawEntry,
    });
  }
  return entries;
}

// ---------- name variations ----------

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

// ---------- text utilities ----------

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Split text into sentences, respecting common abbreviations.
function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  const abbrev = ['Mr', 'Mrs', 'Ms', 'Dr', 'Jr', 'Sr', 'St', 'Mt', 'vs', 'Inc', 'Ltd', 'Co', 'Corp', 'U.S', 'U.K'];
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < cleaned.length - 1; i++) {
    if (cleaned[i] !== '.') continue;
    if (cleaned[i + 1] !== ' ') continue;
    const before = cleaned.slice(Math.max(0, i - 5), i);
    if (abbrev.some(a => before.endsWith(a))) continue;
    sentences.push(cleaned.slice(start, i + 1).trim());
    start = i + 2;
  }
  if (start < cleaned.length) {
    const tail = cleaned.slice(start).trim();
    if (tail) sentences.push(tail);
  }
  return sentences;
}

// Tests whether a sentence is substantive enough to be a bio on its own.
// A "thin" sentence is e.g. "X is an American businessman." — grammatically fine
// but doesn't tell you anything about how they made their money.
function isSubstantiveBio(sentence: string): boolean {
  if (sentence.length < 80) return false;
  const lower = sentence.toLowerCase();
  const concreteMarkers = [
    'founder', 'co-founder', 'cofounder', 'founded', 'co-founded',
    'ceo', 'chairman', 'chairwoman', 'chair of', 'president of',
    'chief executive', 'owner', 'heir', 'heiress', 'inherited',
    'investor in', 'invested in', 'hedge fund', 'private equity',
    'made his fortune', 'made her fortune', 'built', 'created',
    'through his', 'through her', 'is best known for', 'known for',
  ];
  // Or mentions a specific industry/company noun.
  const industryMarkers = [
    'technology', 'software', 'pharmaceutical', 'oil', 'gas', 'energy',
    'real estate', 'retail', 'banking', 'finance', 'manufacturing',
    'automotive', 'textile', 'mining', 'steel', 'construction',
    'e-commerce', 'media', 'telecom', 'logistics', 'food', 'beverage',
    'fashion', 'luxury', 'hotel', 'casino', 'shipping', 'biotech',
  ];
  return concreteMarkers.some(m => lower.includes(m)) ||
    industryMarkers.some(m => lower.includes(m));
}

// Build the bio from an extract: prefer the first substantive sentence,
// otherwise combine the first two sentences so the reader learns something
// concrete about how the person made their money.
function buildBio(extract: string): string {
  const sentences = splitSentences(extract);
  if (sentences.length === 0) {
    const capped = extract.replace(/\s+/g, ' ').trim();
    return capped.length > 280 ? capped.slice(0, 277) + '...' : capped;
  }
  const first = sentences[0];
  if (isSubstantiveBio(first)) return first;
  if (sentences.length >= 2) {
    const combined = first + ' ' + sentences[1];
    if (combined.length <= 320) return combined;
  }
  return first;
}

function escapeForSingleQuoted(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ---------- person validation ----------

const PERSON_TERMS = [
  'businessman', 'businesswoman', 'billionaire', 'entrepreneur',
  'investor', 'founder', 'co-founder', 'executive', 'ceo', 'chairman', 'chairwoman',
  'philanthropist', 'industrialist', 'magnate', 'tycoon', 'banker', 'financier',
  'heiress', 'heir', 'president', 'born',
];

function looksLikePerson(text: string): boolean {
  const lower = text.toLowerCase();
  return PERSON_TERMS.some(t => lower.includes(t));
}

// Strict: title must equal the person's name (ignoring disambiguation suffix
// like "(businessman)"). This prevents matching e.g. "Errol Musk" for "Elon Musk".
function titleMatchesName(title: string, name: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip combining accents
      .replace(/\s*\([^)]*\)\s*$/, '') // strip trailing "(businessman)" etc.
      .replace(/[.\u2019']/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const t = norm(title);
  const n = norm(name);
  if (t === n) return true;
  // Also accept if title is the name minus a suffix (Jr, Sr, III, etc.)
  const nNoSuffix = n.replace(/\s+(jr|sr|ii|iii|iv)$/i, '').trim();
  if (t === nNoSuffix) return true;
  return false;
}

// Detects Wikipedia pages that are about a creative work ABOUT the person,
// not the person themselves — e.g. the "Elon Musk" page that's the Isaacson
// biography book. These pages share the exact title with the subject.
function looksLikeCreativeWork(description: string, extract: string): boolean {
  const d = (description || '').toLowerCase();
  const e = (extract || '').toLowerCase().slice(0, 300);
  const workTerms = [
    'book by', 'biography by', 'film by', 'documentary', 'song by',
    'album by', 'novel by', 'memoir by',
    'is a biography', 'is a book', 'is a film', 'is a documentary',
    'is a novel', 'is an album', 'is a song',
    'is an authorized biography', 'is an unauthorized biography',
    'biographical film', 'biographical book', 'biographical novel',
    'published in', 'directed by', 'released in',
  ];
  if (workTerms.some(w => d.includes(w) || e.includes(w))) return true;
  // General "is an? ... biography of <Name>" pattern — catches "authorized",
  // "unauthorized", "2023" etc. between "a[n]" and "biography".
  if (/\bis an?\s+[a-z0-9-]*\s*biography of\b/.test(e)) return true;
  if (/\bis an?\s+[a-z0-9-]*\s*(book|film|novel|documentary)\s+(about|by)\b/.test(e)) return true;
  return false;
}

// Looser match for search results where titles may include extra middle names.
// Accepts if every space-separated token of the query name appears in the title.
function titleContainsAllNameTokens(title: string, name: string): boolean {
  const t = title.toLowerCase().replace(/[.\u2019']/g, '');
  const tokens = name.toLowerCase().replace(/[.\u2019']/g, '').split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  return tokens.every(tok => t.includes(tok));
}

// ---------- wealth-origin classifier ----------

// Run classification over (bio + fuller extract when available).
// `sourceField` is the billionaire's `source` column, e.g. "Walmart" or
// "LVMH". Used as an additional signal — if the extract says the person
// founded that exact company, strong self-made; if it says they inherited
// it, strong inherited.
function classifyWealthOrigin(
  bio: string,
  extract: string,
  forbesSelfMade?: number,
  sourceField?: string,
): WealthOrigin {
  // Forbes self-made score is the strongest signal. 1–5 = inherited, 6–10 = self-made,
  // with 6–7 being "grew the inherited fortune significantly" → mixed.
  if (forbesSelfMade !== undefined) {
    if (forbesSelfMade <= 5) return 'inherited';
    if (forbesSelfMade === 6 || forbesSelfMade === 7) return 'mixed';
    return 'self-made';
  }

  const text = (bio + ' ' + extract).toLowerCase();

  const inheritedSignals = [
    'inherited', 'heiress', 'heir to', 'heir of', 'heirs of',
    'daughter of the founder', 'son of the founder',
    'granddaughter of', 'grandson of',
    'family fortune', 'family business', 'family-owned',
    'fourth-generation', 'third-generation', 'second-generation',
    'took over the', 'took over her', 'took over his',
    'widow of', 'inherit',
  ];
  const selfMadeSignals = [
    'founded', 'co-founded', 'cofounded', 'founder of', 'co-founder of',
    'started the company', 'started his own', 'started her own',
    'established', 'created the', 'built the company',
    'first-generation', 'self-made', 'from humble', 'bootstrapped',
    'dropped out',
  ];

  let inheritedScore = 0;
  let selfMadeScore = 0;

  for (const s of inheritedSignals) if (text.includes(s)) inheritedScore++;
  for (const s of selfMadeSignals) if (text.includes(s)) selfMadeScore++;

  // "son of" / "daughter of" alone is weak; only count if paired with
  // founder/chairman/etc.
  if (/(son|daughter) of .{0,50}(founder|chairman|ceo|magnate|industrialist|tycoon|billionaire|owner)/.test(text)) {
    inheritedScore++;
  }

  // Use the `source` field (company name) when available.
  if (sourceField) {
    // Pull the primary company token — e.g. "LVMH" from "LVMH", "Walmart" from "Walmart",
    // "Reliance" from "Reliance Industries", "Mars" from "Mars Inc.".
    const primaryCompany = sourceField
      .split(/[,(]/)[0]
      .replace(/\b(inc|ltd|co|corp|corporation|group|industries|technologies|llc)\.?\b/gi, '')
      .trim()
      .toLowerCase();
    if (primaryCompany.length >= 3) {
      const companyEscaped = primaryCompany.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // "founded <Company>" or "co-founded <Company>"
      if (new RegExp(`(founded|co-founded|cofounded|founder of|co-founder of)\\s+(the\\s+)?${companyEscaped}`).test(text)) {
        selfMadeScore += 2;
      }
      // "inherited <Company>" or "heir to <Company>"
      if (new RegExp(`(inherited|heir to|heiress to)\\s+(the\\s+)?(.{0,30}\\s)?${companyEscaped}`).test(text)) {
        inheritedScore += 2;
      }
    }
  }

  if (inheritedScore > 0 && selfMadeScore > 0) return 'mixed';
  if (inheritedScore > 0) return 'inherited';
  if (selfMadeScore > 0) return 'self-made';
  // Default when no signal: self-made (most Forbes billionaires are self-made
  // by count, and the Wikipedia first-sentence often just lists roles without
  // a founder/heir word).
  return 'self-made';
}

// ---------- Strategy 1: Wikipedia REST summary ----------

async function strategy_wikipedia(person: BillionaireEntry): Promise<BioResult | null> {
  const variations = generateNameVariations(person.name, person.nationality);

  for (const nameVar of variations) {
    // direct title
    try {
      const encoded = encodeURIComponent(nameVar.replace(/ /g, '_'));
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
      const resp = await rateLimitedGet(url);
      const data = JSON.parse(resp);
      if (data.type === 'disambiguation') continue;
      if (!data.title || !titleMatchesName(data.title, person.name)) continue;
      const descAndExtract = ((data.description || '') + ' ' + (data.extract || ''));
      if (looksLikeCreativeWork(data.description || '', data.extract || '')) continue;
      if (!looksLikePerson(descAndExtract)) continue;
      if (!data.extract) continue;
      const bio = buildBio(data.extract);
      const wealthOrigin = classifyWealthOrigin(bio, data.extract, undefined, person.source);
      return { bio, wealthOrigin, strategy: 'wikipedia-direct' };
    } catch {}

    // disambiguation suffixes
    for (const suffix of ['(businessman)', '(entrepreneur)', '(businesswoman)', '(industrialist)']) {
      try {
        const encoded = encodeURIComponent((nameVar + ' ' + suffix).replace(/ /g, '_'));
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
        const resp = await rateLimitedGet(url);
        const data = JSON.parse(resp);
        if (data.type === 'disambiguation' || !data.extract) continue;
        if (looksLikeCreativeWork(data.description || '', data.extract || '')) continue;
        const bio = buildBio(data.extract);
        const wealthOrigin = classifyWealthOrigin(bio, data.extract, undefined, person.source);
        return { bio, wealthOrigin, strategy: 'wikipedia-disambig' };
      } catch {}
    }
  }

  // Fallback: search — accept only pages whose title contains ALL of the name's tokens.
  try {
    const query = encodeURIComponent(person.name + (person.source ? ' ' + person.source : ' billionaire'));
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=5&prop=extracts&exintro=1&explaintext=1&format=json`;
    const resp = await rateLimitedGet(searchUrl);
    const data = JSON.parse(resp);
    const pages = data.query?.pages;
    if (pages) {
      for (const page of Object.values(pages) as any[]) {
        const title = page.title || '';
        if (!titleContainsAllNameTokens(title, person.name)) continue;
        const extract = page.extract || '';
        if (!extract || !looksLikePerson(extract)) continue;
        if (looksLikeCreativeWork('', extract)) continue;
        const bio = buildBio(extract);
        const wealthOrigin = classifyWealthOrigin(bio, extract, undefined, person.source);
        return { bio, wealthOrigin, strategy: 'wikipedia-search' };
      }
    }
  } catch {}

  return null;
}

// ---------- Strategy 2: Forbes profile ----------

function generateForbeSlugs(name: string): string[] {
  const slugs: string[] = [];
  const clean = name.replace(/['\u2019]/g, '').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
  const standard = clean.toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (standard) slugs.push(standard);
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    const firstLast = `${parts[0]}-${parts[parts.length - 1]}`.toLowerCase();
    if (firstLast !== standard) slugs.push(firstLast);
  }
  return [...new Set(slugs)];
}

async function strategy_forbes(person: BillionaireEntry): Promise<BioResult | null> {
  const slugs = generateForbeSlugs(person.name);

  for (const slug of slugs) {
    if (!slug) continue;
    try {
      const url = `https://www.forbes.com/profile/${slug}/`;
      const html = await rateLimitedGet(url, true);

      // Description meta
      let desc = '';
      const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)
        || html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
      if (descMatch) desc = stripHtml(descMatch[1]);

      // Self-made score — Forbes uses text like "Self-Made Score 8"
      let selfMadeScore: number | undefined;
      const scoreMatch = html.match(/Self-?Made\s*Score[^\d]{0,20}(\d+)/i);
      if (scoreMatch) {
        const n = parseInt(scoreMatch[1], 10);
        if (!isNaN(n) && n >= 1 && n <= 10) selfMadeScore = n;
      }

      // Try to find the main bio blurb — Forbes renders it in a profile-bio paragraph.
      let bioBlurb = '';
      const bioMatch = html.match(/"personBio"\s*:\s*"([^"]{40,600})"/)
        || html.match(/profile-bio[^>]*>([^<]{40,600})/i);
      if (bioMatch) bioBlurb = stripHtml(bioMatch[1]).replace(/\\n/g, ' ').trim();

      const source = bioBlurb || desc;
      if (!source || source.length < 30) continue;
      if (!looksLikePerson(source) && !/worth|billion|fortune/i.test(source)) continue;

      const bio = buildBio(source);
      const wealthOrigin = classifyWealthOrigin(bio, source, selfMadeScore, person.source);
      return { bio, wealthOrigin, strategy: selfMadeScore !== undefined ? 'forbes-scored' : 'forbes' };
    } catch {}
  }

  return null;
}

// ---------- main orchestration ----------

async function findBio(person: BillionaireEntry): Promise<BioResult | null> {
  try {
    const r = await strategy_wikipedia(person);
    if (r) return r;
  } catch {}
  try {
    const r = await strategy_forbes(person);
    if (r) return r;
  } catch {}
  return null;
}

async function main() {
  console.log('=== Bio Fetcher ===\n');

  const fileContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const entries = parseAllEntries(fileContent);
  console.log(`Parsed ${entries.length} billionaire entries\n`);

  const progress = loadProgress();
  const attemptedSet = new Set(progress.attempted);

  const toProcess = entries.filter(e => !attemptedSet.has(e.name));
  console.log(`Already attempted: ${progress.attempted.length}`);
  console.log(`Already found: ${Object.keys(progress.found).length}`);
  console.log(`To process: ${toProcess.length}\n`);

  const stats: Record<string, number> = {};

  for (let i = 0; i < toProcess.length; i++) {
    const person = toProcess[i];
    const idx = i + 1;
    try {
      const result = await findBio(person);
      progress.attempted.push(person.name);
      if (result) {
        progress.found[person.name] = {
          bio: result.bio,
          wealthOrigin: result.wealthOrigin,
          strategy: result.strategy,
        };
        stats[result.strategy] = (stats[result.strategy] || 0) + 1;
        if (idx % 25 === 0 || idx < 20) {
          console.log(`[${idx}/${toProcess.length}] ${person.name} -> ${result.strategy} (${result.wealthOrigin})`);
        }
      } else {
        stats.none = (stats.none || 0) + 1;
        if (idx % 25 === 0 || idx < 20) {
          console.log(`[${idx}/${toProcess.length}] ${person.name} -> not found`);
        }
      }
    } catch (err) {
      stats.errors = (stats.errors || 0) + 1;
      progress.attempted.push(person.name);
      console.log(`[${idx}/${toProcess.length}] ${person.name} -> ERROR: ${err}`);
    }

    if (idx % 25 === 0 || idx === toProcess.length) {
      saveProgress(progress);
    }
  }

  saveProgress(progress);

  // ---------- rewrite billionaires.ts ----------
  console.log('\n=== Writing bios into billionaires.ts ===\n');
  let updatedContent = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const allEntries = parseAllEntries(updatedContent);
  let writeCount = 0;

  for (const entry of allEntries) {
    const found = progress.found[entry.name];
    if (!found) continue;

    // Skip if entry already has a bio field (don't overwrite manual edits).
    if (/\bbio:\s*'/.test(entry.rawEntry)) continue;

    const bioEscaped = escapeForSingleQuoted(found.bio);
    const insertion = `, bio: '${bioEscaped}', wealthOrigin: '${found.wealthOrigin}'`;

    // Insert before the closing `}` of this entry's raw text.
    const newRaw = entry.rawEntry.replace(/\}$/, insertion + ' }');
    if (newRaw === entry.rawEntry) continue;

    if (updatedContent.includes(entry.rawEntry)) {
      updatedContent = updatedContent.replace(entry.rawEntry, newRaw);
      writeCount++;
    }
  }

  fs.writeFileSync(BILLIONAIRES_PATH, updatedContent);

  console.log(`Wrote bios for ${writeCount} entries`);
  console.log('\n=== Summary ===');
  console.log(`Total entries: ${entries.length}`);
  console.log(`Bios found: ${Object.keys(progress.found).length}`);
  console.log(`Attempted: ${progress.attempted.length}`);
  console.log('\nBy strategy:');
  for (const [s, c] of Object.entries(stats)) console.log(`  ${s}: ${c}`);
}

main().catch(console.error);
