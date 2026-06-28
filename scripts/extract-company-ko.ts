/**
 * Extract Korean company name(s) for billionaires whose `source` field is
 * a category word (e.g. "Cryptocurrency", "Steel, transport") instead of
 * an actual company name. Writes the result into a new `companyKo` field
 * on enriched-billionaires.json.
 *
 * Run modes:
 *   npx tsx scripts/extract-company-ko.ts            # writes nothing, dry-run prints 10 results
 *   npx tsx scripts/extract-company-ko.ts --batch=10 # run 10 then write back, for QA
 *   npx tsx scripts/extract-company-ko.ts --all      # run for all dirty rows
 *
 * Resumable: any person who already has a companyKo field is skipped.
 *
 * Model: Haiku 4.5 — cheap and plenty smart enough for "extract 1-3 company
 * names from a short bio". ~$0.30 for all ~755 rows.
 */

import { readFile, writeFile } from 'node:fs/promises';
import Anthropic from '@anthropic-ai/sdk';

const ENRICHED = 'public/enriched-billionaires.json';
const MODEL = 'claude-haiku-4-5-20251001';

interface Person {
  id: string;
  name: string;
  nameKo?: string;
  source?: string;
  company?: string;
  industry?: string;
  bio?: string;
  bioKo?: string;
  companyKo?: string;
  [k: string]: unknown;
}

// Heuristic: which rows need re-extraction?
const CATEGORY_WORDS = new Set([
  'Diversified', 'Self Made', 'Inherited',
  'Cryptocurrency', 'Real estate', 'Real Estate', 'Investments',
  'Finance', 'Energy', 'Manufacturing', 'Technology', 'Healthcare',
  'Pharmaceuticals', 'Media', 'Retail', 'Food & Beverage',
  'Construction', 'Telecom', 'Logistics', 'Mining',
]);

function isDirty(p: Person): boolean {
  const s = (p.source ?? p.company ?? '').trim();
  if (!s) return true;
  if (CATEGORY_WORDS.has(s)) return true;
  // "Steel, transport" pattern: short comma-list of lowercased words = category
  if (s.includes(',') && s.length < 30) {
    const parts = s.split(',').map((x) => x.trim());
    // If any part is all-lowercase or a known category word, treat as dirty
    if (parts.some((p) => p === p.toLowerCase() || CATEGORY_WORDS.has(p))) return true;
  }
  if (s.length < 3) return true;
  return false;
}

const PROMPT_SYSTEM = `당신은 부자 인물 데이터에서 대표 회사명을 추출하는 도구이다.

규칙:
- 입력으로 인물의 영문 이름, 한국어 이름, 영문 bio, 기존 source/industry 필드를 받는다.
- 출력은 그 인물이 "만들었거나 소유한 대표 회사명"의 한국어 표기 1~3개를 콤마로 구분한 문자열만 반환한다.
- 일반 명사("Diversified", "Cryptocurrency") 절대 금지.
- 산업 분류("Steel, transport") 절대 금지.
- 한국 인지도가 있는 회사는 한글 표기 ("테슬라", "구글", "넥슨"), 그 외는 영문 그대로 ("NLMK", "Ripple")
- 그룹 보유 시 그룹명 사용 ("Koch Industries" → "코크 인더스트리스")
- 추측하지 말 것 — bio에 명시되지 않은 회사는 포함하지 말 것
- 회사를 특정할 수 없으면 빈 문자열 반환

JSON 같은 wrapper 없이 회사명 텍스트만 출력해라.`;

interface CliFlags {
  all: boolean;
  batch: number;
  dryRun: boolean;
}

function parseFlags(): CliFlags {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const batchArg = args.find((a) => a.startsWith('--batch='));
  const batch = batchArg ? parseInt(batchArg.slice('--batch='.length), 10) : 0;
  const dryRun = !all && batch === 0;
  return { all, batch, dryRun };
}

async function extractFor(client: Anthropic, p: Person): Promise<string> {
  const user = [
    `Name (EN): ${p.name}`,
    `Name (KO): ${p.nameKo ?? '(none)'}`,
    `Existing source: ${p.source ?? '(none)'}`,
    `Existing industry: ${p.industry ?? '(none)'}`,
    `Bio (EN): ${(p.bio ?? '').slice(0, 400)}`,
    `Bio (KO): ${(p.bioKo ?? '').slice(0, 400)}`,
  ].join('\n');

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 80,
    system: PROMPT_SYSTEM,
    messages: [{ role: 'user', content: user }],
  });
  const block = resp.content[0];
  if (block.type !== 'text') return '';
  return block.text.trim();
}

async function main() {
  const flags = parseFlags();
  const raw = await readFile(ENRICHED, 'utf8');
  const people = JSON.parse(raw) as Person[];

  const dirty = people.filter((p) => isDirty(p) && !p.companyKo);
  console.log(`Total people: ${people.length}`);
  console.log(`Dirty (needs extraction): ${dirty.length}`);
  if (flags.dryRun) console.log('(dry-run mode — pass --batch=N or --all to actually call API)');

  const limit = flags.all ? dirty.length : flags.batch || 10;
  const targets = dirty.slice(0, limit);

  const client = new Anthropic();
  const updates: Array<{ id: string; name: string; old: string; companyKo: string }> = [];

  for (let i = 0; i < targets.length; i++) {
    const p = targets[i];
    try {
      const companyKo = await extractFor(client, p);
      updates.push({
        id: p.id,
        name: p.nameKo ?? p.name,
        old: p.source ?? p.industry ?? '',
        companyKo,
      });
      if ((i + 1) % 25 === 0 || i === targets.length - 1) {
        console.log(`[${i + 1}/${targets.length}] ${p.nameKo ?? p.name}: ${p.source} → ${companyKo}`);
      }
    } catch (e) {
      console.warn(`Failed ${p.name}: ${(e as Error).message}`);
    }
  }

  if (flags.dryRun) {
    console.log('\n=== Dry-run results (first 10) ===');
    for (const u of updates.slice(0, 10)) {
      console.log(`  ${u.name}: "${u.old}" → "${u.companyKo}"`);
    }
    return;
  }

  // Apply updates to the file. Use raw-string substitution so we preserve
  // the original single-line JSON formatting (same trick as the email
  // honorific conversion — JSON.stringify would reformat the entire file).
  let out = raw;
  for (const u of updates) {
    if (!u.companyKo) continue;
    // Find the person object and insert companyKo. Each person object has
    // an `"id": "<id>"` marker. Insert after that on the same object.
    // We rebuild the object by re-parsing just to be safe.
    const idMarker = `"id": "${u.id}",`;
    const idx = out.indexOf(idMarker);
    if (idx === -1) {
      console.warn(`Could not locate id ${u.id} in raw file`);
      continue;
    }
    // Insert "companyKo": "..." after the id field. Escape quotes in value.
    const insertion = `"companyKo": ${JSON.stringify(u.companyKo)},`;
    out = out.slice(0, idx + idMarker.length) + insertion + out.slice(idx + idMarker.length);
  }

  await writeFile(ENRICHED, out, 'utf8');
  console.log(`\nWrote ${updates.filter((u) => u.companyKo).length} companyKo fields to ${ENRICHED}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
