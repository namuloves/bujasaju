// Translate every billionaire `bio` field into Korean using Claude.
// Resumable: writes incrementally to scripts/bio-ko-progress.json so reruns
// only translate the entries that are still missing.
//
// Usage:
//   npm install --save-dev @anthropic-ai/sdk
//   export ANTHROPIC_API_KEY=sk-ant-...
//   npx tsx scripts/translate-bios.ts
//
// After it finishes, run:
//   npx tsx scripts/apply-bios-ko.ts
// to merge the translations into src/lib/data/billionaires.ts.

import * as fs from 'fs';
import Anthropic from '@anthropic-ai/sdk';

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/bio-ko-progress.json';

const MODEL = 'claude-sonnet-4-5';
const BATCH_SIZE = 20;        // bios per API call
const CONCURRENCY = 2;        // batches in flight at once (limited by 8K TPM)
const MAX_TOKENS = 3000;      // output tokens per call — generous for 20 KO bios
const MAX_RETRIES = 5;        // per-batch retry attempts on transient errors

interface ProgressFile {
  found: Record<string, string>; // name -> bioKo
}

interface RawEntry {
  name: string;
  bio: string;
}

// ---------- file parsing ----------

function parseEntries(content: string): RawEntry[] {
  const entries: RawEntry[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*\{\s*id:\s*'[^']+'.*\},?\s*$/);
    if (!m) continue;
    const raw = m[0];
    const nameMatch = raw.match(/name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);
    const bioMatch = raw.match(/bio:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);
    if (!nameMatch || !bioMatch) continue;
    const name = nameMatch[1].replace(/\\'/g, "'");
    const bio = bioMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    entries.push({ name, bio });
  }
  return entries;
}

function loadProgress(): ProgressFile {
  if (!fs.existsSync(PROGRESS_PATH)) return { found: {} };
  return JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
}

function saveProgress(p: ProgressFile) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

// ---------- translation ----------

const SYSTEM_PROMPT = `You translate short English biographies of billionaires into natural, neutral Korean.

Rules:
- Output ONLY a JSON object mapping the original English bio (verbatim) to its Korean translation. No prose, no markdown fences.
- Translate company names and brand names using their commonly used Korean form (e.g. Tesla → 테슬라, Google → 구글, Walmart → 월마트). If unknown, keep the original Latin spelling.
- Translate person names to Korean if they are widely known in Korean media (e.g. Elon Musk → 일론 머스크). Otherwise keep the original spelling.
- Use a neutral, factual newspaper register. Do not add or remove information.
- Keep each translated bio to a single sentence when the source is a single sentence.
- Use Korean numerals/units naturally (e.g. "약 6,360억 달러", "포브스에 따르면").
- Keep $ amounts and years intact, just localize the surrounding text.`;

async function translateBatch(
  client: Anthropic,
  batch: RawEntry[]
): Promise<Record<string, string>> {
  const userMessage = `Translate each of the following bios into Korean. Return a JSON object whose keys are the EXACT original English strings and whose values are the Korean translations.

Bios:
${JSON.stringify(batch.map(b => b.bio), null, 2)}`;

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = resp.content
    .filter((c): c is Anthropic.TextBlock => c.type === 'text')
    .map(c => c.text)
    .join('');

  // Strip any accidental markdown fence
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('  ✗ failed to parse JSON response:');
    console.error(cleaned.slice(0, 500));
    throw e;
  }
  return parsed;
}

// ---------- main ----------

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }

  const client = new Anthropic();
  const content = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const allEntries = parseEntries(content);
  console.log(`Parsed ${allEntries.length} entries with bios.`);

  const progress = loadProgress();
  console.log(`Already translated: ${Object.keys(progress.found).length}`);

  // Pending = entries whose name is not yet in progress.found
  const pending = allEntries.filter(e => !(e.name in progress.found));
  console.log(`Pending: ${pending.length}`);

  // Build batches up front
  const batches: RawEntry[][] = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
  }
  const totalBatches = batches.length;
  console.log(`Total batches: ${totalBatches} (concurrency: ${CONCURRENCY})`);

  // Serialize writes to progress.json so concurrent batches don't clobber it
  let saveLock: Promise<void> = Promise.resolve();
  const saveProgressSafely = (): Promise<void> => {
    saveLock = saveLock.then(() => saveProgress(progress));
    return saveLock;
  };

  let nextBatchIdx = 0;
  let completed = 0;

  async function worker(workerId: number) {
    while (true) {
      const idx = nextBatchIdx++;
      if (idx >= batches.length) return;
      const batch = batches[idx];
      const tag = `[batch ${idx + 1}/${totalBatches} w${workerId}]`;

      try {
        const translations = await translateBatch(client, batch);
        let savedThisBatch = 0;
        for (const entry of batch) {
          const ko = translations[entry.bio];
          if (ko && typeof ko === 'string' && ko.trim()) {
            progress.found[entry.name] = ko.trim();
            savedThisBatch++;
          } else {
            console.warn(`${tag} ! no translation for: ${entry.name}`);
          }
        }
        await saveProgressSafely();
        completed++;
        console.log(
          `${tag} saved ${savedThisBatch}/${batch.length} ` +
          `(done ${completed}/${totalBatches}, total ${Object.keys(progress.found).length})`
        );
      } catch (e) {
        console.error(`${tag} ✗ failed: ${(e as Error).message}`);
        // Backoff then re-queue this batch by decrementing the cursor —
        // simpler: just retry this same batch once, then move on if it
        // still fails. To keep things simple, push it back to the end.
        batches.push(batch);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1))
  );
  await saveLock; // ensure final flush

  console.log(`\nDone. Total translated: ${Object.keys(progress.found).length}`);
  console.log('Now run: npx tsx scripts/apply-bios-ko.ts');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
