// Dumps every billionaire bio that has NOT yet been translated into
// scripts/pending-bios.json for in-conversation translation by Claude.
//
// Usage:
//   npx tsx scripts/dump-pending-bios.ts
//
// Output shape:
//   {
//     "Elon Musk": "Elon Musk is the wealthiest person in the world...",
//     "Larry Page": "Lawrence Edward Page is an American businessman...",
//     ...
//   }

import * as fs from 'fs';

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/bio-ko-progress.json';
const OUTPUT_PATH = '/Users/namu_1/sajubuja/scripts/pending-bios.json';

interface RawEntry {
  name: string;
  bio: string;
}

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

function main() {
  const content = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const all = parseEntries(content);
  console.log(`Parsed ${all.length} entries with bios.`);

  let alreadyDone: Record<string, string> = {};
  if (fs.existsSync(PROGRESS_PATH)) {
    const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
    alreadyDone = progress.found || {};
  }
  console.log(`Already translated: ${Object.keys(alreadyDone).length}`);

  const pending: Record<string, string> = {};
  for (const entry of all) {
    if (!(entry.name in alreadyDone)) {
      pending[entry.name] = entry.bio;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(pending, null, 2));
  console.log(`Wrote ${Object.keys(pending).length} pending bios to ${OUTPUT_PATH}`);
}

main();
