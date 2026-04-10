// Applies whatever is currently in scripts/bio-ko-progress.json into
// src/lib/data/billionaires.ts. Idempotent — skips entries that already have
// a `bioKo:` field.

import * as fs from 'fs';

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';
const PROGRESS_PATH = '/Users/namu_1/sajubuja/scripts/bio-ko-progress.json';

function escapeForSingleQuoted(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

interface BillionaireEntry {
  name: string;
  rawEntry: string;
}

function parseAllEntries(content: string): BillionaireEntry[] {
  const entries: BillionaireEntry[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const m = line.match(/^\s*(\{\s*id:\s*'([^']+)'.*\}),?\s*$/);
    if (!m) continue;
    const rawEntry = m[1];
    const nameMatch = rawEntry.match(/name:\s*'([^'\\]*(?:\\.[^'\\]*)*)'/);
    if (!nameMatch) continue;
    const name = nameMatch[1].replace(/\\'/g, "'");
    entries.push({ name, rawEntry });
  }
  return entries;
}

function main() {
  const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'));
  const found: Record<string, string> = progress.found;

  let content = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  const entries = parseAllEntries(content);
  let writeCount = 0;

  for (const entry of entries) {
    const koBio = found[entry.name];
    if (!koBio) continue;
    if (/\bbioKo:\s*'/.test(entry.rawEntry)) continue;

    // Insert bioKo immediately after the existing bio field. Falls back to
    // appending before the closing brace if no bio field is present.
    const insertion = `, bioKo: '${escapeForSingleQuoted(koBio)}'`;
    let newRaw: string;
    if (/\bbio:\s*'/.test(entry.rawEntry)) {
      newRaw = entry.rawEntry.replace(
        /(bio:\s*'(?:[^'\\]|\\.)*')/,
        `$1${insertion}`
      );
    } else {
      newRaw = entry.rawEntry.replace(/\}$/, insertion + ' }');
    }
    if (newRaw === entry.rawEntry) continue;
    if (content.includes(entry.rawEntry)) {
      content = content.replace(entry.rawEntry, newRaw);
      writeCount++;
    }
  }

  fs.writeFileSync(BILLIONAIRES_PATH, content);
  console.log(`Applied ${writeCount} bioKo translations to billionaires.ts`);
  console.log(`Total in progress: ${Object.keys(found).length}`);
  console.log(`Total entries in file: ${entries.length}`);
}

main();
