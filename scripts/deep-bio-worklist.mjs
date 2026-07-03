/**
 * Emit the next batch of people who still lack a v2 deep bio.
 *
 * Cross-references public/billionaires.json against the files already in
 * public/deep-bios-v2/ and prints the DB facts for the next N missing people,
 * so a generating agent knows exactly who to write and never re-does someone.
 *
 * Usage:
 *   node scripts/deep-bio-worklist.mjs            # next 10 (human-readable)
 *   node scripts/deep-bio-worklist.mjs 25         # next 25
 *   node scripts/deep-bio-worklist.mjs 25 --json  # machine-readable JSON
 *   node scripts/deep-bio-worklist.mjs --count    # just how many remain
 */

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const peoplePath = path.join(root, 'public', 'billionaires.json');
const v2Dir = path.join(root, 'public', 'deep-bios-v2');

const args = process.argv.slice(2);
const json = args.includes('--json');
const countOnly = args.includes('--count');
const limit = Number(args.find((a) => /^\d+$/.test(a))) || 10;

const people = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));
const done = new Set(
  fs.existsSync(v2Dir)
    ? fs
        .readdirSync(v2Dir)
        .filter((f) => /^\d+\.json$/.test(f))
        .map((f) => f.replace(/\.json$/, ''))
    : [],
);

const missing = people.filter((p) => !done.has(String(p.id)));

if (countOnly) {
  console.log(
    `${missing.length} of ${people.length} people still need a v2 deep bio (${done.size} done).`,
  );
  process.exit(0);
}

const batch = missing.slice(0, limit).map((p) => ({
  id: String(p.id),
  name: p.name,
  nameKo: p.nameKo ?? null,
  birthday: p.birthday ?? null,
  netWorth: p.netWorth ?? null,
  nationality: p.nationality ?? null,
  industry: p.industry ?? null,
  source: p.source ?? null,
  bio: p.bio ?? null,
}));

if (json) {
  console.log(JSON.stringify(batch, null, 2));
  process.exit(0);
}

console.log(
  `# ${missing.length} remaining — next ${batch.length} to write:\n`,
);
for (const p of batch) {
  const facts = [
    p.birthday && `born ${p.birthday}`,
    p.nationality,
    p.industry,
    p.netWorth && `$${p.netWorth}B`,
    p.source && `source: ${p.source}`,
  ]
    .filter(Boolean)
    .join(' · ');
  console.log(`- [${p.id}] ${p.name}${p.nameKo ? ` (${p.nameKo})` : ''}\n    ${facts}`);
}
console.log(
  `\nWrite each to public/deep-bios-v2/<id>.json, then:\n` +
    `  node scripts/validate-deep-bio-v2.mjs ${batch.map((p) => p.id).join(' ')}\n` +
    `  node scripts/build-deep-bio-index.ts`,
);
