/**
 * Non-English Wikipedia photo fetcher.
 *
 * For each billionaire still using a ui-avatars placeholder, try Wikipedia
 * in the language(s) most likely to have them:
 *   - CN → zh
 *   - IN → hi + en
 *   - IL → he + en
 *   - GR → el + en
 *   - PL → pl + en
 *   - VN → vi + en
 *   - AE/SA/LB/EG/MA/DZ → ar + en
 *   - KR → ko + en
 *   - JP → ja + en
 *   - TW/HK → zh + en
 *   - RU → ru + en
 *   - TR → tr + en
 *   - IT → it + en
 *   - ES → es + en
 *   - FR → fr + en
 *   - DE/AT/CH → de + en
 *   - BR/PT → pt + en
 *   - SE → sv + en
 *   - NL → nl + en
 *   - others → en only
 *
 * For each language, calls Wikipedia REST summary API to get a thumbnail.
 * Uses name + disambiguators in the query; writes results incrementally
 * to scripts/photos-wiki-lang-results.json.
 *
 * Usage:
 *   npx tsx scripts/fetch-photos-wiki-lang.ts
 */

import * as fs from 'fs';
import * as https from 'https';

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const RESULTS_PATH = '/Users/namu_1/sajubuja/scripts/photos-wiki-lang-results.json';
const HIGH_CONF_PATH = '/Users/namu_1/sajubuja/scripts/photos-wiki-lang-high-conf.json';

const USER_AGENT = 'BujasajuBot/1.0 (https://bujasaju.vercel.app; photo-fetcher)';
const DELAY_MS = 400; // per-language, polite

// ---------- nationality → language list ----------

const NATIONALITY_LANGS: Record<string, string[]> = {
  CN: ['zh', 'en'],
  TW: ['zh', 'en'],
  HK: ['zh', 'en'],
  JP: ['ja', 'en'],
  KR: ['ko', 'en'],
  IN: ['hi', 'en'],
  IL: ['he', 'en'],
  GR: ['el', 'en'],
  PL: ['pl', 'en'],
  VN: ['vi', 'en'],
  AE: ['ar', 'en'],
  SA: ['ar', 'en'],
  LB: ['ar', 'en'],
  EG: ['ar', 'en'],
  MA: ['ar', 'en'],
  DZ: ['ar', 'en'],
  QA: ['ar', 'en'],
  RU: ['ru', 'en'],
  UA: ['uk', 'ru', 'en'],
  TR: ['tr', 'en'],
  IT: ['it', 'en'],
  ES: ['es', 'en'],
  FR: ['fr', 'en'],
  DE: ['de', 'en'],
  AT: ['de', 'en'],
  CH: ['de', 'fr', 'it', 'en'],
  LI: ['de', 'en'],
  LU: ['fr', 'de', 'en'],
  BE: ['nl', 'fr', 'en'],
  NL: ['nl', 'en'],
  SE: ['sv', 'en'],
  NO: ['no', 'en'],
  DK: ['da', 'en'],
  FI: ['fi', 'en'],
  IS: ['is', 'en'],
  BR: ['pt', 'en'],
  PT: ['pt', 'en'],
  MX: ['es', 'en'],
  AR: ['es', 'en'],
  CO: ['es', 'en'],
  CL: ['es', 'en'],
  PE: ['es', 'en'],
  VE: ['es', 'en'],
  CR: ['es', 'en'],
  CZ: ['cs', 'en'],
  SK: ['sk', 'en'],
  HU: ['hu', 'en'],
  RO: ['ro', 'en'],
  BG: ['bg', 'en'],
  TH: ['th', 'en'],
  ID: ['id', 'en'],
  MY: ['ms', 'en'],
  SG: ['en'], // multi-ethnic
  PH: ['en'],
  PK: ['ur', 'en'],
  NP: ['ne', 'en'],
  ZA: ['en'],
  NG: ['en'],
  KZ: ['ru', 'en'],
  GE: ['ka', 'en'],
  EE: ['et', 'en'],
  AL: ['sq', 'en'],
  AF: ['fa', 'en'],
  AU: ['en'],
  NZ: ['en'],
  CA: ['en', 'fr'],
  GB: ['en'],
  IE: ['en'],
  US: ['en'],
  MC: ['fr', 'en'],
};

// ---------- HTTP ----------

interface HttpResponse {
  status: number;
  body: string;
}

function httpsGet(url: string, retries = 1): Promise<HttpResponse> {
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
        await sleep(1500);
        httpsGet(url, retries - 1).then(resolve).catch(reject);
      } else reject(err);
    });
    req.setTimeout(12000, () => {
      req.destroy();
      if (retries > 0) httpsGet(url, retries - 1).then(resolve).catch(reject);
      else reject(new Error('timeout'));
    });
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-domain rate limiter
const lastAt: Record<string, number> = {};
async function rateLimitedGet(url: string): Promise<HttpResponse> {
  const domain = new URL(url).hostname;
  const last = lastAt[domain] || 0;
  const elapsed = Date.now() - last;
  if (elapsed < DELAY_MS) await sleep(DELAY_MS - elapsed);
  lastAt[domain] = Date.now();
  return httpsGet(url);
}

// ---------- Parsing ----------

interface Billionaire {
  name: string;
  birthday: string;
  nationality: string;
  industry: string;
  photoUrl: string;
}

function parseBillionaires(): Billionaire[] {
  const content = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const out: Billionaire[] = [];
  for (const line of content.split('\n')) {
    if (!line.trim().startsWith('{ id:')) continue;
    const pick = (f: string) => {
      const m = line.match(new RegExp(`\\b${f}:\\s*'([^'\\\\]*(?:\\\\.[^'\\\\]*)*)'`));
      return m ? m[1].replace(/\\'/g, "'") : '';
    };
    out.push({
      name: pick('name'),
      birthday: pick('birthday'),
      nationality: pick('nationality'),
      industry: pick('industry'),
      photoUrl: pick('photoUrl'),
    });
  }
  return out;
}

// ---------- Wikipedia search ----------

interface WikiHit {
  lang: string;
  title: string;
  pageUrl: string;
  thumbUrl?: string;
  description?: string;
  extract?: string;
}

// Try the direct REST summary endpoint for a title
async function trySummary(lang: string, title: string): Promise<WikiHit | null> {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  try {
    const r = await rateLimitedGet(url);
    if (r.status !== 200) return null;
    const data = JSON.parse(r.body);
    if (data.type === 'disambiguation') return null;
    const thumb = data.originalimage?.source || data.thumbnail?.source;
    if (!thumb) return null;
    return {
      lang,
      title: data.title || title,
      pageUrl: data.content_urls?.desktop?.page || '',
      thumbUrl: thumb,
      description: data.description,
      extract: data.extract,
    };
  } catch {
    return null;
  }
}

// Search Wikipedia for a name, return list of candidate titles
async function search(lang: string, query: string, limit = 3): Promise<string[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${limit}`;
  try {
    const r = await rateLimitedGet(url);
    if (r.status !== 200) return [];
    const data = JSON.parse(r.body);
    return (data.query?.search || []).map((s: { title: string }) => s.title);
  } catch {
    return [];
  }
}

// ---------- Scoring ----------

// Business keywords per language.
const BIZ_KEYWORDS: Record<string, string[]> = {
  en: ['billionaire', 'businessman', 'businesswoman', 'entrepreneur', 'founder', 'investor', 'ceo', 'chairman', 'magnate', 'heir', 'heiress', 'executive', 'tycoon', 'industrialist'],
  ko: ['억만장자', '사업가', '기업인', '창업자', '회장', '투자자', 'CEO', '총수'],
  ja: ['実業家', '起業家', '経営者', '投資家', '会長', '社長', '富豪'],
  zh: ['企业家', '商人', '富豪', '亿万富翁', '董事长', '创始人', '投资人', '实业家', '富人'],
  ru: ['миллиардер', 'бизнесмен', 'предприниматель', 'инвестор', 'основатель', 'председатель'],
  es: ['millonario', 'empresario', 'empresaria', 'inversor', 'fundador', 'presidente'],
  fr: ['milliardaire', 'entrepreneur', 'homme d\'affaires', 'femme d\'affaires', 'investisseur', 'fondateur', 'président'],
  de: ['milliardär', 'unternehmer', 'unternehmerin', 'investor', 'gründer', 'vorstandsvorsitzender'],
  it: ['miliardario', 'imprenditore', 'imprenditrice', 'investitore', 'fondatore', 'presidente'],
  pt: ['bilionário', 'empresário', 'empresária', 'investidor', 'fundador', 'presidente'],
  nl: ['miljardair', 'ondernemer', 'zakenman', 'zakenvrouw', 'investeerder', 'oprichter'],
  sv: ['miljardär', 'företagare', 'entreprenör', 'investerare', 'grundare'],
  pl: ['miliarder', 'przedsiębiorca', 'biznesmen', 'inwestor', 'założyciel', 'prezes'],
  tr: ['milyarder', 'iş insanı', 'iş adamı', 'girişimci', 'yatırımcı', 'kurucu'],
  ar: ['ملياردير', 'رجل أعمال', 'سيدة أعمال', 'رائد أعمال', 'مستثمر', 'مؤسس'],
  he: ['מיליארדר', 'איש עסקים', 'אשת עסקים', 'יזם', 'משקיע', 'מייסד'],
  hi: ['अरबपति', 'व्यवसायी', 'उद्यमी', 'निवेशक', 'संस्थापक'],
  el: ['δισεκατομμυριούχος', 'επιχειρηματίας', 'επενδυτής', 'ιδρυτής'],
  vi: ['tỷ phú', 'doanh nhân', 'nhà đầu tư', 'người sáng lập'],
  th: ['มหาเศรษฐี', 'นักธุรกิจ', 'ผู้ประกอบการ', 'นักลงทุน'],
  id: ['miliarder', 'pengusaha', 'investor', 'pendiri'],
  cs: ['miliardář', 'podnikatel', 'investor', 'zakladatel'],
  hu: ['milliárdos', 'üzletember', 'vállalkozó', 'befektető'],
  fa: ['میلیاردر', 'کارآفرین', 'سرمایه‌گذار'],
  uk: ['мільярдер', 'бізнесмен', 'підприємець', 'інвестор'],
};

function looksLikeBusinessPerson(hit: WikiHit): boolean {
  const text = ((hit.description || '') + ' ' + (hit.extract || '')).toLowerCase();
  if (!text) return false;
  const kws = BIZ_KEYWORDS[hit.lang] || [];
  const enKws = BIZ_KEYWORDS.en;
  return [...kws, ...enKws].some((kw) => text.includes(kw.toLowerCase()));
}

// ---------- Results ----------

interface ResultEntry {
  name: string;
  status: 'matched' | 'no-match' | 'error';
  hit?: WikiHit;
  tried?: string[]; // which languages we tried
  photoUrl?: string;
  verdict?: 'HIGH' | 'REVIEW';
}

function loadResults(): Record<string, ResultEntry> {
  if (!fs.existsSync(RESULTS_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveResults(r: Record<string, ResultEntry>) {
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(r, null, 2));
}

// ---------- Main ----------

async function main() {
  const all = parseBillionaires();
  const missing = all.filter((b) => b.photoUrl.includes('ui-avatars.com'));
  console.log(`Total billionaires: ${all.length}`);
  console.log(`Missing photos: ${missing.length}`);

  const results = loadResults();
  const pending = missing.filter((b) => !results[b.name]);
  console.log(`Already processed: ${Object.keys(results).length}`);
  console.log(`Pending: ${pending.length}\n`);

  let processed = 0;
  const SAVE_EVERY = 15;

  for (const b of pending) {
    processed++;
    const tag = `[${processed}/${pending.length}] ${b.name} (${b.nationality})`;

    // Determine which languages to try
    const primaryNat = b.nationality.split('/')[0];
    const langs = NATIONALITY_LANGS[primaryNat] || ['en'];

    let bestHit: WikiHit | null = null;

    try {
      for (const lang of langs) {
        // Strategy 1: direct title = person's name
        let hit = await trySummary(lang, b.name);

        // Strategy 2: search with disambiguators if strategy 1 found nothing
        if (!hit) {
          const queries = [
            `${b.name} billionaire`,
            `${b.name} businessman`,
            `${b.name} ${b.industry}`,
            b.name,
          ];
          for (const q of queries) {
            const titles = await search(lang, q, 3);
            for (const title of titles) {
              const candidate = await trySummary(lang, title);
              if (candidate && looksLikeBusinessPerson(candidate)) {
                hit = candidate;
                break;
              }
            }
            if (hit) break;
          }
        }

        if (hit) {
          bestHit = hit;
          break;
        }
      }

      if (bestHit) {
        const verdict: 'HIGH' | 'REVIEW' = looksLikeBusinessPerson(bestHit)
          ? 'HIGH'
          : 'REVIEW';
        results[b.name] = {
          name: b.name,
          status: 'matched',
          tried: langs,
          hit: bestHit,
          photoUrl: bestHit.thumbUrl,
          verdict,
        };
        console.log(`${tag} → ${verdict} (${bestHit.lang}: ${bestHit.title})`);
      } else {
        results[b.name] = { name: b.name, status: 'no-match', tried: langs };
        console.log(`${tag} → no match`);
      }
    } catch (err) {
      results[b.name] = { name: b.name, status: 'error', tried: langs };
      console.error(`${tag} → ERROR ${(err as Error).message}`);
    }

    if (processed % SAVE_EVERY === 0) saveResults(results);
  }

  saveResults(results);

  // Build high-confidence apply list
  const highConf: Record<string, string> = {};
  for (const [name, r] of Object.entries(results)) {
    if (r.status === 'matched' && r.verdict === 'HIGH' && r.photoUrl) {
      highConf[name] = r.photoUrl;
    }
  }
  fs.writeFileSync(HIGH_CONF_PATH, JSON.stringify(highConf, null, 2));

  // Summary
  let high = 0, review = 0, noMatch = 0, error = 0;
  for (const r of Object.values(results)) {
    if (r.status === 'no-match') noMatch++;
    else if (r.status === 'error') error++;
    else if (r.verdict === 'HIGH') high++;
    else if (r.verdict === 'REVIEW') review++;
  }
  console.log('\n=== SUMMARY ===');
  console.log(`HIGH confidence: ${high}  (→ ${HIGH_CONF_PATH})`);
  console.log(`REVIEW needed  : ${review}`);
  console.log(`No match       : ${noMatch}`);
  console.log(`Errors         : ${error}`);
  console.log(`Total processed: ${Object.keys(results).length} / ${missing.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
