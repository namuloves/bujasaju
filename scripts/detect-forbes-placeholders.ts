/**
 * detect-forbes-placeholders.ts
 *
 * Forbes' image CDN returns a 200 OK with a valid JPEG even for billionaires
 * they don't have a photo of — the response is their tiny grey "F" logo
 * (~2-3 KB). A URL check alone won't catch this; we need to look at
 * content-length. Anything under ~6 KB at 416×416 is almost certainly the
 * placeholder.
 *
 * This script HEADs every forbesimg.com URL in parallel batches and writes
 * the flagged IDs to scripts/forbes-placeholder-ids.json.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const BILLIONAIRES_JSON = path.join(ROOT, 'public', 'billionaires.json');
const OUT = path.join(ROOT, 'scripts', 'forbes-placeholder-ids.json');

const PLACEHOLDER_MAX_BYTES = 6000;
const CONCURRENCY = 20;

interface Billionaire {
  id: string;
  name: string;
  photoUrl?: string;
}

async function headSize(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const len = res.headers.get('content-length');
    return len ? parseInt(len, 10) : null;
  } catch {
    return null;
  }
}

async function main() {
  const all = JSON.parse(fs.readFileSync(BILLIONAIRES_JSON, 'utf8')) as Billionaire[];
  const forbes = all.filter(
    (p) => (p.photoUrl || '').includes('forbesimg.com') || (p.photoUrl || '').includes('imageio.forbes.com'),
  );
  console.log(`Forbes-hosted photos to check: ${forbes.length}`);

  const results: Array<{ id: string; name: string; size: number | null; url: string }> = [];
  let done = 0;

  // Process in batches of CONCURRENCY.
  for (let i = 0; i < forbes.length; i += CONCURRENCY) {
    const batch = forbes.slice(i, i + CONCURRENCY);
    const sizes = await Promise.all(batch.map((p) => headSize(p.photoUrl!)));
    batch.forEach((p, idx) => {
      results.push({ id: p.id, name: p.name, size: sizes[idx], url: p.photoUrl! });
    });
    done += batch.length;
    if (done % 200 === 0 || done === forbes.length) {
      console.log(`  checked ${done}/${forbes.length}`);
    }
  }

  const placeholders = results.filter(
    (r) => r.size !== null && r.size < PLACEHOLDER_MAX_BYTES,
  );
  const unknowns = results.filter((r) => r.size === null);
  const real = results.filter((r) => r.size !== null && r.size >= PLACEHOLDER_MAX_BYTES);

  console.log('\n=== size distribution ===');
  console.log(`placeholders (<${PLACEHOLDER_MAX_BYTES}B): ${placeholders.length}`);
  console.log(`real photos (>=${PLACEHOLDER_MAX_BYTES}B): ${real.length}`);
  console.log(`unknown / HEAD failed: ${unknowns.length}`);

  fs.writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        threshold: PLACEHOLDER_MAX_BYTES,
        placeholderCount: placeholders.length,
        placeholderIds: placeholders.map((p) => p.id),
        placeholders,
      },
      null,
      2,
    ),
  );
  console.log(`\nwrote ${OUT}`);
  console.log('\nsample placeholders:');
  placeholders.slice(0, 10).forEach((p) => console.log(`  ${p.name} (${p.size}B)`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
