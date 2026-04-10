/**
 * Batch-transliterate missing/untranslated nameKo values via GPT-4o-mini.
 *
 * Reads billionaires.json, finds entries where nameKo is missing or === name,
 * sends batches of 40 names to GPT-4o-mini for Korean transliteration, and
 * writes results to scripts/transliterated-names.json for review.
 *
 * Usage:
 *   tsx scripts/transliterate-names.ts
 *
 * After review, apply with:
 *   tsx scripts/apply-transliterated-names.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Person {
  id: string;
  name: string;
  nameKo?: string;
  nationality: string;
}

interface TransliterationResult {
  id: string;
  name: string;
  nationality: string;
  nameKo: string;
}

const BATCH_SIZE = 40;

async function transliterateBatch(
  people: Person[],
): Promise<TransliterationResult[]> {
  const lines = people.map(
    (p) => `${p.id}|${p.name}|${p.nationality}`,
  );

  const prompt = `You are a professional Korean translator specializing in foreign name transliteration (외래어 표기).

For each person below, provide the standard Korean transliteration of their name.

Rules:
- Use the standard 외래어 표기법 (Korean Foreign Loanword Orthography).
- For Chinese names (CN, HK, TW, SG with Chinese names): use the standard Korean reading of the Chinese characters if well-known (e.g., 시진핑, 마윈). For less known names, use the Mandarin pronunciation transliterated into Korean.
- For Japanese names (JP): use the standard Korean reading of kanji if well-known, otherwise transliterate the Japanese pronunciation.
- For Western names: transliterate the pronunciation into Korean (e.g., "Elon Musk" → "일론 머스크").
- For Indian, Thai, Indonesian, Arabic, and other names: transliterate the common pronunciation.
- Keep the SAME name order as the original (given name first or family name first, matching the input).
- If the person is well-known and has an established Korean name in media, use that.

Input format: id|name|nationality
Output format: id|nameKo

ONLY output the id|nameKo lines, nothing else. No explanations.

${lines.join('\n')}`;

  const res = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 4000,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = res.choices[0]?.message?.content ?? '';
  const results: TransliterationResult[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('|');
    if (parts.length < 2) continue;
    const id = parts[0].trim();
    const nameKo = parts[1].trim();
    const person = people.find((p) => p.id === id);
    if (person && nameKo) {
      results.push({
        id,
        name: person.name,
        nationality: person.nationality,
        nameKo,
      });
    }
  }

  return results;
}

async function main() {
  const dataPath = path.join(process.cwd(), 'public', 'billionaires.json');
  const data: Person[] = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const missing = data.filter((p) => !p.nameKo || p.nameKo === p.name);
  console.log(`Found ${missing.length} names to transliterate.`);

  // Load existing progress if any
  const outPath = path.join(process.cwd(), 'scripts', 'transliterated-names.json');
  let existing: TransliterationResult[] = [];
  if (fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    console.log(`Resuming — ${existing.length} already done.`);
  }
  const doneIds = new Set(existing.map((r) => r.id));
  const remaining = missing.filter((p) => !doneIds.has(p.id));
  console.log(`Remaining: ${remaining.length}`);

  if (remaining.length === 0) {
    console.log('All done!');
    return;
  }

  const allResults = [...existing];
  const totalBatches = Math.ceil(remaining.length / BATCH_SIZE);

  for (let i = 0; i < remaining.length; i += BATCH_SIZE) {
    const batch = remaining.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`\nBatch ${batchNum}/${totalBatches} (${batch.length} names)...`);

    try {
      const results = await transliterateBatch(batch);
      allResults.push(...results);
      console.log(`  → Got ${results.length} transliterations`);

      // Save progress after each batch
      fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
      console.log(`  → Saved progress (${allResults.length} total)`);
    } catch (err) {
      console.error(`  ✗ Batch failed:`, err instanceof Error ? err.message : err);
      // Save what we have so far
      fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
      console.log(`  → Saved progress (${allResults.length} total). Re-run to continue.`);
      process.exit(1);
    }

    // Small delay to avoid rate limiting
    if (i + BATCH_SIZE < remaining.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`\nDone! ${allResults.length} transliterations saved to ${outPath}`);
  console.log('Review the file, then run: tsx scripts/apply-transliterated-names.ts');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
