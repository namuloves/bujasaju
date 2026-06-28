/**
 * Apply honorific→plain conversion in place. Strategy C:
 *   1) Parse JSON, walk to find every Korean string field (excluding quotes).
 *   2) For each field, compute (original, converted) pair.
 *   3) Read the raw file text; for each pair where original !== converted,
 *      replace the original substring with the converted one in raw text.
 *
 * This preserves the original file formatting (single-line enriched-
 * billionaires.json, indented + blank-lined deep-bios v2) while still
 * letting us skip `quotes` fields.
 *
 * Caveat: if the same original string appears in multiple JSON locations,
 * all of them get replaced. For multi-sentence bios this risk is ~0;
 * for very short repeated phrases inside skipped quotes there's a tiny
 * collision risk. We accept it — manual review will catch any anomaly.
 *
 * Run: npx tsx scripts/honorific-to-plain-apply.ts
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const ENRICHED = join(ROOT, 'public/enriched-billionaires.json');
const DEEP_V1 = join(ROOT, 'public/deep-bios');
const DEEP_V2 = join(ROOT, 'public/deep-bios-v2');

const RULES: Array<[RegExp, string]> = [
  // Honorific-specific verbs first
  [/하셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '했다'],
  [/되셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '됐다'],
  [/이셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  [/태어나셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '태어났다'],
  [/계셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '있었다'],
  [/으셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다'],
  [/셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다'],
  [/하십니다(?=[\s.!?,)」』"'\n]|$)/g, '한다'],
  [/되십니다(?=[\s.!?,)」』"'\n]|$)/g, '된다'],
  [/이십니다(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/계십니다(?=[\s.!?,)」』"'\n]|$)/g, '있다'],
  [/으십니다(?=[\s.!?,)」』"'\n]|$)/g, '는다'],
  [/가십니다(?=[\s.!?,)」』"'\n]|$)/g, '간다'],
  [/오십니다(?=[\s.!?,)」』"'\n]|$)/g, '온다'],
  [/보십니다(?=[\s.!?,)」』"'\n]|$)/g, '본다'],
  [/십니다(?=[\s.!?,)」』"'\n]|$)/g, '신다'],

  // 합쇼체 → 해라체
  [/었습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다'],
  [/았습니다(?=[\s.!?,)」』"'\n]|$)/g, '았다'],
  [/였습니다(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  [/습니다(?=[\s.!?,)」』"'\n]|$)/g, '다'],
  [/입니다(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/갑니다(?=[\s.!?,)」』"'\n]|$)/g, '간다'],
  [/옵니다(?=[\s.!?,)」』"'\n]|$)/g, '온다'],
  [/봅니다(?=[\s.!?,)」』"'\n]|$)/g, '본다'],
  [/줍니다(?=[\s.!?,)」』"'\n]|$)/g, '준다'],

  // 해요체 → 해라체
  [/했어요(?=[\s.!?,)」』"'\n]|$)/g, '했다'],
  [/됐어요(?=[\s.!?,)」』"'\n]|$)/g, '됐다'],
  [/였어요(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  [/이에요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/예요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/에요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/해드려요(?=[\s.!?,)」』"'\n]|$)/g, '한다'],
  [/드려요(?=[\s.!?,)」』"'\n]|$)/g, '드린다'],
];

const SKIP_FIELD_PATH_CONTAINS = ['quotes'];

function convertString(s: string): string {
  let out = s;
  for (const [re, repl] of RULES) {
    out = out.replace(re, repl);
  }
  return out;
}

/** Collect every (original, converted) pair where conversion changes the
 *  string. We only collect from non-quote Korean fields. */
function collectChanges(node: unknown, path: string, pairs: Array<[string, string]>): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => collectChanges(v, `${path}[${i}]`, pairs));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const childPath = path ? `${path}.${k}` : k;
      if (typeof v === 'string' && (k.endsWith('Ko') || k === 'bioKo')) {
        if (SKIP_FIELD_PATH_CONTAINS.some((s) => childPath.includes(s))) continue;
        const converted = convertString(v);
        if (converted !== v) pairs.push([v, converted]);
      } else {
        collectChanges(v, childPath, pairs);
      }
    }
  }
}

/** Escape a string for use inside a JSON string literal. Matches what
 *  JSON.stringify(value).slice(1, -1) produces — i.e. how the substring
 *  will appear inside the raw file. */
function toJsonStringContent(s: string): string {
  return JSON.stringify(s).slice(1, -1);
}

let totalFieldsChanged = 0;

async function processFile(file: string): Promise<boolean> {
  const raw = await readFile(file, 'utf8');
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return false;
  }

  const pairs: Array<[string, string]> = [];
  collectChanges(data, '', pairs);
  if (pairs.length === 0) return false;

  // Sort by length DESC so longer originals get replaced first — prevents a
  // shorter substring from clobbering text inside a longer one we'd also
  // replace later.
  pairs.sort((a, b) => b[0].length - a[0].length);

  let out = raw;
  let appliedCount = 0;
  for (const [orig, conv] of pairs) {
    const origInRaw = toJsonStringContent(orig);
    const convInRaw = toJsonStringContent(conv);
    // Plain string replaceAll — orig is the full field value, so collisions
    // with shorter substrings inside other fields are extremely unlikely.
    if (out.includes(origInRaw)) {
      out = out.split(origInRaw).join(convInRaw);
      appliedCount++;
    }
  }

  if (out === raw) return false;
  await writeFile(file, out, 'utf8');
  totalFieldsChanged += appliedCount;
  return true;
}

async function main() {
  let filesChanged = 0;
  let filesScanned = 0;

  if (await processFile(ENRICHED)) filesChanged++;
  filesScanned++;

  for (const dir of [DEEP_V1, DEEP_V2]) {
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      if (f.startsWith('._')) continue;
      filesScanned++;
      try {
        if (await processFile(join(dir, f))) filesChanged++;
      } catch (e) {
        console.warn(`Failed ${f}: ${(e as Error).message}`);
      }
    }
  }

  console.log(`Scanned ${filesScanned} files, changed ${filesChanged}.`);
  console.log(`Total fields converted: ${totalFieldsChanged}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
