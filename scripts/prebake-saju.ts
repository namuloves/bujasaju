/**
 * Pre-bake saju calculations into a static JSON file.
 *
 * Run: npx tsx scripts/prebake-saju.ts
 *
 * Reads public/billionaires.json, runs the same enrichment pipeline
 * (de-dup, filter, saju calculation, sort), then writes the result to
 * public/enriched-billionaires.json so the browser never has to run
 * lunar-javascript at load time.
 */

import fs from 'fs';
import path from 'path';

// @ts-ignore
const { Solar } = require('lunar-javascript');

// ---- Types (inline to avoid Next.js client-only imports) ----

type CheonGan = '갑'|'을'|'병'|'정'|'무'|'기'|'경'|'신'|'임'|'계';
type JiJi = '자'|'축'|'인'|'묘'|'진'|'사'|'오'|'미'|'신'|'유'|'술'|'해';
type GyeokGuk =
  | '정관격'|'편관격'|'정재격'|'편재격'
  | '식신격'|'상관격'|'정인격'|'편인격'
  | '건록격'|'양인격';

interface Ju { stem: CheonGan; branch: JiJi; }
interface Saju { year: Ju; month: Ju; day: Ju; hour: Ju | null; }
interface SajuResult { saju: Saju; gyeokguk: GyeokGuk; ilju: string; wolji: JiJi; }

interface Person {
  id: string; name: string; nameKo?: string; birthday: string;
  netWorth: number; nationality: string; industry: string;
  photoUrl: string; gender: 'M'|'F'; source?: string;
  bio?: string; bioKo?: string; wealthOrigin?: string;
}

interface EnrichedPerson extends Person { saju: SajuResult; }

// ---- Saju calculation (mirrors src/lib/saju/index.ts) ----

const HANJA_TO_STEM: Record<string, CheonGan> = {
  '甲':'갑','乙':'을','丙':'병','丁':'정','戊':'무',
  '己':'기','庚':'경','辛':'신','壬':'임','癸':'계',
};
const HANJA_TO_BRANCH: Record<string, JiJi> = {
  '子':'자','丑':'축','寅':'인','卯':'묘','辰':'진','巳':'사',
  '午':'오','未':'미','申':'신','酉':'유','戌':'술','亥':'해',
};

function parsePillar(h: string): Ju {
  return { stem: HANJA_TO_STEM[h[0]], branch: HANJA_TO_BRANCH[h[1]] };
}

// ---- Gyeokguk (mirrors src/lib/saju/gyeokguk.ts) ----

const WOLJI_JANGGAN: Record<JiJi, CheonGan> = {
  '자':'임', '축':'기', '인':'갑', '묘':'을', '진':'무', '사':'병',
  '오':'정', '미':'기', '신':'경', '유':'신', '술':'무', '해':'임',
};

const SIPSIN_TABLE: Record<CheonGan, Record<CheonGan, string>> = {
  '갑': {'갑':'비견','을':'겁재','병':'식신','정':'상관','무':'편재','기':'정재','경':'편관','신':'정관','임':'편인','계':'정인'},
  '을': {'갑':'겁재','을':'비견','병':'상관','정':'식신','무':'정재','기':'편재','경':'정관','신':'편관','임':'정인','계':'편인'},
  '병': {'갑':'편인','을':'정인','병':'비견','정':'겁재','무':'식신','기':'상관','경':'편재','신':'정재','임':'편관','계':'정관'},
  '정': {'갑':'정인','을':'편인','병':'겁재','정':'비견','무':'상관','기':'식신','경':'정재','신':'편재','임':'정관','계':'편관'},
  '무': {'갑':'편관','을':'정관','병':'편인','정':'정인','무':'비견','기':'겁재','경':'식신','신':'상관','임':'편재','계':'정재'},
  '기': {'갑':'정관','을':'편관','병':'정인','정':'편인','무':'겁재','기':'비견','경':'상관','신':'식신','임':'정재','계':'편재'},
  '경': {'갑':'편재','을':'정재','병':'편관','정':'정관','무':'편인','기':'정인','경':'비견','신':'겁재','임':'식신','계':'상관'},
  '신': {'갑':'정재','을':'편재','병':'정관','정':'편관','무':'정인','기':'편인','경':'겁재','신':'비견','임':'상관','계':'식신'},
  '임': {'갑':'식신','을':'상관','병':'편재','정':'정재','무':'편관','기':'정관','경':'편인','신':'정인','임':'비견','계':'겁재'},
  '계': {'갑':'상관','을':'식신','병':'정재','정':'편재','무':'정관','기':'편관','경':'정인','신':'편인','임':'겁재','계':'비견'},
};

function getSipSin(ilgan: CheonGan, target: CheonGan): string {
  return SIPSIN_TABLE[ilgan]?.[target] ?? '';
}

function determineGyeokguk(ilgan: CheonGan, wolji: JiJi): GyeokGuk {
  const janggan = WOLJI_JANGGAN[wolji];
  const sipsin = getSipSin(ilgan, janggan);

  const map: Record<string, GyeokGuk> = {
    '정관': '정관격', '편관': '편관격',
    '정재': '정재격', '편재': '편재격',
    '식신': '식신격', '상관': '상관격',
    '정인': '정인격', '편인': '편인격',
    '비견': '건록격', '겁재': '양인격',
  };
  return map[sipsin] ?? '건록격';
}

function calculateSaju(birthday: Date): SajuResult {
  const y = birthday.getFullYear();
  const m = birthday.getMonth() + 1;
  const d = birthday.getDate();

  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  const yearPillar  = parsePillar(bazi.getYear());
  const monthPillar = parsePillar(bazi.getMonth());
  const dayPillar   = parsePillar(bazi.getDay());

  const gyeokguk = determineGyeokguk(dayPillar.stem, monthPillar.branch);

  return {
    saju: { year: yearPillar, month: monthPillar, day: dayPillar, hour: null },
    gyeokguk,
    ilju: `${dayPillar.stem}${dayPillar.branch}`,
    wolji: monthPillar.branch,
  };
}

function parseBirthday(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ---- nameKoMap (import inline to avoid TS path issues) ----
// We read the compiled JS or re-import via require from the src directly.
// Easiest: just require the ts file via tsx which is already running this.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { nameKoMap } = require('../src/lib/data/nameKoMap');

// ---- Main ----

const ROOT = path.resolve(__dirname, '..');
const INPUT  = path.join(ROOT, 'public', 'billionaires.json');
const OUTPUT = path.join(ROOT, 'public', 'enriched-billionaires.json');

console.log('📖 Reading billionaires.json …');
const raw: Person[] = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
console.log(`   ${raw.length} records found`);

// De-duplicate by name
const unique = raw.filter(
  (p, i, arr) => i === arr.findIndex(q => q.name.toLowerCase() === p.name.toLowerCase())
);
console.log(`   ${unique.length} after de-dup`);

// Filter invalid birthdays
const valid = unique.filter(p => {
  const d = parseBirthday(p.birthday);
  return !isNaN(d.getTime()) && d.getFullYear() > 1900;
});
console.log(`   ${valid.length} with valid birthdays`);

// Enrich: add saju + nameKo, assign sequential id
console.log('⚙️  Calculating saju …');
const enriched: EnrichedPerson[] = valid.map((person, index) => {
  const birthday = parseBirthday(person.birthday);
  const saju = calculateSaju(birthday);
  return {
    ...person,
    nameKo: person.nameKo ?? nameKoMap[person.name],
    id: person.id,
    saju,
  };
});

// Sort by net worth descending
enriched.sort((a, b) => b.netWorth - a.netWorth);

// Write output
console.log(`💾 Writing enriched-billionaires.json … (${enriched.length} records)`);
fs.writeFileSync(OUTPUT, JSON.stringify(enriched), 'utf8');

const sizeKB = Math.round(fs.statSync(OUTPUT).size / 1024);
console.log(`✅ Done — ${sizeKB} KB written to public/enriched-billionaires.json`);
