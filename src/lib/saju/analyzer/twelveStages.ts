/**
 * 12운성 — 일간 천간 × 12지지 매트릭스.
 *
 * 양간은 순행, 음간은 역행. 자평진전 표준 표 그대로.
 */

import type { CheonGan, JiJi, Saju } from '../types';

export type TwelveStage =
  | '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠'
  | '병' | '사' | '묘' | '절' | '태' | '양';

const TABLE: Record<CheonGan, Record<JiJi, TwelveStage>> = {
  갑: { 해: '장생', 자: '목욕', 축: '관대', 인: '건록', 묘: '제왕', 진: '쇠', 사: '병', 오: '사', 미: '묘', 신: '절', 유: '태', 술: '양' },
  을: { 오: '장생', 사: '목욕', 진: '관대', 묘: '건록', 인: '제왕', 축: '쇠', 자: '병', 해: '사', 술: '묘', 유: '절', 신: '태', 미: '양' },
  병: { 인: '장생', 묘: '목욕', 진: '관대', 사: '건록', 오: '제왕', 미: '쇠', 신: '병', 유: '사', 술: '묘', 해: '절', 자: '태', 축: '양' },
  정: { 유: '장생', 신: '목욕', 미: '관대', 오: '건록', 사: '제왕', 진: '쇠', 묘: '병', 인: '사', 축: '묘', 자: '절', 해: '태', 술: '양' },
  무: { 인: '장생', 묘: '목욕', 진: '관대', 사: '건록', 오: '제왕', 미: '쇠', 신: '병', 유: '사', 술: '묘', 해: '절', 자: '태', 축: '양' },
  기: { 유: '장생', 신: '목욕', 미: '관대', 오: '건록', 사: '제왕', 진: '쇠', 묘: '병', 인: '사', 축: '묘', 자: '절', 해: '태', 술: '양' },
  경: { 사: '장생', 오: '목욕', 미: '관대', 신: '건록', 유: '제왕', 술: '쇠', 해: '병', 자: '사', 축: '묘', 인: '절', 묘: '태', 진: '양' },
  신: { 자: '장생', 해: '목욕', 술: '관대', 유: '건록', 신: '제왕', 미: '쇠', 오: '병', 사: '사', 진: '묘', 묘: '절', 인: '태', 축: '양' },
  임: { 신: '장생', 유: '목욕', 술: '관대', 해: '건록', 자: '제왕', 축: '쇠', 인: '병', 묘: '사', 진: '묘', 사: '절', 오: '태', 미: '양' },
  계: { 묘: '장생', 인: '목욕', 축: '관대', 자: '건록', 해: '제왕', 술: '쇠', 유: '병', 신: '사', 미: '묘', 오: '절', 사: '태', 진: '양' },
};

// 12단계 → 에너지 점수 (1~12)
const STAGE_ENERGY: Record<TwelveStage, number> = {
  장생: 9, 목욕: 5, 관대: 10, 건록: 11, 제왕: 12, 쇠: 7,
  병: 4, 사: 3, 묘: 2, 절: 1, 태: 6, 양: 8,
};

export interface TwelveStageOfPillar {
  pillar: '년' | '월' | '일' | '시';
  stage: TwelveStage;
  energy: number;
}

/**
 * 일간 기준으로 4기둥 모두의 12운성 라벨 + 에너지 점수.
 */
export function calculateTwelveStages(saju: Saju): TwelveStageOfPillar[] {
  const dayStem = saju.day.stem;
  const out: TwelveStageOfPillar[] = [];

  const branches: Array<['년' | '월' | '일' | '시', JiJi | undefined]> = [
    ['년', saju.year.branch],
    ['월', saju.month.branch],
    ['일', saju.day.branch],
    ['시', saju.hour?.branch],
  ];

  for (const [pillar, branch] of branches) {
    if (!branch) continue;
    const stage = TABLE[dayStem][branch];
    out.push({ pillar, stage, energy: STAGE_ENERGY[stage] });
  }

  return out;
}

/**
 * 단일 천간 × 단일 지지 → 12운성. 대운/세운 평가에 쓰임.
 */
export function getStage(stem: CheonGan, branch: JiJi): TwelveStage {
  return TABLE[stem][branch];
}
