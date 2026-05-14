/**
 * 길운/흉운 평가 — 대운·세운·월운의 천간/지지를 용신 라벨로 매칭.
 *
 * 룰:
 *   천간 또는 지지 본기가 용신/희신 → 길
 *   기신/구신 → 흉
 *   한신 → 평
 *
 * 천간과 지지가 다르게 평가되면 종합 등급은 천간을 우선 (천간 = 외부 흐름, 지지 = 내부 작용).
 */

import type { CheonGan, JiJi, OHaeng } from '../types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG } from '../constants';

export type LuckGrade = '길' | '평' | '흉';

export interface LuckLabels {
  yongsin: OHaeng;
  huisin: OHaeng;
  hansin: OHaeng;
  gisin: OHaeng;
  gusin: OHaeng;
}

/**
 * 한 천간 또는 지지 오행이 용신 시스템에서 어느 등급인지.
 */
function gradeOfElement(el: OHaeng, labels: LuckLabels): LuckGrade {
  if (el === labels.yongsin || el === labels.huisin) return '길';
  if (el === labels.gisin || el === labels.gusin) return '흉';
  return '평';
}

/**
 * 한 사이클(대운/세운/월운)의 길흉 평가.
 */
export function evaluateLuck(stem: CheonGan, branch: JiJi, labels: LuckLabels): {
  stemGrade: LuckGrade;
  branchGrade: LuckGrade;
  overall: LuckGrade;
} {
  const stemEl = STEM_TO_OHAENG[stem];
  const branchEl = BRANCH_TO_OHAENG[branch];

  const stemGrade = gradeOfElement(stemEl, labels);
  const branchGrade = gradeOfElement(branchEl, labels);

  // 종합: 천간이 길+지지 길 → 길, 둘 다 흉 → 흉, 섞임 → 평
  let overall: LuckGrade;
  if (stemGrade === branchGrade) overall = stemGrade;
  else if (stemGrade === '길' || branchGrade === '길') {
    overall = stemGrade === '흉' || branchGrade === '흉' ? '평' : '길';
  } else {
    overall = '흉';
  }

  return { stemGrade, branchGrade, overall };
}
