#!/usr/bin/env node
// Strip forbidden hanja from deep bio JSON files.
// Per rules in .cowork/billionaire-bio-research.md: "한자 표기 출력 금지".
//
// Patterns handled:
//   - 격국 parenthetical: "정관격(正官格, X)" → "정관격(X)"
//   - 십신 parenthetical: "편관(七殺, X)" → "편관(X)"
//   - 故 (the late): "故 김씨" → "고 김씨"
//   - Chinese-name parens: "본명 수치아피(蘇旭明)" → "본명 수치아피"
//   - 주(州), 신약(身弱) gloss-only parens: drop the parens entirely
//
// Usage:
//   node scripts/strip-hanja-from-bios.js [--ids 462,679,...] [--all-v2] [--dry-run]

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let targetIds = null;
const idsFlag = args.indexOf('--ids');
if (idsFlag !== -1) targetIds = args[idsFlag + 1].split(',');
if (args.includes('--all-v2')) {
  targetIds = fs.readdirSync('public/deep-bios-v2')
    .filter(f => f.endsWith('.json') && !f.startsWith('._'))
    .map(f => f.replace('.json', ''));
}
if (!targetIds) {
  console.error('specify --ids or --all-v2');
  process.exit(1);
}

const HANJA = /[一-鿿]/;
const HANJA_RUN = /[一-鿿]+/g;

function strip(text) {
  let changed = false;
  let out = text;

  // Pattern 1: "<KO>(<HANJA>, <gloss>)" → "<KO>(<gloss>)"
  // Match: 한글 word + ( + hanja + , + space + non-paren content + )
  out = out.replace(
    /([가-힯]+)\(([一-鿿]+),\s*([^()]+)\)/g,
    (m, ko, _hanja, gloss) => {
      changed = true;
      return `${ko}(${gloss})`;
    }
  );

  // Pattern 2: "<KO_or_LATIN>(<HANJA>)" with no comma → just drop the paren
  // e.g. "본명 수치아피(蘇旭明)" → "본명 수치아피"
  //      "Born Su Chia Pi (蘇旭明)" → "Born Su Chia Pi"
  //      "주(州)" → "주"
  out = out.replace(
    /([가-힯ㄱ-ㆎA-Za-z])(\s*)\(([一-鿿]+)\)/g,
    (m, prev, sp) => {
      changed = true;
      return `${prev}${sp}`.trimEnd();
    }
  );

  // Pattern 3: bare 故 → 고
  out = out.replace(/故(?=\s*[가-힯])/g, () => {
    changed = true;
    return '고';
  });
  // Pattern 4: "故 " standalone (e.g. inside name like "故 로스 페로")
  out = out.replace(/(^|[^一-鿿])故(\s)/g, (m, pre, post) => {
    changed = true;
    return `${pre}고${post}`;
  });

  return { text: out, changed };
}

let totalFiles = 0;
let totalChanged = 0;
const stillBad = [];

for (const id of targetIds) {
  const fp = path.join('public/deep-bios-v2', `${id}.json`);
  if (!fs.existsSync(fp)) continue;
  totalFiles++;
  const original = fs.readFileSync(fp, 'utf8');
  if (!HANJA.test(original)) continue;

  const { text: cleaned, changed } = strip(original);
  // Verify it still parses
  try {
    JSON.parse(cleaned);
  } catch (e) {
    console.error(`${id}: would break JSON — ${e.message}`);
    continue;
  }

  if (changed) {
    totalChanged++;
    if (!dryRun) fs.writeFileSync(fp, cleaned);
  }

  // Check for remaining hanja
  const remaining = cleaned.match(HANJA_RUN);
  if (remaining) {
    stillBad.push([id, [...new Set(remaining)].join(', ')]);
  }
}

console.log(`scanned: ${totalFiles}`);
console.log(`${dryRun ? 'would modify' : 'modified'}: ${totalChanged}`);
if (stillBad.length) {
  console.log(`\nfiles with REMAINING hanja (${stillBad.length}):`);
  stillBad.forEach(([id, runs]) => console.log(`  ${id}: ${runs}`));
} else {
  console.log('all hanja removed');
}
