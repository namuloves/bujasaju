/**
 * daewoon.ts — 대운(大運) 계산기
 *
 * 10년 단위로 바뀌는 큰 운의 흐름을 계산합니다.
 *
 * 알고리즘:
 *   1. 순행/역행 판단: 양남음녀(陽男陰女) → 순행, 음남양녀 → 역행
 *   2. 대운 시작 나이: 생일 → 다음(순행) 또는 이전(역행) 절(節)까지의 일수 ÷ 3
 *   3. 대운 기둥: 월주에서 순행이면 +1,+2,+3..., 역행이면 -1,-2,-3...
 *
 * 절기 데이터: public/saju-data/solar-terms-jie.json (1900-2030, MIT licensed from fortuneteller)
 *
 * Reference: https://github.com/hjsh200219/fortuneteller (MIT License)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { CheonGan, JiJi, OHaeng, Gender, SajuResult } from './types';

// ── Constants ────────────────────────────────────────────────────────

const STEMS: CheonGan[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
const BRANCHES: JiJi[] = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];

const STEM_EUMYANG: Record<CheonGan, '양' | '음'> = {
  갑: '양', 을: '음', 병: '양', 정: '음', 무: '양',
  기: '음', 경: '양', 신: '음', 임: '양', 계: '음',
};

const STEM_ELEMENT: Record<CheonGan, OHaeng> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};

const BRANCH_ELEMENT: Record<JiJi, OHaeng> = {
  인: '목', 묘: '목', 사: '화', 오: '화',
  진: '토', 술: '토', 축: '토', 미: '토',
  신: '금', 유: '금', 해: '수', 자: '수',
};

// ── Types ────────────────────────────────────────────────────────────

export interface DaeUnPeriod {
  startAge: number;
  endAge: number;
  stem: CheonGan;
  branch: JiJi;
  stemElement: OHaeng;
  branchElement: OHaeng;
  pillar: string; // e.g. "갑인"
}

export interface DaeUnResult {
  /** 순행(true) or 역행(false) */
  isForward: boolean;
  /** 대운 시작 나이 */
  startAge: number;
  /** 대운 목록 (최대 12개, 120세까지) */
  periods: DaeUnPeriod[];
}

// ── Solar Terms Data ─────────────────────────────────────────────────

interface SolarTermsData {
  terms: string[];
  data: Record<string, Array<{ t: number; i: number }>>;
}

let _solarTerms: SolarTermsData | null = null;

function loadSolarTerms(): SolarTermsData {
  if (_solarTerms) return _solarTerms;
  const filePath = join(process.cwd(), 'public', 'saju-data', 'solar-terms-jie.json');
  _solarTerms = JSON.parse(readFileSync(filePath, 'utf8')) as SolarTermsData;
  return _solarTerms;
}

/**
 * Find the next 절(節) after a given timestamp.
 * Returns the timestamp of that 절, or null if not found.
 */
function getNextJieTimestamp(birthTimestamp: number): number | null {
  const data = loadSolarTerms();
  const birthDate = new Date(birthTimestamp);
  const birthYear = birthDate.getFullYear();

  // Search current year and next year
  let closest: number | null = null;
  for (const y of [birthYear, birthYear + 1]) {
    const yearData = data.data[String(y)];
    if (!yearData) continue;
    for (const entry of yearData) {
      if (entry.t > birthTimestamp) {
        if (closest === null || entry.t < closest) {
          closest = entry.t;
        }
      }
    }
    // If we found one in the birth year, no need to check next year
    if (closest !== null && y === birthYear) break;
  }
  return closest;
}

/**
 * Find the previous 절(節) before a given timestamp.
 */
function getPreviousJieTimestamp(birthTimestamp: number): number | null {
  const data = loadSolarTerms();
  const birthDate = new Date(birthTimestamp);
  const birthYear = birthDate.getFullYear();

  let closest: number | null = null;
  for (const y of [birthYear, birthYear - 1]) {
    const yearData = data.data[String(y)];
    if (!yearData) continue;
    for (const entry of yearData) {
      if (entry.t <= birthTimestamp) {
        if (closest === null || entry.t > closest) {
          closest = entry.t;
        }
      }
    }
    if (closest !== null && y === birthYear) break;
  }
  return closest;
}

// ── Main Functions ───────────────────────────────────────────────────

/**
 * 순행/역행 판단
 * 양남(양년생 남자) / 음녀(음년생 여자) → 순행
 * 음남 / 양녀 → 역행
 */
function isDaeUnForward(yearStem: CheonGan, gender: Gender): boolean {
  const eumyang = STEM_EUMYANG[yearStem];
  if ((eumyang === '양' && gender === 'M') || (eumyang === '음' && gender === 'F')) {
    return true;
  }
  return false;
}

/**
 * 대운 시작 나이 계산 (전통 3일 = 1년 공식)
 */
function calculateStartAge(birthday: string, yearStem: CheonGan, gender: Gender): number {
  const birthDate = new Date(birthday + 'T00:00:00+09:00'); // KST
  const birthTimestamp = birthDate.getTime();
  const isForward = isDaeUnForward(yearStem, gender);

  let targetTimestamp: number | null;
  if (isForward) {
    targetTimestamp = getNextJieTimestamp(birthTimestamp);
  } else {
    targetTimestamp = getPreviousJieTimestamp(birthTimestamp);
  }

  if (targetTimestamp === null) {
    return 5; // fallback default
  }

  const diffMs = Math.abs(targetTimestamp - birthTimestamp);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 3일 = 1년, 내림, 0~10세 제한
  const years = Math.floor(diffDays / 3);
  return Math.max(0, Math.min(10, years));
}

/**
 * 대운 계산 메인 함수
 *
 * @param birthday - YYYY-MM-DD format
 * @param gender - 'M' or 'F'
 * @param sajuResult - 사주 결과 (년주·월주 필요)
 * @param maxAge - 최대 나이 (기본 100)
 */
export function calculateDaeUn(
  birthday: string,
  gender: Gender,
  sajuResult: SajuResult,
  maxAge: number = 100,
): DaeUnResult {
  const yearStem = sajuResult.saju.year.stem;
  const monthStem = sajuResult.saju.month.stem;
  const monthBranch = sajuResult.saju.month.branch;

  const isForward = isDaeUnForward(yearStem, gender);
  const startAge = calculateStartAge(birthday, yearStem, gender);

  const monthStemIdx = STEMS.indexOf(monthStem);
  const monthBranchIdx = BRANCHES.indexOf(monthBranch);

  const periods: DaeUnPeriod[] = [];
  let currentAge = startAge;
  let i = 1;

  while (currentAge <= maxAge) {
    let stemIdx: number;
    let branchIdx: number;

    if (isForward) {
      stemIdx = (monthStemIdx + i) % 10;
      branchIdx = (monthBranchIdx + i) % 12;
    } else {
      stemIdx = ((monthStemIdx - i) % 10 + 10) % 10;
      branchIdx = ((monthBranchIdx - i) % 12 + 12) % 12;
    }

    const stem = STEMS[stemIdx];
    const branch = BRANCHES[branchIdx];

    periods.push({
      startAge: currentAge,
      endAge: currentAge + 9,
      stem,
      branch,
      stemElement: STEM_ELEMENT[stem],
      branchElement: BRANCH_ELEMENT[branch],
      pillar: `${stem}${branch}`,
    });

    currentAge += 10;
    i++;
  }

  return { isForward, startAge, periods };
}

/**
 * 특정 나이의 대운 기간 조회
 */
export function getDaeUnAtAge(result: DaeUnResult, age: number): DaeUnPeriod | null {
  return result.periods.find(p => age >= p.startAge && age <= p.endAge) ?? null;
}

/**
 * 대운 목록을 한국어 텍스트로 포맷
 */
export function formatDaeUnList(result: DaeUnResult, limit: number = 8): string {
  const direction = result.isForward ? '순행' : '역행';
  const lines = result.periods.slice(0, limit).map(p =>
    `${p.startAge}~${p.endAge}세: ${p.pillar} (${p.stemElement}/${p.branchElement})`
  );
  return `대운 ${direction} · 시작 ${result.startAge}세\n${lines.join('\n')}`;
}

/**
 * 대운 기간에 해당하는 십성 계산 (일간 기준)
 */
export function getDaeUnSipSin(dayStem: CheonGan, daeunStem: CheonGan): string {
  const dayElement = STEM_ELEMENT[dayStem];
  const dayYinYang = STEM_EUMYANG[dayStem];
  const daeunElement = STEM_ELEMENT[daeunStem];
  const daeunYinYang = STEM_EUMYANG[daeunStem];
  const sameYinYang = dayYinYang === daeunYinYang;

  // 오행 관계 판단
  if (dayElement === daeunElement) {
    return sameYinYang ? '비견' : '겁재';
  }

  // 상생 관계
  const generates: Record<OHaeng, OHaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
  const controlled: Record<OHaeng, OHaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

  if (generates[dayElement] === daeunElement) {
    return sameYinYang ? '식신' : '상관';
  }
  if (generates[daeunElement] === dayElement) {
    return sameYinYang ? '편인' : '정인';
  }
  if (controlled[dayElement] === daeunElement) {
    return sameYinYang ? '편재' : '정재';
  }
  if (controlled[daeunElement] === dayElement) {
    return sameYinYang ? '편관' : '정관';
  }

  return '비견'; // fallback
}
