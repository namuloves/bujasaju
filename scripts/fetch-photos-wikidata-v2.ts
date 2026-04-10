/**
 * Wikidata-based photo fetcher for billionaires still using ui-avatars placeholders.
 *
 * Strategy:
 *   1. Read billionaires.ts, find all entries with ui-avatars.com photoUrl.
 *   2. For each, search Wikidata wbsearchentities by name.
 *   3. For each candidate, fetch the full entity and check:
 *      - P18 (image) — must exist
 *      - P569 (date of birth) — optional; if present, should match ±1 year
 *      - P27 (country of citizenship) — optional; if present, should match
 *      - description — should contain a business keyword
 *   4. Score the match: HIGH (all three disambiguators pass) or REVIEW (some fail / missing)
 *   5. Write two output files:
 *      - scripts/photos-wikidata-results.json — full details per name
 *      - scripts/photos-wikidata-high-confidence.json — just the auto-apply ones
 *
 * Resumable: progress is written incrementally; reruns skip already-processed names.
 *
 * Usage:
 *   npx tsx scripts/fetch-photos-wikidata-v2.ts
 */

import * as fs from 'fs';
import * as https from 'https';

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const RESULTS_PATH = '/Users/namu_1/sajubuja/scripts/photos-wikidata-results.json';
const HIGH_CONF_PATH = '/Users/namu_1/sajubuja/scripts/photos-wikidata-high-confidence.json';

const USER_AGENT = 'BujasajuBot/1.0 (https://bujasaju.vercel.app; photo-fetcher) node-https';

// Rate limit: Wikidata asks for ≤ 1 req/sec. We use 1200ms to be safe.
const WIKIDATA_DELAY_MS = 1200;

// ISO country code → Wikidata Q-ID for country of citizenship (P27).
// Only covering codes that appear in the billionaires dataset.
const COUNTRY_QID: Record<string, string[]> = {
  AE: ['Q878'], AF: ['Q889'], AL: ['Q222'], AR: ['Q414'], AT: ['Q40'],
  AU: ['Q408'], BB: ['Q244'], BE: ['Q31'], BG: ['Q219'], BR: ['Q155'],
  BZ: ['Q242'], CA: ['Q16'], CH: ['Q39'], CL: ['Q298'], CN: ['Q148'],
  CO: ['Q739'], CR: ['Q800'], CY: ['Q229'], CZ: ['Q213'], DE: ['Q183'],
  DK: ['Q35'], DZ: ['Q262'], EE: ['Q191'], EG: ['Q79'], ES: ['Q29'],
  FI: ['Q33'], FR: ['Q142'], GB: ['Q145'], GE: ['Q230'], GG: ['Q3311985'],
  GR: ['Q41'], HK: ['Q8646', 'Q148'], HU: ['Q28'], ID: ['Q252'], IE: ['Q27'],
  IL: ['Q801'], IN: ['Q668'], IS: ['Q189'], IT: ['Q38'], JP: ['Q17'],
  KR: ['Q884'], KZ: ['Q232'], LB: ['Q822'], LI: ['Q347'], LU: ['Q32'],
  MA: ['Q1028'], MC: ['Q235'], MX: ['Q96'], MY: ['Q833'], NG: ['Q1033'],
  NL: ['Q55'], NO: ['Q20'], NP: ['Q837'], NZ: ['Q664'], OM: ['Q842'],
  PE: ['Q419'], PH: ['Q928'], PK: ['Q843'], PL: ['Q36'], PT: ['Q45'],
  QA: ['Q846'], RO: ['Q218'], RU: ['Q159'], SA: ['Q851'], SE: ['Q34'],
  SG: ['Q334'], SK: ['Q214'], ST: ['Q1039'], TH: ['Q869'], TR: ['Q43'],
  TW: ['Q865'], TZ: ['Q924'], UA: ['Q212'], US: ['Q30'], VE: ['Q717'],
  VN: ['Q881'], ZA: ['Q258'], ZW: ['Q954'],
};

// Business-related keywords for description matching
const BUSINESS_KEYWORDS = [
  'billionaire', 'businessman', 'businesswoman', 'entrepreneur',
  'founder', 'co-founder', 'investor', 'chairman', 'chairwoman',
  'ceo', 'executive', 'magnate', 'tycoon', 'industrialist',
  'financier', 'heir', 'heiress', 'philanthropist',
  'developer', 'mogul', 'capitalist',
];

// ---------- HTTP ----------

interface HttpResponse {
  status: number;
  body: string;
}

function httpsGet(url: string, retries = 2): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } },
      (res) => {
        if (
          res.statusCode &&
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location
        ) {
          const redirectUrl = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).toString();
          res.resume();
          httpsGet(redirectUrl, retries).then(resolve).catch(reject);
          return;
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on('error', async (err) => {
      if (retries > 0) {
        await sleep(2000);
        httpsGet(url, retries - 1).then(resolve).catch(reject);
      } else reject(err);
    });
    req.setTimeout(15000, () => {
      req.destroy();
      if (retries > 0) {
        httpsGet(url, retries - 1).then(resolve).catch(reject);
      } else reject(new Error('timeout'));
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let lastRequestAt = 0;
async function rateLimitedGet(url: string): Promise<HttpResponse> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < WIKIDATA_DELAY_MS) {
    await sleep(WIKIDATA_DELAY_MS - elapsed);
  }
  lastRequestAt = Date.now();
  return httpsGet(url);
}

// ---------- Parsing billionaires.ts ----------

interface Billionaire {
  name: string;
  birthday: string;   // YYYY-MM-DD or YYYY-01-01
  nationality: string; // ISO code, maybe compound like "US/ZA"
  industry: string;
  gender: string;      // 'M' or 'F'
  photoUrl: string;
}

function parseBillionaires(): Billionaire[] {
  const content = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const out: Billionaire[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (!line.trim().startsWith('{ id:')) continue;
    const pick = (field: string): string => {
      const m = line.match(
        new RegExp(`\\b${field}:\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'`)
      );
      return m ? m[1].replace(/\\'/g, "'") : '';
    };
    out.push({
      name: pick('name'),
      birthday: pick('birthday'),
      nationality: pick('nationality'),
      industry: pick('industry'),
      gender: pick('gender'),
      photoUrl: pick('photoUrl'),
    });
  }
  return out;
}

// ---------- Wikidata queries ----------

interface WDSearchResult {
  id: string;         // Q123456
  label: string;
  description?: string;
}

async function searchWikidata(name: string): Promise<WDSearchResult[]> {
  const url =
    'https://www.wikidata.org/w/api.php' +
    '?action=wbsearchentities' +
    '&search=' +
    encodeURIComponent(name) +
    '&language=en&format=json&type=item&limit=5';
  try {
    const resp = await rateLimitedGet(url);
    if (resp.status !== 200) return [];
    const data = JSON.parse(resp.body);
    return data.search || [];
  } catch {
    return [];
  }
}

interface WDEntity {
  qid: string;
  p18?: string;          // image filename on Commons
  birthYear?: number;
  countryQids: string[]; // P27 values
  description?: string;
  label?: string;
}

async function fetchEntity(qid: string): Promise<WDEntity | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  try {
    const resp = await rateLimitedGet(url);
    if (resp.status !== 200) return null;
    const data = JSON.parse(resp.body);
    const entity = data.entities?.[qid];
    if (!entity) return null;

    const p18 = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value as string | undefined;

    // Birth year from P569
    const p569 = entity.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time as
      | string
      | undefined;
    let birthYear: number | undefined;
    if (p569) {
      // Format like "+1974-01-01T00:00:00Z"
      const m = p569.match(/^[+-](\d{4})/);
      if (m) birthYear = parseInt(m[1], 10);
    }

    // Country of citizenship (P27)
    const countryQids: string[] = [];
    for (const claim of entity.claims?.P27 || []) {
      const c = claim.mainsnak?.datavalue?.value?.id as string | undefined;
      if (c) countryQids.push(c);
    }

    const description = entity.descriptions?.en?.value as string | undefined;
    const label = entity.labels?.en?.value as string | undefined;

    return { qid, p18, birthYear, countryQids, description, label };
  } catch {
    return null;
  }
}

// ---------- Scoring ----------

interface Candidate {
  qid: string;
  searchLabel: string;
  searchDescription: string;
  entity: WDEntity;
  score: {
    hasPhoto: boolean;
    birthMatch: 'exact' | 'off' | 'missing'; // exact=within 1 year, off=wrong, missing=no P569
    countryMatch: 'yes' | 'no' | 'missing';
    keywordMatch: boolean;
    total: number; // 0-5
    verdict: 'HIGH' | 'REVIEW' | 'REJECT';
  };
}

function scoreCandidate(b: Billionaire, entity: WDEntity, searchLabel: string, searchDesc: string): Candidate['score'] {
  const hasPhoto = !!entity.p18;

  // Birth year check
  let birthMatch: 'exact' | 'off' | 'missing' = 'missing';
  const targetYear = parseInt(b.birthday.slice(0, 4), 10);
  if (!isNaN(targetYear) && entity.birthYear != null) {
    birthMatch = Math.abs(targetYear - entity.birthYear) <= 1 ? 'exact' : 'off';
  }

  // Country check
  let countryMatch: 'yes' | 'no' | 'missing' = 'missing';
  if (entity.countryQids.length > 0) {
    // Compare against any segment of compound nationality (e.g. "US/ZA")
    const wantedQids = new Set<string>();
    for (const natCode of b.nationality.split('/')) {
      for (const qid of COUNTRY_QID[natCode] || []) {
        wantedQids.add(qid);
      }
    }
    if (wantedQids.size === 0) {
      countryMatch = 'missing';
    } else {
      countryMatch = entity.countryQids.some((q) => wantedQids.has(q)) ? 'yes' : 'no';
    }
  }

  // Keyword check on description (either from search result OR full entity)
  const descText = ((entity.description || '') + ' ' + searchDesc).toLowerCase();
  const keywordMatch = BUSINESS_KEYWORDS.some((kw) => descText.includes(kw));

  // Score out of 5:
  //   hasPhoto = required (0 otherwise)
  //   birthMatch=exact → +2, off → −3 (penalty), missing → 0
  //   countryMatch=yes → +2, no → −2, missing → 0
  //   keywordMatch → +1
  let total = 0;
  if (!hasPhoto) return { hasPhoto, birthMatch, countryMatch, keywordMatch, total: 0, verdict: 'REJECT' };

  if (birthMatch === 'exact') total += 2;
  else if (birthMatch === 'off') total -= 3;

  if (countryMatch === 'yes') total += 2;
  else if (countryMatch === 'no') total -= 2;

  if (keywordMatch) total += 1;

  let verdict: 'HIGH' | 'REVIEW' | 'REJECT';
  if (total < 0) verdict = 'REJECT';
  else if (total >= 3) verdict = 'HIGH';
  else verdict = 'REVIEW';

  return { hasPhoto, birthMatch, countryMatch, keywordMatch, total, verdict };
}

// ---------- Commons URL ----------

function commonsImageUrl(filename: string): string {
  // Wikidata P18 gives us "Guo Guangchang.jpg" — convert to a real URL.
  // Use Wikimedia's Special:Redirect which handles encoding + MD5 hashing.
  const cleaned = filename.replace(/_/g, ' ').trim();
  const encoded = encodeURIComponent(cleaned.replace(/ /g, '_'));
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encoded}?width=400`;
}

// ---------- Results storage ----------

interface ResultEntry {
  name: string;
  status: 'processed' | 'no-match' | 'error';
  bestCandidate?: Candidate;
  allCandidates?: Array<{ qid: string; label: string; description: string; verdict: string; total: number }>;
  photoUrl?: string;
}

function loadResults(): Record<string, ResultEntry> {
  if (!fs.existsSync(RESULTS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveResults(results: Record<string, ResultEntry>) {
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
}

// ---------- Main ----------

async function main() {
  const all = parseBillionaires();
  const missing = all.filter((b) => b.photoUrl.includes('ui-avatars.com'));
  console.log(`Parsed ${all.length} billionaires, ${missing.length} missing photos.`);

  const results = loadResults();
  const pending = missing.filter((b) => !results[b.name]);
  console.log(`Already processed: ${Object.keys(results).length}. Pending: ${pending.length}.`);
  console.log();

  let processedThisRun = 0;
  const SAVE_EVERY = 10;

  for (const b of pending) {
    processedThisRun++;
    const logPrefix = `[${processedThisRun}/${pending.length}] ${b.name}`;

    try {
      const searchResults = await searchWikidata(b.name);
      if (searchResults.length === 0) {
        results[b.name] = { name: b.name, status: 'no-match' };
        console.log(`${logPrefix} → no search results`);
        if (processedThisRun % SAVE_EVERY === 0) saveResults(results);
        continue;
      }

      // Score all candidates, pick the best one
      const candidates: Candidate[] = [];
      for (const sr of searchResults) {
        const entity = await fetchEntity(sr.id);
        if (!entity) continue;
        const score = scoreCandidate(b, entity, sr.label || '', sr.description || '');
        candidates.push({
          qid: sr.id,
          searchLabel: sr.label || '',
          searchDescription: sr.description || '',
          entity,
          score,
        });
      }

      // Sort by score descending; prefer non-REJECT
      candidates.sort((a, b) => b.score.total - a.score.total);
      const best = candidates.find((c) => c.score.verdict !== 'REJECT') ?? null;

      if (!best) {
        results[b.name] = {
          name: b.name,
          status: 'processed',
          allCandidates: candidates.map((c) => ({
            qid: c.qid,
            label: c.searchLabel,
            description: c.searchDescription,
            verdict: c.score.verdict,
            total: c.score.total,
          })),
        };
        console.log(`${logPrefix} → all rejected (${candidates.length} candidates)`);
      } else {
        const photoUrl = best.entity.p18 ? commonsImageUrl(best.entity.p18) : undefined;
        results[b.name] = {
          name: b.name,
          status: 'processed',
          bestCandidate: best,
          photoUrl,
          allCandidates: candidates.map((c) => ({
            qid: c.qid,
            label: c.searchLabel,
            description: c.searchDescription,
            verdict: c.score.verdict,
            total: c.score.total,
          })),
        };
        console.log(
          `${logPrefix} → ${best.score.verdict} (score=${best.score.total}, ${best.qid}, ${best.searchDescription})`
        );
      }
    } catch (err) {
      results[b.name] = { name: b.name, status: 'error' };
      console.error(`${logPrefix} → ERROR ${(err as Error).message}`);
    }

    if (processedThisRun % SAVE_EVERY === 0) saveResults(results);
  }

  saveResults(results);

  // Build high-confidence apply list
  const highConf: Record<string, string> = {};
  for (const [name, r] of Object.entries(results)) {
    if (
      r.status === 'processed' &&
      r.bestCandidate &&
      r.bestCandidate.score.verdict === 'HIGH' &&
      r.photoUrl
    ) {
      highConf[name] = r.photoUrl;
    }
  }
  fs.writeFileSync(HIGH_CONF_PATH, JSON.stringify(highConf, null, 2));

  // Summary
  let high = 0,
    review = 0,
    reject = 0,
    noMatch = 0,
    error = 0;
  for (const r of Object.values(results)) {
    if (r.status === 'no-match') noMatch++;
    else if (r.status === 'error') error++;
    else if (r.bestCandidate?.score.verdict === 'HIGH') high++;
    else if (r.bestCandidate?.score.verdict === 'REVIEW') review++;
    else reject++;
  }
  console.log();
  console.log('=== SUMMARY ===');
  console.log(`HIGH confidence  : ${high}  (auto-apply ready, in ${HIGH_CONF_PATH})`);
  console.log(`REVIEW needed    : ${review}`);
  console.log(`All REJECT       : ${reject}`);
  console.log(`No Wikidata match: ${noMatch}`);
  console.log(`Error            : ${error}`);
  console.log(`Total            : ${Object.keys(results).length} / ${missing.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
