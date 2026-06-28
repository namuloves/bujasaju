/**
 * Dry-run: scan all Korean bio fields in
 *   - public/enriched-billionaires.json
 *   - public/deep-bios/*.json
 *   - public/deep-bios-v2/*.json
 * apply polite→plain (해요체/합쇼체 → 해라체) regex rules, and emit:
 *   - .scratch/honorific-conversion-preview.txt   — sample diffs (first N per pattern)
 *   - .scratch/honorific-conversion-stats.json    — pattern counts + suspicious cases
 *
 * Writes nothing back to source files. Run with: npx tsx scripts/honorific-to-plain-dryrun.ts
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = process.cwd();
const ENRICHED = join(ROOT, 'public/enriched-billionaires.json');
const DEEP_V1 = join(ROOT, 'public/deep-bios');
const DEEP_V2 = join(ROOT, 'public/deep-bios-v2');
const OUT_DIR = join(ROOT, '.scratch');

// Order matters: longer/more-specific patterns first so they win over short ones.
// Each rule is [regex, replacement, label].
// All regexes assume the verb ending sits at a word boundary — Korean has no
// spaces inside conjugations, so we anchor on the following char (punctuation
// or sentence end) instead.
const RULES: Array<[RegExp, string, string]> = [
  // ─── 존칭 제거 (honorific stripping) ────────────────────────────────────
  // Run BEFORE general 습니다→다 so honorific forms are caught at their full
  // length. Past honorific: ~으셨습니다 / ~셨습니다 → 으셨다/셨다 is still
  // honorific — we strip the honorific marker too so it becomes plain past.
  // 으셨습니다 → 으셨다 → (strip 으시) → 었다  e.g. 받으셨습니다 → 받았다? No.
  // Simpler/safer: map honorific past+politeness directly to plain past.
  //   받으셨습니다 → 받았다   (받-+으시-+었-+습니다 → 받-+았-+다)
  //   태어나셨습니다 → 태어났다  (나- vowel-final stem, 시+었 → 셨 → 았/었 by stem)
  //   하셨습니다 → 했다
  //   계셨습니다 → 있었다? (계시- is suppletive — leave honorific marker if ambiguous)
  // Rule of thumb: 셨/으셨 just becomes ~았/었 form of the stem. We can't do
  // that with regex without knowing stem vowel harmony. Compromise:
  // strip the 시 honorific by mapping 셨다 → 했다? No, only for 하-.
  //
  // Pragmatic approach — handle the most common verbs explicitly, then fall
  // back to generic 셨습니다→었다 (loses honorific, vowel may be slightly off
  // for ㅏ-stems but the result is still grammatical past tense).
  //
  // Specific honorific past forms first:
  [/하셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '했다', '하셨습니다→했다'],
  [/되셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '됐다', '되셨습니다→됐다'],
  [/이셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '였다', '이셨습니다→였다'],
  [/태어나셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '태어났다', '태어나셨습니다→태어났다'],
  [/계셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '있었다', '계셨습니다→있었다'],
  // Generic 으셨습니다 / 셨습니다 → 었다 (loses honorific marker;
  // vowel harmony may be imperfect but result is grammatical)
  [/으셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다', 'V으셨습니다→V었다(존칭제거)'],
  [/셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다', 'V셨습니다→V었다(존칭제거)'],
  // Honorific present → plain present
  [/하십니다(?=[\s.!?,)」』"'\n]|$)/g, '한다', '하십니다→한다'],
  [/되십니다(?=[\s.!?,)」』"'\n]|$)/g, '된다', '되십니다→된다'],
  [/이십니다(?=[\s.!?,)」』"'\n]|$)/g, '이다', '이십니다→이다'],
  [/계십니다(?=[\s.!?,)」』"'\n]|$)/g, '있다', '계십니다→있다'],
  // Generic 으십니다 / 십니다 → ㄴ다 (strip 시)
  // 받으십니다 → 받는다, 평가받으십니다 → 평가받는다 (consonant stem → 는다)
  // 가십니다 → 간다 (vowel stem → ㄴ다) — too ambiguous for regex.
  // Safer: 으십니다 → 는다 (assumes consonant stem, which 으- prefix implies)
  [/으십니다(?=[\s.!?,)」』"'\n]|$)/g, '는다', 'V으십니다→V는다(존칭제거)'],
  // 십니다 without 으 — assume vowel stem → ㄴ다.
  // 가십니다 → 간다, 오십니다 → 온다, 보십니다 → 본다
  // 사용하십니다 → 사용한다 (하-+십니다 already caught above by 하십니다 rule)
  // For other vowel stems, we strip 십니다 → ㄴ다 by replacing the syllable.
  // Easiest: map 십니다 → ㄴ다 via lookbehind to grab the preceding vowel syllable.
  // But JS lookbehind for Hangul is messy. Just enumerate common cases:
  [/가십니다(?=[\s.!?,)」』"'\n]|$)/g, '간다', '가십니다→간다'],
  [/오십니다(?=[\s.!?,)」』"'\n]|$)/g, '온다', '오십니다→온다'],
  [/보십니다(?=[\s.!?,)」』"'\n]|$)/g, '본다', '보십니다→본다'],
  // Fallback: any remaining 십니다 → 신다 (less natural but grammatical; will
  // be small enough to manually fix)
  [/십니다(?=[\s.!?,)」』"'\n]|$)/g, '신다', 'V십니다→V신다(잔존)'],

  // ─── 합쇼체 (formal polite) → 해라체 (plain) ────────────────────────────
  [/었습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다', 'V었습니다→V었다'],
  [/았습니다(?=[\s.!?,)」』"'\n]|$)/g, '았다', 'V았습니다→V았다'],
  [/였습니다(?=[\s.!?,)」』"'\n]|$)/g, '였다', 'V였습니다→V였다'],
  [/습니다(?=[\s.!?,)」』"'\n]|$)/g, '다', 'V습니다→V다'],
  [/입니다(?=[\s.!?,)」』"'\n]|$)/g, '이다', 'N입니다→N이다'],
  [/갑니다(?=[\s.!?,)」』"'\n]|$)/g, '간다', '갑니다→간다'],
  [/옵니다(?=[\s.!?,)」』"'\n]|$)/g, '온다', '옵니다→온다'],
  [/봅니다(?=[\s.!?,)」』"'\n]|$)/g, '본다', '봅니다→본다'],
  [/줍니다(?=[\s.!?,)」』"'\n]|$)/g, '준다', '줍니다→준다'],

  // ─── 해요체 (informal polite) → 해라체 ──────────────────────────────────
  // These mostly appear in template strings (해드려요) since data quotes
  // are excluded from conversion.
  [/했어요(?=[\s.!?,)」』"'\n]|$)/g, '했다', '했어요→했다'],
  [/됐어요(?=[\s.!?,)」』"'\n]|$)/g, '됐다', '됐어요→됐다'],
  [/였어요(?=[\s.!?,)」』"'\n]|$)/g, '였다', '였어요→였다'],
  [/이에요(?=[\s.!?,)」』"'\n]|$)/g, '이다', '이에요→이다'],
  [/예요(?=[\s.!?,)」』"'\n]|$)/g, '이다', '예요→이다'],
  [/에요(?=[\s.!?,)」』"'\n]|$)/g, '이다', '에요→이다'],
  [/해드려요(?=[\s.!?,)」』"'\n]|$)/g, '한다', '해드려요→한다'],
  [/드려요(?=[\s.!?,)」』"'\n]|$)/g, '드린다', '드려요→드린다'],
];

// Fields to skip entirely: quotes preserve the original speaker's voice.
// Path matches use substring containment so this catches quotes[N].textKo,
// quotes[N].contextKo, etc.
const SKIP_FIELD_PATH_CONTAINS = ['quotes'];

// Patterns that warrant a human eyeball even though regex *can* convert them.
// We emit these into a separate "suspicious" bucket in the stats file.
const SUSPICIOUS: Array<[RegExp, string]> = [
  [/[가-힣]+습니까\??/g, '의문문 (-습니까?)'],
  [/[가-힣]+십니까\??/g, '존댓말 의문문 (-십니까?)'],
  [/[가-힣]+ㅂ니까\??/g, 'ㅂ니까 의문문'],
  // Imperatives — should never appear in bios but worth knowing
  [/[가-힣]+십시오/g, '명령형 (-십시오)'],
  [/[가-힣]+세요/g, '명령형/존칭 (-세요)'],
];

interface Sample {
  file: string;
  fieldPath: string;
  before: string;
  after: string;
}

const stats: Record<string, number> = {};
const samples: Record<string, Sample[]> = {};
const suspicious: Array<{ file: string; fieldPath: string; match: string; reason: string; context: string }> = [];
const MAX_SAMPLES_PER_RULE = 5;

function recordSample(label: string, sample: Sample) {
  if (!samples[label]) samples[label] = [];
  if (samples[label].length < MAX_SAMPLES_PER_RULE) samples[label].push(sample);
}

function convertString(s: string, file: string, fieldPath: string): string {
  let out = s;
  for (const [re, repl, label] of RULES) {
    const matches = out.match(re);
    if (!matches) continue;
    stats[label] = (stats[label] ?? 0) + matches.length;
    // Capture sample context (~60 chars around first match) before mutating.
    if (!samples[label] || samples[label].length < MAX_SAMPLES_PER_RULE) {
      const idx = out.search(re);
      const start = Math.max(0, idx - 30);
      const end = Math.min(out.length, idx + 60);
      const beforeCtx = out.slice(start, end);
      const afterCtx = beforeCtx.replace(re, repl);
      recordSample(label, { file, fieldPath, before: beforeCtx, after: afterCtx });
    }
    out = out.replace(re, repl);
  }
  for (const [re, reason] of SUSPICIOUS) {
    const matches = s.matchAll(re);
    for (const m of matches) {
      if (suspicious.length >= 200) break;
      const idx = m.index ?? 0;
      const start = Math.max(0, idx - 25);
      const end = Math.min(s.length, idx + 50);
      suspicious.push({ file, fieldPath, match: m[0], reason, context: s.slice(start, end) });
    }
  }
  return out;
}

// Recursively walk JSON, applying convertString to every string value whose
// key ends in "Ko" OR (for enriched-billionaires.json) is named "bioKo".
// We deliberately skip non-Ko fields so we don't corrupt English text.
function walk(node: unknown, file: string, path: string): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, file, `${path}[${i}]`));
    return;
  }
  if (typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      const childPath = path ? `${path}.${k}` : k;
      if (typeof v === 'string' && (k.endsWith('Ko') || k === 'bioKo')) {
        if (SKIP_FIELD_PATH_CONTAINS.some((s) => childPath.includes(s))) continue;
        convertString(v, file, childPath);
      } else {
        walk(v, file, childPath);
      }
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // 1) enriched-billionaires.json
  {
    const raw = await readFile(ENRICHED, 'utf8');
    const data = JSON.parse(raw) as unknown[];
    data.forEach((row, i) => walk(row, 'enriched-billionaires.json', `[${i}]`));
  }

  // 2) deep-bios/*.json
  for (const dir of [DEEP_V1, DEEP_V2]) {
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const raw = await readFile(join(dir, f), 'utf8');
      try {
        const data = JSON.parse(raw);
        walk(data, `${dir.split('/').slice(-1)[0]}/${f}`, '');
      } catch (e) {
        console.warn(`Skipping ${f}: ${(e as Error).message}`);
      }
    }
  }

  // Emit preview
  const lines: string[] = [];
  lines.push('# Honorific → Plain conversion: dry-run preview\n');
  lines.push(`Total rules applied: ${Object.values(stats).reduce((a, b) => a + b, 0)}\n`);
  lines.push('## Pattern counts\n');
  const sortedStats = Object.entries(stats).sort((a, b) => b[1] - a[1]);
  for (const [label, n] of sortedStats) {
    lines.push(`- **${label}**: ${n.toLocaleString()} occurrences`);
  }
  lines.push('\n## Sample diffs (up to 5 per pattern)\n');
  for (const [label, n] of sortedStats) {
    lines.push(`\n### ${label} (${n})\n`);
    for (const s of samples[label] ?? []) {
      lines.push(`- \`${s.file}\` :: \`${s.fieldPath}\``);
      lines.push(`  - before: …${s.before}…`);
      lines.push(`  - after:  …${s.after}…`);
    }
  }
  lines.push('\n## Suspicious cases (need manual review)\n');
  if (suspicious.length === 0) {
    lines.push('_(none found)_');
  } else {
    lines.push(`${suspicious.length} flagged (showing first 50):\n`);
    for (const s of suspicious.slice(0, 50)) {
      lines.push(`- **${s.reason}** \`${s.match}\` in \`${s.file}\` :: \`${s.fieldPath}\``);
      lines.push(`  - context: …${s.context}…`);
    }
  }

  await writeFile(join(OUT_DIR, 'honorific-conversion-preview.md'), lines.join('\n'));
  await writeFile(
    join(OUT_DIR, 'honorific-conversion-stats.json'),
    JSON.stringify({ stats, suspiciousCount: suspicious.length }, null, 2),
  );

  console.log('Done. See .scratch/honorific-conversion-preview.md');
  console.log('Total replacements:', Object.values(stats).reduce((a, b) => a + b, 0));
  console.log('Suspicious cases:', suspicious.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
