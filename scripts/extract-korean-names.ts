/**
 * extract-korean-names.ts
 *
 * 3,282 billionaires have a translated Korean bio (bioKo) but no nameKo.
 * The Korean name is almost always the first phrase of the bio — e.g.
 *   "주공산 일가는 포브스 2026년..." → nameKo = "주공산"
 *   "일론 머스크는 블룸버그..."        → nameKo = "일론 머스크"
 *
 * Extracting it by regex is fragile (family suffixes, titles, particles).
 * A single Claude Haiku call per person handles all the edge cases and
 * costs ~$0.0001 per name → under $0.40 for the whole dataset.
 *
 * We batch 20 people per API call to stay fast and cheap. The model
 * returns a JSON array, we slot each result back into the right entry.
 *
 * Resumable: writes to scripts/korean-names-extracted.json after every
 * batch. Rerun safely.
 *
 * Usage:
 *   npx tsx scripts/extract-korean-names.ts
 *   npx tsx scripts/extract-korean-names.ts --limit 40    # test run
 *   npx tsx scripts/extract-korean-names.ts --apply       # patch JSON
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(__dirname, '..');
const BILLIONAIRES_JSON = path.join(ROOT, 'public', 'billionaires.json');
const CACHE_PATH = path.join(ROOT, 'scripts', 'korean-names-extracted.json');

const BATCH_SIZE = 20;

interface Billionaire {
  id: string;
  name: string;
  nameKo?: string;
  bio?: string;
  bioKo?: string;
}

interface CachedName {
  id: string;
  name: string;
  nameKo: string | null; // null if the model couldn't extract
  extractedAt: string;
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(args[LIMIT_IDX + 1] || '0', 10) : 0;

function loadCache(): Record<string, CachedName> {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CachedName>): void {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function buildPrompt(batch: Billionaire[]): string {
  const rows = batch
    .map(
      (p, idx) =>
        `${idx + 1}. English name: ${p.name}\n   Korean bio: ${(p.bioKo || '').slice(0, 200)}`,
    )
    .join('\n\n');

  return `You are extracting the Korean name (한글 이름) of each billionaire from their Korean bio.

For each person below, the Korean bio almost always starts with their Korean name. Extract just the name — the person's name in Hangul — with no titles, particles, or family suffixes.

Rules:
- Return only the actual name characters (e.g. "주공산", "일론 머스크", "베르나르 아르노").
- Strip particles: "주공산 일가는" → "주공산", "일론 머스크는" → "일론 머스크".
- Strip family words: "일가", "가문", "패밀리".
- Strip titles: "회장", "대표", "CEO", "박사".
- If the bio doesn't clearly contain a Korean name at the start, return null.
- Names with spaces (Western names transliterated) must keep the spaces: "베르나르 아르노" not "베르나르아르노".

Return a JSON array with exactly ${batch.length} entries in the same order, each of shape {"i": <1-indexed>, "ko": "<name or null>"}. No other text, no markdown.

People:

${rows}`;
}

async function extractBatch(
  client: Anthropic,
  batch: Billionaire[],
): Promise<(string | null)[]> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1200,
    messages: [{ role: 'user', content: buildPrompt(batch) }],
  });
  const text =
    res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim() ?? '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.warn('[extract] no JSON array in response:', text.slice(0, 200));
    return batch.map(() => null);
  }
  let parsed: Array<{ i: number; ko: string | null }>;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.warn('[extract] JSON parse failed:', (e as Error).message);
    return batch.map(() => null);
  }
  const byIdx = new Map<number, string | null>();
  for (const entry of parsed) {
    if (typeof entry.i === 'number') {
      const ko = entry.ko === null || entry.ko === '' ? null : String(entry.ko).trim();
      byIdx.set(entry.i - 1, ko);
    }
  }
  return batch.map((_, idx) => byIdx.get(idx) ?? null);
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const all = JSON.parse(
    fs.readFileSync(BILLIONAIRES_JSON, 'utf8'),
  ) as Billionaire[];
  const cache = loadCache();

  // Anyone without nameKo who has a bioKo is a candidate. (No bioKo → nothing
  // for the model to work with.)
  const needs = all.filter(
    (p) => !p.nameKo && p.bioKo && p.bioKo.trim().length > 0 && !cache[p.id],
  );
  console.log(`Billionaires needing nameKo extraction: ${needs.length}`);

  const target = LIMIT > 0 ? needs.slice(0, LIMIT) : needs;
  console.log(`Processing: ${target.length} in batches of ${BATCH_SIZE}\n`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let batchNum = 0;
  for (let i = 0; i < target.length; i += BATCH_SIZE) {
    batchNum++;
    const batch = target.slice(i, i + BATCH_SIZE);
    try {
      const names = await extractBatch(client, batch);
      batch.forEach((p, idx) => {
        cache[p.id] = {
          id: p.id,
          name: p.name,
          nameKo: names[idx],
          extractedAt: new Date().toISOString(),
        };
      });
      saveCache(cache);
      const gotCount = names.filter((n) => n !== null).length;
      console.log(
        `batch ${batchNum} (${i + 1}-${i + batch.length}/${target.length}): extracted ${gotCount}/${batch.length}`,
      );
      const sample = batch
        .map((p, idx) => names[idx] && `  ${p.name} → ${names[idx]}`)
        .filter(Boolean)
        .slice(0, 3);
      sample.forEach((s) => console.log(s));
    } catch (err) {
      console.warn(
        `batch ${batchNum} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // Summary
  const cached = Object.values(cache);
  const success = cached.filter((c) => c.nameKo).length;
  console.log('\n=== summary ===');
  console.log(`in cache:        ${cached.length}`);
  console.log(`extracted:       ${success}`);
  console.log(`no Korean name:  ${cached.length - success}`);

  if (APPLY) {
    let applied = 0;
    for (const p of all) {
      const c = cache[p.id];
      if (c?.nameKo && !p.nameKo) {
        p.nameKo = c.nameKo;
        applied++;
      }
    }
    fs.writeFileSync(BILLIONAIRES_JSON, JSON.stringify(all));
    console.log(`\napplied to public/billionaires.json: ${applied}`);
  } else {
    console.log('\n(pass --apply to patch public/billionaires.json)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
