/**
 * Normalize the sentence-ending tone of every Korean field in
 * public/deep-bios-v2/*.json to "~합니다" (formal polite, hapsida-che).
 *
 * Why: bios were authored by different model runs and ended up mixing
 *      ~다 (literary/dictionary) with ~합니다 (formal) on the same page,
 *      which reads inconsistent. We want all Ko text to land on ~합니다.
 *
 * Approach: walk each JSON, collect every string whose key ends in "Ko"
 * (this is the project's convention for Korean fields), batch-send them
 * to Claude with a strict prompt, write the rewritten values back.
 *
 * Safety:
 *   - We only rewrite strings; structure, IDs, English fields, URLs are
 *     untouched.
 *   - The prompt forbids changing facts, numbers, names, sources.
 *   - Each file is atomically written via a tmp file + rename so a crash
 *     mid-run can't corrupt a JSON.
 *   - --dry runs N files and prints diffs without writing.
 *   - --limit N caps the run for cost control.
 *   - A progress file lets us resume across restarts.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... npx tsx scripts/normalize-bio-tone.ts --dry 5
 *   ANTHROPIC_API_KEY=... npx tsx scripts/normalize-bio-tone.ts        # full run
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

const BIOS_DIR = path.resolve(__dirname, '..', 'public', 'deep-bios-v2');
const PROGRESS_PATH = path.resolve(__dirname, 'tone-normalize-progress.json');

// Cheap + fast and plenty good for tone rewrites. If you're paranoid
// about quality, bump to sonnet.
const MODEL = 'claude-haiku-4-5';

// How many strings to bundle into one Claude call. Each string is short
// (1-6 sentences), so 20 fits comfortably under the context budget and
// keeps API costs / latency low. Higher = fewer calls, but raises the
// chance the model drops or merges an item.
const BATCH_SIZE = 20;

interface Progress {
  done: string[]; // list of completed file basenames (e.g. "42.json")
}

function loadProgress(): Progress {
  if (!fs.existsSync(PROGRESS_PATH)) return { done: [] };
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8')) as Progress;
  } catch {
    return { done: [] };
  }
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

/**
 * Walk an arbitrary JSON value and find every (path, string) pair where
 * the leaf key ends in "Ko". We track the path as a sequence of
 * keys/indices so we can write the rewritten value back into the same
 * spot without mutating the rest of the structure.
 */
type Loc = { path: (string | number)[]; value: string };

function collectKoStrings(node: unknown, trail: (string | number)[], out: Loc[]) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectKoStrings(item, [...trail, i], out));
    return;
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      collectKoStrings(v, [...trail, k], out);
    }
    return;
  }
  if (typeof node !== 'string') return;
  const leafKey = trail[trail.length - 1];
  if (typeof leafKey !== 'string') return;
  // Convention: every Korean field name ends in "Ko" (e.g. bioKo,
  // summaryKo, explanationKo). Source URLs, IDs, English text — none
  // of those end in "Ko", so this filter is precise.
  if (!leafKey.endsWith('Ko')) return;
  // Skip empty / pure URL strings just in case.
  if (!node.trim()) return;
  if (/^https?:\/\//i.test(node.trim())) return;
  out.push({ path: trail, value: node });
}

function setAtPath(root: any, p: (string | number)[], value: string) {
  let cur = root;
  for (let i = 0; i < p.length - 1; i++) cur = cur[p[i]];
  cur[p[p.length - 1]] = value;
}

const SYSTEM_PROMPT = `You rewrite short Korean passages so every sentence ends in the formal polite "~합니다 / ~입니다 / ~됩니다" register (hapsida-che).

Rules:
- Convert literary endings like ~다, ~이다, ~했다, ~였다, ~된다, ~한다 to ~합니다 / ~입니다 / ~했습니다 / ~였습니다 / ~됩니다 / ~합니다.
- Leave honorific-already sentences alone.
- DO NOT change facts, numbers, dates, names, places, dollar amounts, Korean transliterations, or quoted text inside parentheses.
- DO NOT add or remove sentences. One input sentence → one output sentence with the new ending.
- DO NOT translate. Keep all English words/quotes as-is.
- Preserve punctuation, line breaks, and any inline markup.
- Noun-phrase fragments without a verb (e.g. "독일 물류기업 쿤과 나겔의 명예 회장") stay as-is — there is nothing to inflect.

Return a JSON array of strings in the EXACT same order as the input. No prose, no markdown fence, just the JSON array.`;

async function rewriteBatch(client: Anthropic, strings: string[]): Promise<string[]> {
  // Tagging each input with an index makes it easy to spot if the model
  // drops or merges one — we verify length on return.
  const payload = strings.map((s, i) => ({ i, text: s }));
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Rewrite the "text" of each item to ~합니다 tone. Return a JSON array of strings, same length and order.\n\n${JSON.stringify(payload)}`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('no text in response');
  const raw = block.text.trim();
  // Tolerate stray markdown fences if the model adds them.
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const arr = JSON.parse(stripped) as string[];
  if (!Array.isArray(arr) || arr.length !== strings.length) {
    throw new Error(`length mismatch: got ${arr.length}, expected ${strings.length}`);
  }
  return arr;
}

function chunks<T>(xs: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
}

async function processFile(client: Anthropic, file: string, dry: boolean): Promise<{ rewrites: number; skipped: number }> {
  const full = path.join(BIOS_DIR, file);
  const json = JSON.parse(fs.readFileSync(full, 'utf8'));
  const locs: Loc[] = [];
  collectKoStrings(json, [], locs);
  if (locs.length === 0) return { rewrites: 0, skipped: 0 };

  let rewrites = 0;
  let skipped = 0;
  for (const batch of chunks(locs, BATCH_SIZE)) {
    const inputs = batch.map((l) => l.value);
    let outputs: string[];
    try {
      outputs = await rewriteBatch(client, inputs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ! batch failed in ${file}: ${msg}. Skipping this batch.`);
      skipped += batch.length;
      continue;
    }
    batch.forEach((loc, i) => {
      const newVal = outputs[i];
      if (typeof newVal !== 'string' || !newVal.trim()) {
        skipped++;
        return;
      }
      if (newVal !== loc.value) {
        if (dry) {
          console.log(`\n  [${file} @ ${loc.path.join('.')}]`);
          console.log(`  - ${loc.value.slice(0, 120)}${loc.value.length > 120 ? '…' : ''}`);
          console.log(`  + ${newVal.slice(0, 120)}${newVal.length > 120 ? '…' : ''}`);
        }
        setAtPath(json, loc.path, newVal);
        rewrites++;
      }
    });
  }

  if (!dry && rewrites > 0) {
    // Atomic write — tmp file + rename, so a crash can't leave half a JSON.
    const tmp = full + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(json, null, 2));
    fs.renameSync(tmp, full);
  }

  return { rewrites, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const dryIdx = args.indexOf('--dry');
  const dry = dryIdx !== -1;
  const dryLimit = dry ? Number(args[dryIdx + 1] ?? '5') : 0;
  const limitIdx = args.indexOf('--limit');
  const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }
  const client = new Anthropic();

  const all = fs
    .readdirSync(BIOS_DIR)
    // Skip macOS AppleDouble metadata files ("._<name>.json") that
    // appear on this volume.
    .filter((f) => f.endsWith('.json') && !f.startsWith('._'))
    .sort();
  const progress = loadProgress();
  const done = new Set(progress.done);

  const queue = (dry ? all.slice(0, dryLimit) : all.filter((f) => !done.has(f))).slice(0, limit);

  console.log(`${dry ? 'DRY' : 'LIVE'} run over ${queue.length} file(s). Already done: ${progress.done.length}/${all.length}.`);

  let totalRewrites = 0;
  let totalSkipped = 0;
  let i = 0;
  for (const file of queue) {
    i++;
    process.stdout.write(`[${i}/${queue.length}] ${file} ... `);
    try {
      const { rewrites, skipped } = await processFile(client, file, dry);
      totalRewrites += rewrites;
      totalSkipped += skipped;
      console.log(`rewrote ${rewrites}, skipped ${skipped}`);
      if (!dry) {
        progress.done.push(file);
        // Save every 5 files so a crash doesn't lose much progress.
        if (i % 5 === 0) saveProgress(progress);
      }
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (!dry) saveProgress(progress);
  console.log(`\nDone. ${totalRewrites} string rewrites, ${totalSkipped} skipped.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
