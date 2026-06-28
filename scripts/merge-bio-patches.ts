/**
 * Merge cowork bio cleanup patches into enriched-billionaires.json.
 *
 * Input:  .cowork/bio-cleanup-patches/batch-*.json
 *         Each file is an array of {id, bioKo} objects.
 * Output: bioKo field replaced in enriched-billionaires.json for each
 *         id, preserving the rest of the row untouched.
 *
 * Strategy: parse the whole file as JSON, mutate the rows in memory,
 * then write back. We DO NOT use the raw-substitution trick that the
 * other merge scripts use because bioKo values can be very long and
 * may collide with similar strings elsewhere — JSON parse/serialize
 * is the safe path here. The file will end up reformatted (one row
 * per line of pretty JSON instead of the original single-line), but
 * git diff will still be reviewable since only ~496 fields change.
 *
 * Wait — actually keep single-line if we can. Strategy: load original
 * file as text, parse to find each row's exact substring boundaries
 * via id markers, replace only the "bioKo": "..." pair in place. This
 * keeps formatting + change set scoped to the bioKo field.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ENRICHED = 'public/enriched-billionaires.json';
const PATCH_DIR = '.cowork/bio-cleanup-patches';

interface Patch {
  id: string;
  bioKo: string;
}

/**
 * Find the JSON-escaped value for the given key inside a slice of the
 * raw file text. Returns the [start, end] indices of the value INCLUDING
 * surrounding quotes, or null if not found.
 *
 * The match is intentionally narrow — we look for `"bioKo": "..."` where
 * the closing quote is the first unescaped `"` after the opening one.
 * JSON in this file uses `"key": "value"` style with a space after colon.
 */
function findStringField(text: string, startOffset: number, endOffset: number, key: string): [number, number] | null {
  const needle = `"${key}": "`;
  const idx = text.indexOf(needle, startOffset);
  if (idx === -1 || idx >= endOffset) return null;
  const valStart = idx + needle.length;
  // Walk forward to find the closing unescaped quote.
  let i = valStart;
  while (i < endOffset) {
    const c = text[i];
    if (c === '\\') { i += 2; continue; } // skip escape sequence
    if (c === '"') return [idx + needle.length - 1, i + 1]; // [opening ", closing "+1]
    i++;
  }
  return null;
}

function findRowBounds(text: string, id: string): [number, number] | null {
  const idMarker = `"id": "${id}",`;
  const idx = text.indexOf(idMarker);
  if (idx === -1) return null;
  // Find the enclosing { ... } object. Walk backward from idMarker to find
  // the opening `{`, then walk forward to find matching closing `}`.
  let braceStart = idx;
  while (braceStart > 0 && text[braceStart] !== '{') braceStart--;
  let depth = 0;
  let i = braceStart;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      // skip string literal
      i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += 2; continue; }
        if (text[i] === '"') break;
        i++;
      }
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return [braceStart, i + 1];
    }
    i++;
  }
  return null;
}

async function main() {
  // 1) Collect patches
  const patches = new Map<string, string>();
  const files = (await readdir(PATCH_DIR))
    .filter((f) => f.startsWith('batch-') && f.endsWith('.json'))
    .sort();

  for (const f of files) {
    const arr = JSON.parse(await readFile(join(PATCH_DIR, f), 'utf8')) as Patch[];
    for (const p of arr) {
      if (!p.id || typeof p.bioKo !== 'string') continue;
      patches.set(p.id, p.bioKo);
    }
  }
  console.log(`Patch files: ${files.length}, total rows: ${patches.size}`);

  // 2) Process enriched file
  let text = await readFile(ENRICHED, 'utf8');
  let replaced = 0;
  const misses: string[] = [];
  const noBioKoField: string[] = [];

  for (const [id, newBioKo] of patches) {
    const rowBounds = findRowBounds(text, id);
    if (!rowBounds) {
      misses.push(id);
      continue;
    }
    const [rowStart, rowEnd] = rowBounds;
    const fieldBounds = findStringField(text, rowStart, rowEnd, 'bioKo');
    if (!fieldBounds) {
      // Row exists but no bioKo field — would need to insert. For now log.
      noBioKoField.push(id);
      continue;
    }
    const [valStart, valEnd] = fieldBounds;
    // Replace the field value (including surrounding quotes) with the new
    // JSON-encoded string. JSON.stringify wraps in quotes and escapes
    // exactly as we need.
    const encoded = JSON.stringify(newBioKo);
    text = text.slice(0, valStart) + encoded + text.slice(valEnd);
    replaced++;
  }

  // 3) Verify file still parses
  try {
    JSON.parse(text);
  } catch (e) {
    console.error('Aborting: resulting JSON does not parse', (e as Error).message);
    process.exit(1);
  }

  await writeFile(ENRICHED, text, 'utf8');
  console.log(`Replaced: ${replaced}`);
  if (misses.length) console.warn(`Could not locate ids (${misses.length}): ${misses.slice(0, 10).join(', ')}`);
  if (noBioKoField.length) console.warn(`Row found but no bioKo field (${noBioKoField.length}): ${noBioKoField.slice(0, 10).join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
