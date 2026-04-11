/**
 * Hybrid bio enrichment: Wikipedia extract → GPT-4o-mini → Korean bio.
 *
 * For each billionaire with a weak/placeholder bio, this script:
 *   1. Fetches a longer Wikipedia extract (up to ~500 chars)
 *   2. Feeds it + person metadata to GPT-4o-mini for a concise Korean bio
 *   3. Saves the result to billionaires.json
 *
 * Resumable via scripts/enrich-bio-progress.json.
 *
 * Usage:
 *   source .env.local && npx tsx scripts/enrich-bios.ts
 *
 * Options:
 *   --dry-run     Print what would be done without calling APIs
 *   --limit N     Process at most N people (default: all)
 *   --force       Re-enrich even if bio already looks good
 */

import * as fs from 'fs';
import * as https from 'https';
import * as http from 'http';
import OpenAI from 'openai';

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

const BILLIONAIRES_PATH = 'public/billionaires.json';
const PROGRESS_PATH = 'scripts/enrich-bio-progress.json';

// ---------- CLI args ----------

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// ---------- types ----------

interface Person {
  id: string;
  name: string;
  nameKo?: string;
  birthday: string;
  netWorth: number;
  nationality: string;
  industry: string;
  source?: string;
  bio?: string;
  bioKo?: string;
  wealthOrigin?: string;
  [key: string]: unknown;
}

interface ProgressData {
  done: Record<string, { bioKo: string; bio: string; wikiExtract: string }>;
  failed: Record<string, string>; // id → error message
}

// ---------- progress ----------

function loadProgress(): ProgressData {
  try {
    if (fs.existsSync(PROGRESS_PATH)) {
      return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    }
  } catch {}
  return { done: {}, failed: {} };
}

function saveProgress(progress: ProgressData): void {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

// ---------- HTTP ----------

function httpGet(url: string, maxRedirects = 5): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) { reject(new Error('Too many redirects')); return; }
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'BujasajuBot/1.0 (https://bujasaju.com; bio-enricher)',
        'Accept': 'application/json',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode || 0) && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).toString();
        httpGet(next, maxRedirects - 1).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (c: string) => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ---------- Wikipedia ----------

function generateNameVariations(name: string, nationality: string): string[] {
  const variations = [name];
  const noSuffix = name.replace(/\s+(Jr\.?|Sr\.?|III|II|IV)$/i, '').trim();
  if (noSuffix !== name) variations.push(noSuffix);
  const parts = name.split(' ');
  if (parts.length > 2) {
    variations.push(parts[0] + ' ' + parts[parts.length - 1]);
  }
  const asianNats = ['CN', 'TW', 'HK', 'SG', 'KR', 'JP', 'TH', 'VN', 'MY', 'ID', 'PH'];
  if (asianNats.includes(nationality.toUpperCase()) && parts.length >= 2) {
    const reversed = parts[parts.length - 1] + ' ' + parts.slice(0, -1).join(' ');
    if (!variations.includes(reversed)) variations.push(reversed);
  }
  return [...new Set(variations)];
}

const DISAMBIGUATION = ['', '_(businessman)', '_(entrepreneur)', '_(billionaire)', '_(businessperson)'];

async function fetchWikipediaExtract(name: string, nationality: string): Promise<string | null> {
  const variations = generateNameVariations(name, nationality);

  for (const variant of variations) {
    for (const suffix of DISAMBIGUATION) {
      const title = encodeURIComponent(variant.replace(/ /g, '_') + suffix);
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
      try {
        await new Promise(r => setTimeout(r, 100)); // rate limit
        const data = JSON.parse(await httpGet(url));
        if (data.type === 'standard' && data.extract && data.extract.length > 50) {
          // Basic check: does it look like it's about a person (not a place/film)?
          const lower = data.extract.toLowerCase();
          const personTerms = ['businessman', 'businesswoman', 'billionaire', 'entrepreneur',
            'investor', 'founder', 'executive', 'ceo', 'chairman', 'born', 'is a', 'was a',
            'philanthropist', 'industrialist', 'magnate', 'tycoon', 'heiress', 'heir'];
          if (personTerms.some(t => lower.includes(t))) {
            return data.extract;
          }
        }
      } catch {
        // 404 or network error — try next variation
      }
    }
  }

  // Fallback: Wikipedia search API
  try {
    const q = encodeURIComponent(name);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&srlimit=3`;
    await new Promise(r => setTimeout(r, 100));
    const searchData = JSON.parse(await httpGet(searchUrl));
    const results = searchData?.query?.search;
    if (results?.length) {
      for (const result of results) {
        const title = encodeURIComponent(result.title.replace(/ /g, '_'));
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
        try {
          await new Promise(r => setTimeout(r, 100));
          const data = JSON.parse(await httpGet(url));
          if (data.type === 'standard' && data.extract && data.extract.length > 50) {
            return data.extract;
          }
        } catch {}
      }
    }
  } catch {}

  return null;
}

// ---------- Bio quality check ----------

/** Returns true if the existing bio is a useless Forbes placeholder. */
function isWeakBio(bio: string | undefined): boolean {
  if (!bio) return true;
  if (bio.length < 60) return true;
  const lower = bio.toLowerCase();
  // Forbes placeholders
  if (lower.includes("on forbes'") && lower.includes('billionaires list')) return true;
  if (lower.includes('read more about')) return true;
  if (lower.includes('자세한 내용은 여기에서')) return true;
  return false;
}

function isWeakBioKo(bioKo: string | undefined): boolean {
  if (!bioKo) return true;
  if (bioKo.length < 40) return true;
  if (bioKo.includes('포브스') && bioKo.includes('억만장자 목록')) return true;
  if (bioKo.includes('자세한 내용은 여기에서')) return true;
  return false;
}

// ---------- GPT-4o-mini bio generation ----------

const SYSTEM_PROMPT = `You are writing short Korean bios for a billionaire database website.

Given a person's data and optional Wikipedia extract, write TWO bios:
1. **bio** — English, 1-2 sentences, factual
2. **bioKo** — Korean, 2-3 sentences, factual and approachable

Each bio should cover:
- Who they are (company founded/led, role)
- How they built their wealth (self-made, inherited, key business)
- One distinguishing detail if available

Rules:
- Be factual — only state things grounded in the provided data
- If Wikipedia extract is provided, use it as the primary source
- If no Wikipedia extract, synthesize from name/industry/source/net worth
- Do NOT start with the person's name (the UI already shows it)
- Keep bioKo under 150 chars. Keep bio under 200 chars.
- Net worth numbers are in billions USD
- Respond in JSON format: {"bio": "...", "bioKo": "..."}`;

async function generateBio(person: Person, wikiExtract: string | null): Promise<{ bio: string; bioKo: string }> {
  const userPrompt = `Name: ${person.name}${person.nameKo ? ` (${person.nameKo})` : ''}
Industry: ${person.industry}
Net worth: $${person.netWorth}B
Nationality: ${person.nationality}
Source of wealth: ${person.source || 'Unknown'}
Wealth origin: ${person.wealthOrigin || 'Unknown'}
Existing bio: ${person.bio || 'None'}
Wikipedia extract: ${wikiExtract || 'Not available'}`;

  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 400,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const text = res.choices[0]?.message?.content?.trim() || '{}';
  const parsed = JSON.parse(text);
  return {
    bio: parsed.bio || '',
    bioKo: parsed.bioKo || '',
  };
}

// ---------- main ----------

async function main() {
  console.log('Loading billionaires...');
  const people: Person[] = JSON.parse(fs.readFileSync(BILLIONAIRES_PATH, 'utf8'));
  const progress = loadProgress();

  // Filter to people needing enrichment
  const needsWork = people.filter(p => {
    if (progress.done[p.id]) return false;
    if (FORCE) return true;
    return isWeakBio(p.bio) || isWeakBioKo(p.bioKo);
  });

  console.log(`Total: ${people.length} | Need enrichment: ${needsWork.length} | Already done: ${Object.keys(progress.done).length}`);
  if (DRY_RUN) {
    console.log('\n--- DRY RUN — first 20 needing work: ---');
    for (const p of needsWork.slice(0, 20)) {
      console.log(`  ${p.id}. ${p.name} — bio: "${(p.bio || '').slice(0, 60)}..."`);
    }
    return;
  }

  const toProcess = needsWork.slice(0, LIMIT);
  console.log(`Processing ${toProcess.length} people...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i];
    const pct = ((i + 1) / toProcess.length * 100).toFixed(1);
    process.stdout.write(`[${pct}%] ${i + 1}/${toProcess.length} ${p.name}...`);

    try {
      // Step 1: Wikipedia
      const wikiExtract = await fetchWikipediaExtract(p.name, p.nationality);

      // Step 2: GPT-4o-mini
      const result = await generateBio(p, wikiExtract);

      if (result.bio && result.bioKo) {
        progress.done[p.id] = {
          bio: result.bio,
          bioKo: result.bioKo,
          wikiExtract: wikiExtract || '',
        };
        successCount++;
        console.log(` ✓ (wiki: ${wikiExtract ? 'yes' : 'no'})`);
      } else {
        progress.failed[p.id] = 'Empty response from model';
        failCount++;
        console.log(' ✗ empty response');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      progress.failed[p.id] = msg;
      failCount++;
      console.log(` ✗ ${msg.slice(0, 60)}`);
    }

    // Save every 10 to be safe
    if ((i + 1) % 10 === 0) saveProgress(progress);
  }

  saveProgress(progress);
  console.log(`\nDone! ✓ ${successCount} enriched, ✗ ${failCount} failed`);

  // Step 3: Apply to billionaires.json
  if (successCount > 0) {
    console.log('\nApplying enriched bios to billionaires.json...');
    let applied = 0;
    for (const p of people) {
      const enriched = progress.done[p.id];
      if (!enriched) continue;
      if (isWeakBio(p.bio) && enriched.bio) {
        p.bio = enriched.bio;
        applied++;
      }
      if (isWeakBioKo(p.bioKo) && enriched.bioKo) {
        p.bioKo = enriched.bioKo;
      }
    }
    fs.writeFileSync(BILLIONAIRES_PATH, JSON.stringify(people, null, 2));
    console.log(`Applied ${applied} enriched bios.`);
  }
}

main().catch(console.error);
