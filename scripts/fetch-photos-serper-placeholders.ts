/**
 * Serper Google Image scrape for the Forbes F-placeholder people.
 *
 * Reuses the ranking/output conventions of scripts/fetch-photos-serper.ts but:
 *   - Reads from public/billionaires.json (canonical data source)
 *   - Targets only the IDs in scripts/forbes-placeholder-ids.json
 *   - Merges into the existing scripts/photos-serper-results.json cache
 *     (keyed by name, same as original script) so the vision verifier
 *     that reads that file picks them up transparently
 *
 * Resumable: skips entries already present in the results cache.
 *
 * Usage:
 *   npx tsx scripts/fetch-photos-serper-placeholders.ts
 */

import * as fs from 'fs';
import * as https from 'https';

const DATA_PATH = '/Users/namu_1/sajubuja/public/billionaires.json';
const PLACEHOLDER_IDS_PATH = '/Users/namu_1/sajubuja/scripts/forbes-placeholder-ids.json';
const RESULTS_PATH = '/Users/namu_1/sajubuja/scripts/photos-serper-results.json';
const ENV_PATH = '/Users/namu_1/sajubuja/.env.local';

const REQUEST_DELAY_MS = 400;
const RESULTS_PER_QUERY = 8;

const TRUSTED_DOMAINS = [
  'forbes.com', 'forbesindia.com', 'forbesimg.com',
  'bloomberg.com',
  'ft.com',
  'nytimes.com', 'wsj.com', 'reuters.com', 'apnews.com',
  'cnbc.com', 'businessinsider.com',
  'economictimes.indiatimes.com', 'livemint.com',
  'scmp.com', 'caixin.com', 'caixinglobal.com',
  'nikkei.com',
  'handelsblatt.com', 'manager-magazin.de',
  'lesechos.fr',
  'sueddeutsche.de', 'faz.net',
  'hurun.net',
  'wikipedia.org', 'wikimedia.org',
  'hankyung.com', 'mk.co.kr', 'chosun.com', 'donga.com', 'joongang.co.kr',
  'corriere.it', 'repubblica.it', 'ilsole24ore.com',
  'nrc.nl',
  'elpais.com',
  'lefigaro.fr',
];

const BLOCKED_DOMAINS = [
  'pinterest.com', 'pinterest.ca', 'pinterest.co.uk',
  'facebook.com', 'fbsbx.com',
  'twitter.com', 'x.com', 'twimg.com',
  'instagram.com', 'cdninstagram.com',
  'tiktok.com',
  'youtube.com', 'ytimg.com',
  'shutterstock.com', 'alamy.com', 'gettyimages.com',
  'amazon.com', 'ebay.com', 'etsy.com',
  'reddit.com', 'redditmedia.com',
  'quora.com',
];

function loadEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx < 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    out[k] = v;
  }
  return out;
}

interface HttpResponse { status: number; body: string; }

function httpsPost(
  hostname: string,
  path: string,
  headers: Record<string, string>,
  body: string
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body).toString() },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.on('error', reject);
    req.setTimeout(20000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(body);
    req.end();
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface SerperImage {
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;
  domain?: string;
  link?: string;
}

interface SerperResponse {
  images?: SerperImage[];
  credits?: number;
}

async function serperImages(query: string, apiKey: string): Promise<SerperImage[]> {
  const body = JSON.stringify({ q: query, num: RESULTS_PER_QUERY });
  try {
    const resp = await httpsPost(
      'google.serper.dev',
      '/images',
      { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body
    );
    if (resp.status !== 200) {
      console.error(`  Serper error ${resp.status}: ${resp.body.slice(0, 200)}`);
      return [];
    }
    const parsed: SerperResponse = JSON.parse(resp.body);
    return parsed.images || [];
  } catch (err) {
    console.error(`  Serper exception: ${(err as Error).message}`);
    return [];
  }
}

function domainOf(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

interface RankedImage extends SerperImage {
  score: number;
  rejectReason?: string;
  pageDomain: string;
  imageDomain: string;
  trustLevel: 'trusted' | 'neutral' | 'blocked';
}

function rankImage(img: SerperImage, name: string): RankedImage {
  const pageDomain = domainOf(img.link);
  const imageDomain = domainOf(img.imageUrl);

  const trustedHit = TRUSTED_DOMAINS.some(
    (d) => pageDomain.endsWith(d) || imageDomain.endsWith(d)
  );
  const blockedHit = BLOCKED_DOMAINS.some(
    (d) => pageDomain.endsWith(d) || imageDomain.endsWith(d)
  );

  let trustLevel: 'trusted' | 'neutral' | 'blocked';
  if (blockedHit) trustLevel = 'blocked';
  else if (trustedHit) trustLevel = 'trusted';
  else trustLevel = 'neutral';

  let score = 0;

  if (trustLevel === 'blocked') {
    return { ...img, score: -100, rejectReason: 'blocked-domain', pageDomain, imageDomain, trustLevel };
  }

  if (trustLevel === 'trusted') score += 50;

  const w = img.imageWidth || 0;
  const h = img.imageHeight || 0;
  if (w < 150 || h < 150) score -= 20;
  else if (w > 200 && h > 200) score += 10;
  if (h > w && h / w < 2) score += 5;

  const nameTokens = name.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  const titleLower = (img.title || '').toLowerCase();
  const matchingTokens = nameTokens.filter((t) => titleLower.includes(t));
  if (matchingTokens.length === nameTokens.length) score += 15;
  else if (matchingTokens.length > 0) score += matchingTokens.length * 3;

  const junkKw = ['stock photo', 'quote', 't-shirt', 'poster', 'book', 'amazon', 'pinterest'];
  if (junkKw.some((kw) => titleLower.includes(kw))) score -= 15;

  if (w && h && (w / h > 3 || h / w > 3)) score -= 10;

  return { ...img, score, pageDomain, imageDomain, trustLevel };
}

interface Billionaire {
  id: string;
  name: string;
  nationality?: string;
  industry?: string;
  source?: string;
  photoUrl?: string;
}

interface ResultEntry {
  name: string;
  id: string;
  nationality: string;
  source: string;
  status: 'matched' | 'no-results' | 'error';
  query?: string;
  candidates?: RankedImage[];
  bestIndex?: number;
  autoApply?: boolean;
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

function buildQuery(b: Billionaire): string {
  const src = (b.source || '').trim();
  if (src) return `${b.name} ${src}`;
  return `${b.name} billionaire`;
}

async function main() {
  const env = loadEnv();
  const apiKey = env.SERPER_API_KEY || process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('SERPER_API_KEY not found in .env.local or environment');
    process.exit(1);
  }

  const placeholderIds: string[] = JSON.parse(
    fs.readFileSync(PLACEHOLDER_IDS_PATH, 'utf8')
  ).placeholderIds;
  const all: Billionaire[] = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const byId = new Map(all.map((b) => [b.id, b]));
  const targets: Billionaire[] = placeholderIds
    .map((id) => byId.get(id))
    .filter((b): b is Billionaire => !!b);

  const results = loadResults();
  const pending = targets.filter((b) => !results[b.name]);

  console.log(`Placeholder targets: ${targets.length}`);
  console.log(`Already cached:      ${targets.length - pending.length}`);
  console.log(`Pending this run:    ${pending.length}\n`);

  let processed = 0;
  const SAVE_EVERY = 10;

  for (const b of pending) {
    processed++;
    const tag = `[${processed}/${pending.length}] ${b.name} (${b.nationality || '?'})`;

    try {
      const query = buildQuery(b);
      await sleep(REQUEST_DELAY_MS);
      const rawImages = await serperImages(query, apiKey);

      if (rawImages.length === 0) {
        results[b.name] = {
          name: b.name,
          id: b.id,
          nationality: b.nationality || '',
          source: b.source || '',
          status: 'no-results',
          query,
        };
        console.log(`${tag} → no results`);
        if (processed % SAVE_EVERY === 0) saveResults(results);
        continue;
      }

      const ranked = rawImages
        .map((img) => rankImage(img, b.name))
        .sort((a, b) => b.score - a.score);

      const best = ranked[0];
      const autoApply = best.score >= 50 && best.trustLevel === 'trusted';

      results[b.name] = {
        name: b.name,
        id: b.id,
        nationality: b.nationality || '',
        source: b.source || '',
        status: 'matched',
        query,
        candidates: ranked,
        bestIndex: 0,
        autoApply,
      };

      console.log(
        `${tag} → ${autoApply ? 'AUTO' : 'REVIEW'} score=${best.score} ` +
          `[${best.pageDomain || '?'}] "${(best.title || '').slice(0, 50)}"`
      );
    } catch (err) {
      results[b.name] = {
        name: b.name,
        id: b.id,
        nationality: b.nationality || '',
        source: b.source || '',
        status: 'error',
      };
      console.error(`${tag} → ERROR ${(err as Error).message}`);
    }

    if (processed % SAVE_EVERY === 0) saveResults(results);
  }

  saveResults(results);

  // Summary for this batch
  let auto = 0, review = 0, none = 0, err = 0;
  for (const b of targets) {
    const r = results[b.name];
    if (!r) continue;
    if (r.status === 'no-results') none++;
    else if (r.status === 'error') err++;
    else if (r.autoApply) auto++;
    else review++;
  }
  console.log('\n=== SUMMARY (F-placeholder batch) ===');
  console.log(`Auto-apply (trusted source): ${auto}`);
  console.log(`Needs review               : ${review}`);
  console.log(`No results                 : ${none}`);
  console.log(`Errors                     : ${err}`);
  console.log(`Total in batch             : ${targets.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
