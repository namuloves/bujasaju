/**
 * Google Image Search photo fetcher via Serper.dev.
 *
 * For each billionaire still using a ui-avatars placeholder:
 *   1. Query Google Images via Serper with "<name> + <disambiguator>"
 *   2. Take top N results, rank by source quality + dimensions
 *   3. Save ALL candidates (not just best) to a review JSON
 *   4. Separately export a "high confidence" list where the top result
 *      comes from a trusted news/business source (forbes, bloomberg, nyt,
 *      wsj, company site with person's name in domain, etc.)
 *
 * Resumable: progress saved incrementally.
 *
 * Usage:
 *   npx tsx scripts/fetch-photos-serper.ts
 *
 * Output:
 *   scripts/photos-serper-results.json       — full candidate list per person
 *   scripts/photos-serper-high-conf.json     — auto-apply ready (name → url)
 *   scripts/photos-serper-review.html        — clickable review page
 */

import * as fs from 'fs';
import * as https from 'https';

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const RESULTS_PATH = '/Users/namu_1/sajubuja/scripts/photos-serper-results.json';
const HIGH_CONF_PATH = '/Users/namu_1/sajubuja/scripts/photos-serper-high-conf.json';
const REVIEW_HTML_PATH = '/Users/namu_1/sajubuja/scripts/photos-serper-review.html';
const ENV_PATH = '/Users/namu_1/sajubuja/.env.local';

// ---------- Config ----------

const REQUEST_DELAY_MS = 400; // polite to serper
const RESULTS_PER_QUERY = 8;

// Domains we trust to have a real photo of the right person. Top of list = highest trust.
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

// Reject these domains outright — they're almost always wrong people or junk.
const BLOCKED_DOMAINS = [
  'pinterest.com', 'pinterest.ca', 'pinterest.co.uk',
  'facebook.com', 'fbsbx.com',
  'twitter.com', 'x.com', 'twimg.com',
  'instagram.com', 'cdninstagram.com',
  'tiktok.com',
  'youtube.com', 'ytimg.com',
  'shutterstock.com', 'alamy.com', 'gettyimages.com', // watermarked
  'amazon.com', 'ebay.com', 'etsy.com',
  'reddit.com', 'redditmedia.com',
  'quora.com',
];

// ---------- Env ----------

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

// ---------- HTTP ----------

interface HttpResponse {
  status: number;
  body: string;
}

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

// ---------- Parsing billionaires.ts ----------

interface Billionaire {
  id: string;
  name: string;
  birthday: string;
  nationality: string;
  industry: string;
  source: string; // Forbes source of wealth (e.g., "Tesla, SpaceX")
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
      id: pick('id'),
      name: pick('name'),
      birthday: pick('birthday'),
      nationality: pick('nationality'),
      industry: pick('industry'),
      source: pick('source'),
      photoUrl: pick('photoUrl'),
    });
  }
  return out;
}

// ---------- Serper API ----------

interface SerperImage {
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;   // Display name of the source site
  domain?: string;
  link?: string;     // URL of the page containing the image
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

// ---------- Ranking ----------

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

  // Check both the hosting page domain AND the image URL domain
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

  // Blocked → fatal
  if (trustLevel === 'blocked') {
    return { ...img, score: -100, rejectReason: 'blocked-domain', pageDomain, imageDomain, trustLevel };
  }

  // Trusted source = big bonus
  if (trustLevel === 'trusted') score += 50;

  // Image dimensions: prefer portrait-ish, not too small, not too huge
  const w = img.imageWidth || 0;
  const h = img.imageHeight || 0;
  if (w < 150 || h < 150) score -= 20;           // too small → probably a thumbnail sprite
  else if (w > 200 && h > 200) score += 10;
  if (h > w && h / w < 2) score += 5;             // portrait orientation

  // Title/alt containing the name is a good sign
  const nameTokens = name.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  const titleLower = (img.title || '').toLowerCase();
  const matchingTokens = nameTokens.filter((t) => titleLower.includes(t));
  if (matchingTokens.length === nameTokens.length) score += 15;
  else if (matchingTokens.length > 0) score += matchingTokens.length * 3;

  // Common junk keywords in titles = penalty
  const junkKw = ['stock photo', 'quote', 't-shirt', 'poster', 'book', 'amazon', 'pinterest'];
  if (junkKw.some((kw) => titleLower.includes(kw))) score -= 15;

  // Absurd aspect ratios (banner, wide strip) = penalty
  if (w && h && (w / h > 3 || h / w > 3)) score -= 10;

  return { ...img, score, pageDomain, imageDomain, trustLevel };
}

// ---------- Query construction ----------

function buildQueries(b: Billionaire): string[] {
  const queries: string[] = [];
  const name = b.name;
  const src = b.source.trim();

  // Use "source of wealth" (company name) as the primary disambiguator
  if (src) {
    queries.push(`${name} ${src}`);
  }
  // Fallback: name + billionaire
  queries.push(`${name} billionaire`);
  // Last resort: just the name
  queries.push(name);

  return queries;
}

// ---------- Results ----------

interface ResultEntry {
  name: string;
  id: string;
  nationality: string;
  source: string;
  status: 'matched' | 'no-results' | 'error';
  query?: string;
  candidates?: RankedImage[];
  bestIndex?: number;
  autoApply?: boolean; // true if best candidate is from trusted domain
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
  const env = loadEnv();
  const apiKey = env.SERPER_API_KEY || process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.error('SERPER_API_KEY not found in .env.local or environment');
    process.exit(1);
  }

  const all = parseBillionaires();
  const missing = all.filter((b) => b.photoUrl.includes('ui-avatars.com'));
  console.log(`Total billionaires: ${all.length}`);
  console.log(`Missing photos:     ${missing.length}`);

  const results = loadResults();
  const pending = missing.filter((b) => !results[b.name]);
  console.log(`Already processed:  ${Object.keys(results).length}`);
  console.log(`Pending this run:   ${pending.length}\n`);

  let processed = 0;
  const SAVE_EVERY = 10;

  for (const b of pending) {
    processed++;
    const tag = `[${processed}/${pending.length}] ${b.name} (${b.nationality})`;

    try {
      const queries = buildQueries(b);
      // Just use the first query (most specific: name + company)
      const query = queries[0];

      await sleep(REQUEST_DELAY_MS);
      const rawImages = await serperImages(query, apiKey);

      if (rawImages.length === 0) {
        results[b.name] = {
          name: b.name,
          id: b.id,
          nationality: b.nationality,
          source: b.source,
          status: 'no-results',
          query,
        };
        console.log(`${tag} → no results (query: "${query}")`);
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
        nationality: b.nationality,
        source: b.source,
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
        nationality: b.nationality,
        source: b.source,
        status: 'error',
      };
      console.error(`${tag} → ERROR ${(err as Error).message}`);
    }

    if (processed % SAVE_EVERY === 0) saveResults(results);
  }

  saveResults(results);

  // Build auto-apply list (high confidence)
  const autoApply: Record<string, string> = {};
  for (const r of Object.values(results)) {
    if (r.status === 'matched' && r.autoApply && r.candidates && r.candidates[r.bestIndex ?? 0]) {
      const best = r.candidates[r.bestIndex ?? 0];
      if (best.imageUrl) autoApply[r.name] = best.imageUrl;
    }
  }
  fs.writeFileSync(HIGH_CONF_PATH, JSON.stringify(autoApply, null, 2));

  // Build review HTML
  writeReviewHtml(results);

  // Summary
  let auto = 0, review = 0, none = 0, err = 0;
  for (const r of Object.values(results)) {
    if (r.status === 'no-results') none++;
    else if (r.status === 'error') err++;
    else if (r.autoApply) auto++;
    else review++;
  }
  console.log('\n=== SUMMARY ===');
  console.log(`Auto-apply (trusted source): ${auto}`);
  console.log(`Needs review               : ${review}`);
  console.log(`No results                 : ${none}`);
  console.log(`Errors                     : ${err}`);
  console.log(`Total processed            : ${Object.keys(results).length} / ${missing.length}`);
  console.log(`\nAuto-apply list written to: ${HIGH_CONF_PATH}`);
  console.log(`Full results              : ${RESULTS_PATH}`);
  console.log(`Review page               : file://${REVIEW_HTML_PATH}`);
}

// ---------- Review HTML ----------

function writeReviewHtml(results: Record<string, ResultEntry>) {
  const entries = Object.values(results).filter((r) => r.status === 'matched');
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Photo review</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 1400px; margin: 0 auto; padding: 20px; background: #fafafa; }
  .person { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
  .person h2 { margin: 0 0 4px 0; font-size: 18px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 12px; }
  .candidates { display: flex; gap: 10px; flex-wrap: wrap; }
  .candidate { border: 2px solid transparent; border-radius: 6px; padding: 6px; cursor: pointer; text-align: center; width: 140px; }
  .candidate:hover { border-color: #aaa; }
  .candidate.auto { border-color: #22c55e; }
  .candidate img { width: 120px; height: 120px; object-fit: cover; display: block; }
  .candidate .src { font-size: 11px; color: #555; margin-top: 4px; word-break: break-all; }
  .candidate .score { font-size: 11px; color: #888; }
  .trusted-badge { background: #22c55e; color: white; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
</style>
</head><body>
<h1>Photo review — ${entries.length} candidates</h1>
<p>Green border = auto-apply (trusted domain). Click any image to see it full-size.</p>
${entries
  .map((r) => {
    const cands = (r.candidates || []).slice(0, 6);
    return `
<div class="person">
  <h2>${escapeHtml(r.name)} ${r.autoApply ? '<span class="trusted-badge">AUTO</span>' : ''}</h2>
  <div class="meta">${escapeHtml(r.nationality)} · ${escapeHtml(r.source)} · query: "${escapeHtml(r.query || '')}"</div>
  <div class="candidates">
    ${cands
      .map(
        (c, idx) => `
      <a class="candidate${idx === 0 && r.autoApply ? ' auto' : ''}" href="${escapeHtml(c.imageUrl || '')}" target="_blank" rel="noopener">
        <img src="${escapeHtml(c.thumbnailUrl || c.imageUrl || '')}" loading="lazy">
        <div class="src">${escapeHtml(c.pageDomain || '?')}</div>
        <div class="score">score ${c.score}</div>
      </a>`
      )
      .join('')}
  </div>
</div>`;
  })
  .join('\n')}
</body></html>`;
  fs.writeFileSync(REVIEW_HTML_PATH, html);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
