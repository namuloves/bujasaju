/**
 * 사주 fact 통합 빌더.
 *
 * 사주 + 성별 → 모든 분석 결과를 한 객체로.
 * 이 객체가 LLM prompt의 컨텍스트가 되거나 UI 카드의 데이터 소스가 됨.
 */

import type { CheonGan, Saju, SajuResult, Gender, OHaeng } from '../types';
import { calculateDaeUn, getDaeUnSipSin } from '../daewoon';
import { analyzeSaju as analyzeRelationships } from '../relationships';
import { getSipSin } from '../tenGods';
import { getBongi } from '../constants';

import { expandSajuJangan, calculateOhaengWeights, countOhaengSimple } from './jangan';
import { judgeStrength } from './strength';
import { determineGyeokgukFull, countSipsinCategories } from './gyeokguk';
import { determineYongsin } from './yongsin';
import { matchPatterns } from './patterns';
import { evaluateSinsal, categorizeSinsal } from './sinsal';
import { calculateTwelveStages } from './twelveStages';
import { getYearPillar, getMonthPillarsOfYear, getCurrentYearPillar } from './seun';
import { evaluateLuck } from './luckEval';

export interface SajuFacts {
  /** 입력 */
  birthDate: Date;
  gender: Gender;
  saju: Saju;

  /** 1. 4기둥 + 십성 */
  pillars: {
    년: { stem: CheonGan; branch: string; stemSipsin: string; branchSipsin: string };
    월: { stem: CheonGan; branch: string; stemSipsin: string; branchSipsin: string };
    일: { stem: CheonGan; branch: string; stemSipsin: '나'; branchSipsin: string };
    시?: { stem: CheonGan; branch: string; stemSipsin: string; branchSipsin: string };
  };

  /** 2. 지장간 펼침 */
  jangan: ReturnType<typeof expandSajuJangan>;

  /** 3. 오행 분포 (가중치 + 단순 카운트) */
  ohaeng: {
    weighted: Record<string, number>;
    simple: Record<string, number>;
    missing: OHaeng[];
    dominant: OHaeng;
  };

  /** 4. 5카테고리 카운트 */
  categories: ReturnType<typeof countSipsinCategories>;

  /** 5. 강약 */
  strength: ReturnType<typeof judgeStrength>;

  /** 6. 격국 */
  gyeokguk: ReturnType<typeof determineGyeokgukFull>;

  /** 7. 용신 (3학파 + 라벨) */
  yongsin: ReturnType<typeof determineYongsin>;

  /** 8. 십성 조합 패턴 */
  patterns: ReturnType<typeof matchPatterns>;

  /** 9. 합·충·형·파·해 (기존 relationships.ts 결과) */
  relationships: ReturnType<typeof analyzeRelationships>;

  /** 10. 신살 */
  sinsal: {
    matches: ReturnType<typeof evaluateSinsal>;
    counts: Record<string, number>;
  };

  /** 11. 12운성 (4기둥) */
  twelveStages: ReturnType<typeof calculateTwelveStages>;

  /** 12. 대운 사이클 + 길흉 */
  daewoon: {
    cycles: Array<{
      startAge: number;
      endAge: number;
      stem: CheonGan;
      branch: string;
      ganji: string;
      sipsin: string;
      luck: '길' | '평' | '흉';
    }>;
    isForward: boolean;
    startAge: number;
  };

  /** 13. 세운 (현재 연도 + 앞뒤 5년) + 월운 (현재 연도 12달) */
  seun: {
    current: ReturnType<typeof getYearPillar> & { sipsin: string; luck: '길' | '평' | '흉' };
    months: Array<ReturnType<typeof getMonthPillarsOfYear>[number] & { sipsin: string; luck: '길' | '평' | '흉' }>;
  };
}

/**
 * 사주 fact 전체 빌드.
 */
export function buildSajuFacts(
  sajuResult: SajuResult,
  birthDate: Date,
  gender: Gender,
): SajuFacts {
  const { saju } = sajuResult;
  const dayStem = saju.day.stem;

  // 1. 4기둥 + 십성
  const pillars = {
    년: {
      stem: saju.year.stem,
      branch: saju.year.branch,
      stemSipsin: getSipSin(dayStem, saju.year.stem),
      branchSipsin: getSipSin(dayStem, getBongi(saju.year.branch)),
    },
    월: {
      stem: saju.month.stem,
      branch: saju.month.branch,
      stemSipsin: getSipSin(dayStem, saju.month.stem),
      branchSipsin: getSipSin(dayStem, getBongi(saju.month.branch)),
    },
    일: {
      stem: saju.day.stem,
      branch: saju.day.branch,
      stemSipsin: '나' as const,
      branchSipsin: getSipSin(dayStem, getBongi(saju.day.branch)),
    },
    ...(saju.hour ? {
      시: {
        stem: saju.hour.stem,
        branch: saju.hour.branch,
        stemSipsin: getSipSin(dayStem, saju.hour.stem),
        branchSipsin: getSipSin(dayStem, getBongi(saju.hour.branch)),
      },
    } : {}),
  };

  // 2. 지장간
  const jangan = expandSajuJangan(saju);

  // 3. 오행
  const ohaengWeighted = calculateOhaengWeights(saju);
  const ohaengSimple = countOhaengSimple(saju);
  const missing = (Object.entries(ohaengSimple)
    .filter(([, v]) => v === 0)
    .map(([k]) => k) as OHaeng[]);
  const dominant = (Object.entries(ohaengSimple)
    .sort((a, b) => b[1] - a[1])[0][0]) as OHaeng;

  // 4. 5카테고리
  const categories = countSipsinCategories(saju);

  // 5. 강약
  const strength = judgeStrength(saju);

  // 6. 격국
  const gyeokguk = determineGyeokgukFull(saju, categories);

  // 7. 용신
  const yongsin = determineYongsin(saju, strength, gyeokguk.gyeokguk);

  // 8. 패턴
  const patterns = matchPatterns(saju);

  // 9. 관계
  const relationships = analyzeRelationships(sajuResult);

  // 10. 신살
  const sinsalMatches = evaluateSinsal(saju);
  const sinsalCounts = categorizeSinsal(sinsalMatches);

  // 11. 12운성
  const twelveStages = calculateTwelveStages(saju);

  // 12. 대운
  const birthdayStr = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`;
  const daewoonResult = calculateDaeUn(birthdayStr, gender, sajuResult);
  const daewoonCycles = daewoonResult.periods.map(p => {
    const sipsin = getDaeUnSipSin(dayStem, p.stem);
    const eval_ = evaluateLuck(p.stem, p.branch, yongsin.labels);
    return {
      startAge: p.startAge,
      endAge: p.endAge,
      stem: p.stem,
      branch: p.branch,
      ganji: p.pillar,
      sipsin,
      luck: eval_.overall,
    };
  });

  // 13. 세운 + 월운 (현재 연도)
  const currentYear = new Date().getFullYear();
  const currentSeun = getYearPillar(currentYear);
  const currentEval = evaluateLuck(currentSeun.stem, currentSeun.branch, yongsin.labels);
  const months = getMonthPillarsOfYear(currentYear).map(m => {
    const eval_ = evaluateLuck(m.stem, m.branch, yongsin.labels);
    return {
      ...m,
      sipsin: getSipSin(dayStem, m.stem),
      luck: eval_.overall,
    };
  });

  return {
    birthDate,
    gender,
    saju,
    pillars,
    jangan,
    ohaeng: {
      weighted: ohaengWeighted,
      simple: ohaengSimple,
      missing,
      dominant,
    },
    categories,
    strength,
    gyeokguk,
    yongsin,
    patterns,
    relationships,
    sinsal: { matches: sinsalMatches, counts: sinsalCounts },
    twelveStages,
    daewoon: {
      cycles: daewoonCycles,
      isForward: daewoonResult.isForward,
      startAge: daewoonResult.startAge,
    },
    seun: {
      current: { ...currentSeun, sipsin: getSipSin(dayStem, currentSeun.stem), luck: currentEval.overall },
      months,
    },
  };
}

// re-export
export * from './jangan';
export * from './strength';
export * from './yongsin';
export * from './gyeokguk';
export * from './patterns';
export * from './sinsal';
export * from './twelveStages';
export * from './seun';
export * from './luckEval';
