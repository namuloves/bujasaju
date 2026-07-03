/**
 * Emit v2 deep bios that EXIST but FAIL validation — the repair worklist.
 *
 * Complements deep-bio-worklist.mjs (which lists people with NO bio yet).
 * This lists people whose bio file is present but doesn't meet the v2 schema,
 * so a runner can regenerate/repair them with the same loop.
 *
 * A bio is "broken" here if scripts/validate-deep-bio-v2.mjs reports any
 * `error:` for it. Repair = rewrite the file to full v2 schema (research as
 * needed); do NOT invent facts to fill required Korean fields.
 *
 * Usage:
 *   node scripts/deep-bio-broken.mjs --count      # how many are broken
 *   node scripts/deep-bio-broken.mjs 15           # next 15 (human-readable)
 *   node scripts/deep-bio-broken.mjs 15 --json    # machine-readable, with facts
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const json = args.includes('--json');
const countOnly = args.includes('--count');
const limit = Number(args.find((a) => /^\d+$/.test(a))) || 10;

const people = JSON.parse(
  fs.readFileSync(path.join(root, 'public', 'billionaires.json'), 'utf8'),
);
const byId = new Map(people.map((p) => [String(p.id), p]));

// Run the validator over the whole set; collect ids that print a FAIL line.
let out = '';
try {
  out = execSync('node scripts/validate-deep-bio-v2.mjs', {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (e) {
  // validator exits non-zero when any file fails — that's expected; use stdout.
  out = e.stdout || '';
}

const brokenIds = out
  .split('\n')
  .filter((l) => l.startsWith('FAIL '))
  .map((l) => l.replace(/^FAIL\s+/, '').replace(/\.json.*$/, '').trim())
  .filter((id) => /^\d+$/.test(id));

if (countOnly) {
  console.log(`${brokenIds.length} existing v2 bios fail validation and need repair.`);
  process.exit(0);
}

const batch = brokenIds.slice(0, limit).map((id) => {
  const p = byId.get(id) || {};
  return {
    id,
    name: p.name ?? null,
    nameKo: p.nameKo ?? null,
    birthday: p.birthday ?? null,
    netWorth: p.netWorth ?? null,
    nationality: p.nationality ?? null,
    industry: p.industry ?? null,
    source: p.source ?? null,
  };
});

if (json) {
  console.log(JSON.stringify(batch, null, 2));
  process.exit(0);
}

console.log(`# ${brokenIds.length} broken — next ${batch.length} to repair:\n`);
for (const p of batch) {
  const facts = [p.birthday && `born ${p.birthday}`, p.nationality, p.industry, p.source]
    .filter(Boolean)
    .join(' · ');
  console.log(`- [${p.id}] ${p.name ?? '(unknown)'}${p.nameKo ? ` (${p.nameKo})` : ''}\n    ${facts}`);
}
console.log(
  `\nRewrite each to full v2 schema at public/deep-bios-v2/<id>.json, then:\n` +
    `  node scripts/validate-deep-bio-v2.mjs ${batch.map((p) => p.id).join(' ')}\n` +
    `  node scripts/build-deep-bio-index.ts`,
);
