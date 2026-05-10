/**
 * Build deep-bio ID indexes from disk.
 *
 * Scans public/deep-bios/ and public/deep-bios-v2/, extracts IDs from
 * filenames, and writes them to public/deep-bio-index.json.
 *
 * The runtime (src/lib/deepBio.ts) fetches this file at startup so the
 * sync `hasDeepBioSync()` / `hasDeepBioV2Sync()` checks always know
 * exactly which bios exist on disk — no manual ID list maintenance.
 *
 * Run on every build (added to npm run build pipeline).
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const V1_DIR = path.join(ROOT, 'public', 'deep-bios');
const V2_DIR = path.join(ROOT, 'public', 'deep-bios-v2');
const OUTPUT = path.join(ROOT, 'public', 'deep-bio-index.json');

function listIds(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''))
    .filter(id => /^\d+$/.test(id))
    .sort((a, b) => Number(a) - Number(b));
}

const v1 = listIds(V1_DIR);
const v2 = listIds(V2_DIR);

const index = {
  v1,
  v2,
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2) + '\n');

console.log(`✓ Built deep-bio-index.json — v1: ${v1.length}, v2: ${v2.length}`);
