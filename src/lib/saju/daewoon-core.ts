/**
 * daewoon-core.ts — Pure 대운 calculation, no I/O.
 *
 * The solar terms data is passed in by the caller (server: read from disk,
 * client: fetched over HTTP). Everything else is the same math as the
 * server-only daewoon.ts originally shipped.
 */

import type { CheonGan, JiJi, OHaeng, Gender, SajuResult } from './types';

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

export interface DaeUnPeriod {
  startAge: number;
  endAge: number;
  stem: CheonGan;
  branch: JiJi;
  stemElement: OHaeng;
  branchElement: OHaeng;
  pillar: string;
}

export interface DaeUnResult {
  isForward: boolean;
  startAge: number;
  periods: DaeUnPeriod[];
}

export interface SolarTermsData {
  terms: string[];
  data: Record<string, Array<{ t: number; i: number }>>;
}

function getNextJieTimestamp(data: SolarTermsData, birthTimestamp: number): number | null {
  const birthYear = new Date(birthTimestamp).getFullYear();
  let closest: number | null = null;
  for (const y of [birthYear, birthYear + 1]) {
    const yearData = data.data[String(y)];
    if (!yearData) continue;
    for (const entry of yearData) {
      if (entry.t > birthTimestamp) {
        if (closest === null || entry.t < closest) closest = entry.t;
      }
    }
    if (closest !== null && y === birthYear) break;
  }
  return closest;
}

function getPreviousJieTimestamp(data: SolarTermsData, birthTimestamp: number): number | null {
  const birthYear = new Date(birthTimestamp).getFullYear();
  let closest: number | null = null;
  for (const y of [birthYear, birthYear - 1]) {
    const yearData = data.data[String(y)];
    if (!yearData) continue;
    for (const entry of yearData) {
      if (entry.t <= birthTimestamp) {
        if (closest === null || entry.t > closest) closest = entry.t;
      }
    }
    if (closest !== null && y === birthYear) break;
  }
  return closest;
}

export function isDaeUnForward(yearStem: CheonGan, gender: Gender): boolean {
  const eumyang = STEM_EUMYANG[yearStem];
  if ((eumyang === '양' && gender === 'M') || (eumyang === '음' && gender === 'F')) {
    return true;
  }
  return false;
}

function calculateStartAge(
  solarTerms: SolarTermsData,
  birthday: string,
  yearStem: CheonGan,
  gender: Gender,
): number {
  const birthDate = new Date(birthday + 'T00:00:00+09:00');
  const birthTimestamp = birthDate.getTime();
  const isForward = isDaeUnForward(yearStem, gender);

  const targetTimestamp = isForward
    ? getNextJieTimestamp(solarTerms, birthTimestamp)
    : getPreviousJieTimestamp(solarTerms, birthTimestamp);

  if (targetTimestamp === null) return 5;

  const diffDays = Math.abs(targetTimestamp - birthTimestamp) / (1000 * 60 * 60 * 24);
  const years = Math.floor(diffDays / 3);
  return Math.max(0, Math.min(10, years));
}

export function calculateDaeUn(
  solarTerms: SolarTermsData,
  birthday: string,
  gender: Gender,
  sajuResult: SajuResult,
  maxAge: number = 100,
): DaeUnResult {
  const yearStem = sajuResult.saju.year.stem;
  const monthStem = sajuResult.saju.month.stem;
  const monthBranch = sajuResult.saju.month.branch;

  const isForward = isDaeUnForward(yearStem, gender);
  const startAge = calculateStartAge(solarTerms, birthday, yearStem, gender);

  const monthStemIdx = STEMS.indexOf(monthStem);
  const monthBranchIdx = BRANCHES.indexOf(monthBranch);

  const periods: DaeUnPeriod[] = [];
  let currentAge = startAge;
  let i = 1;
  while (currentAge <= maxAge) {
    const stemIdx = isForward
      ? (monthStemIdx + i) % 10
      : ((monthStemIdx - i) % 10 + 10) % 10;
    const branchIdx = isForward
      ? (monthBranchIdx + i) % 12
      : ((monthBranchIdx - i) % 12 + 12) % 12;

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

export function getDaeUnAtAge(result: DaeUnResult, age: number): DaeUnPeriod | null {
  return result.periods.find(p => age >= p.startAge && age <= p.endAge) ?? null;
}

export function getDaeUnSipSin(dayStem: CheonGan, daeunStem: CheonGan): string {
  const dayElement = STEM_ELEMENT[dayStem];
  const dayYinYang = STEM_EUMYANG[dayStem];
  const daeunElement = STEM_ELEMENT[daeunStem];
  const daeunYinYang = STEM_EUMYANG[daeunStem];
  const sameYinYang = dayYinYang === daeunYinYang;

  if (dayElement === daeunElement) return sameYinYang ? '비견' : '겁재';

  const generates: Record<OHaeng, OHaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
  const controlled: Record<OHaeng, OHaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };

  if (generates[dayElement] === daeunElement) return sameYinYang ? '식신' : '상관';
  if (generates[daeunElement] === dayElement) return sameYinYang ? '편인' : '정인';
  if (controlled[dayElement] === daeunElement) return sameYinYang ? '편재' : '정재';
  if (controlled[daeunElement] === dayElement) return sameYinYang ? '편관' : '정관';

  return '비견';
}
