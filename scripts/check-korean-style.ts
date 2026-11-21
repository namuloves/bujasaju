/**
 * check-korean-style.ts — guards the Korean register (말투) rules.
 *
 *   npx tsx scripts/check-korean-style.ts           # report, exit 1 on violations
 *   npx tsx scripts/check-korean-style.ts --quiet   # exit code only
 *
 * House style (decided 2026-11):
 *   - UI microcopy (buttons, notices, errors, empty states, paywall, share):
 *     해요체 (~어요/~해요). "~세요" requests and "감사합니다" are fine anywhere.
 *   - Saju content — readings, AI summaries, bios, saju explanations:
 *     합쇼체 (~습니다/~입니다).
 *   - Bullet lists / timeline entries: 개조식 (~함/~음, noun endings) is OK.
 *   - Never 해라체 (~한다/~이다) in user-facing prose. Quotes (어록) are
 *     exempt — they are someone's words.
 *
 * What this checks (cheap, regex-based — sentence-final endings only):
 *   1. Data prose (deep-bios-v2 *Ko fields, bioKo, ilju.json prose fields)
 *      has no 해라체 sentence endings.
 *   2. No single UI string literal in src/ mixes 합쇼체 and 해요체.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const quiet = process.argv.includes('--quiet');
const problems: string[] = [];

const HANGUL = /[가-힣]/;
// Sentence-final word, allowing a trailing (parenthetical), punctuation and quotes.
const FINAL = /([가-힣]+)(?:\s*\([^()]*\))?\s*[.!?…]*["'”’」』)\]]*\s*$/;

function sentences(s: string): string[] {
  return s.split(/(?<=[.!?…])\s+|\n/).map((x) => x.trim()).filter(Boolean);
}

function finalWord(sentence: string): string | null {
  const m = sentence.match(FINAL);
  return m ? m[1] : null;
}

/** ㅂ니다/습니다 — the 니다 is preceded by a syllable with ㅂ 받침. */
function isHapsho(w: string): boolean {
  if (!w.endsWith('니다')) return false;
  if (w.length < 3) return false;
  const code = w.charCodeAt(w.length - 3) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 === 17;
}

// Words ending in 다 that are not predicates (place/brand names, nouns).
const NOT_PREDICATE = new Set([
  '바다', '최다', '캐나다', '플로리다', '프라다', '야마다', '미다', '로다', '케다',
  '슬로보다', '세쿤다', '아라곤다', '글리파다', '하클로바다', '노부타다', '크론키다',
  '볼로그다', '에코스타다', '다다',
]);

function isHaera(w: string): boolean {
  return w.endsWith('다') && !isHapsho(w) && !NOT_PREDICATE.has(w) && w.length >= 2;
}

function isHaeyo(w: string): boolean {
  // ~요 but not ~세요 (requests are allowed in both registers) and not nouns
  // like 필요/중요/개요.
  if (!w.endsWith('요')) return false;
  if (/(세요|필요|중요|개요|주요|수요|요요)$/.test(w)) return false;
  return true;
}

// ── 1. data prose ──────────────────────────────────────────────────────────
const SKIP_KEYS = new Set([
  'nameKo', 'birthPlaceKo', 'typeKo', 'sourceKo', 'industryKo', 'quoteKo', 'titleKo',
  'primaryRevenueKo', 'businessModelKo', 'primaryIncomeSourceKo', 'coreBusinessKo',
  'whoHelpedKo', 'capitalTypeKo', 'companyKo',
]);

function checkProse(label: string, text: string) {
  for (const s of sentences(text)) {
    const w = finalWord(s);
    if (w && isHaera(w)) {
      problems.push(`[해라체] ${label}: …${s.slice(-50)}`);
    }
  }
}

function walkBio(file: string, o: unknown, key: string | null, inQuotes: boolean) {
  if (Array.isArray(o)) {
    for (const v of o) walkBio(file, v, key, inQuotes);
  } else if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o)) walkBio(file, v, k, inQuotes || k === 'quotes');
  } else if (
    typeof o === 'string' &&
    !inQuotes &&
    key &&
    (key.endsWith('Ko') || key === 'sajuConnection') &&
    !SKIP_KEYS.has(key) &&
    HANGUL.test(o)
  ) {
    checkProse(`${file} ${key}`, o);
  }
}

const bioDir = path.join(ROOT, 'private-data', 'deep-bios-v2');
if (fs.existsSync(bioDir)) {
  for (const f of fs.readdirSync(bioDir)) {
    if (!f.endsWith('.json') || f.startsWith('._')) continue;
    walkBio(`deep-bios-v2/${f}`, JSON.parse(fs.readFileSync(path.join(bioDir, f), 'utf8')), null, false);
  }
}

const peopleFile = path.join(ROOT, 'private-data', 'billionaires.json');
if (fs.existsSync(peopleFile)) {
  const people = JSON.parse(fs.readFileSync(peopleFile, 'utf8')) as Array<{ id: string; bioKo?: string }>;
  for (const p of people) if (p.bioKo) checkProse(`billionaires.json #${p.id} bioKo`, p.bioKo);
}

const iljuFile = path.join(ROOT, 'public', 'saju-data', 'ilju.json');
if (fs.existsSync(iljuFile)) {
  const ilju = JSON.parse(fs.readFileSync(iljuFile, 'utf8')) as Array<Record<string, unknown>>;
  for (const e of ilju) {
    for (const k of ['stemDescription', 'branchDescription', 'male', 'female', 'summary']) {
      const v = e[k];
      if (typeof v === 'string') checkProse(`ilju.json ${String(e.id)} ${k}`, v);
    }
  }
}

// ── 2. UI string literals ──────────────────────────────────────────────────
const LITERAL = /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
// AI prompt builders contain example phrases in every register on purpose.
const UI_SKIP = [/src\/app\/api\/saju-(deep-)?summary\//, /src\/app\/api\/send-match-email\//];

function walkSrc(dir: string) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('._')) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkSrc(p);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      const rel = path.relative(ROOT, p);
      if (UI_SKIP.some((re) => re.test(rel))) continue;
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(LITERAL)) {
        const lit = m[1] ?? m[2] ?? m[3] ?? '';
        if (!HANGUL.test(lit)) continue;
        let hapsho = false;
        let haeyo = false;
        for (const s of sentences(lit)) {
          const w = finalWord(s);
          if (!w || w === '감사합니다') continue;
          if (isHapsho(w)) hapsho = true;
          if (isHaeyo(w)) haeyo = true;
        }
        if (hapsho && haeyo) {
          const line = src.slice(0, m.index).split('\n').length;
          problems.push(`[합쇼체+해요체 mixed] ${rel}:${line}: ${lit.slice(0, 80)}`);
        }
      }
    }
  }
}
walkSrc(path.join(ROOT, 'src'));

if (!quiet) {
  for (const p of problems.slice(0, 200)) console.log(p);
  if (problems.length > 200) console.log(`… and ${problems.length - 200} more`);
  console.log(problems.length ? `✗ ${problems.length} Korean style problem(s)` : '✓ Korean style check passed');
}
process.exit(problems.length ? 1 : 0);
