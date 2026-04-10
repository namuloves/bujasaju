// Merges a chunk of translations into scripts/bio-ko-progress.json.
//
// Usage:
//   npx tsx scripts/merge-translations.ts scripts/chunks/chunk-001.json
//
// The chunk file must be a JSON object of shape:
//   { "Elon Musk": "일론 머스크는 ...", ... }

import * as fs from 'fs';

const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/bio-ko-progress.json';

function main() {
  const chunkPath = process.argv[2];
  if (!chunkPath) {
    console.error('Usage: npx tsx scripts/merge-translations.ts <chunk.json>');
    process.exit(1);
  }
  if (!fs.existsSync(chunkPath)) {
    console.error(`Chunk file not found: ${chunkPath}`);
    process.exit(1);
  }

  const chunk: Record<string, string> = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
  const chunkCount = Object.keys(chunk).length;

  let progress: { found: Record<string, string> };
  if (fs.existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    if (!progress.found) progress.found = {};
  } else {
    progress = { found: {} };
  }

  let added = 0;
  let overwrote = 0;
  for (const [name, ko] of Object.entries(chunk)) {
    if (!ko || !ko.trim()) continue;
    if (name in progress.found) overwrote++;
    else added++;
    progress.found[name] = ko.trim();
  }

  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2));
  console.log(
    `Merged ${chunkCount} translations from ${chunkPath}: ` +
    `${added} new, ${overwrote} overwritten. Total: ${Object.keys(progress.found).length}`
  );
}

main();
