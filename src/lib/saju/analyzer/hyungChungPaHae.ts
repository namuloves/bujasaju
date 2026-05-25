/**
 * 형충파해 (刑沖破害) — 지지(地支)간의 부정적 관계 4종.
 *
 * 한 사주의 4기둥 지지 사이에 발생하는 충돌·갈등 관계를 찾아 표시한다.
 */

import type { JiJi, Saju } from '../types';

export type HyungChungPaHaeKind = '형' | '충' | '파' | '해';

export interface HyungChungPaHaeMatch {
  kind: HyungChungPaHaeKind;
  a: JiJi;
  b: JiJi;
  /** Which pillars are involved, e.g. ["년", "일"]. */
  pillars: ('년' | '월' | '일' | '시')[];
}

// 6충: 자오·축미·인신·묘유·진술·사해
const CHUNG_PAIRS: [JiJi, JiJi][] = [
  ['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해'],
];

// 6파: 자유·축진·인해·묘오·사신·술미
const PA_PAIRS: [JiJi, JiJi][] = [
  ['자', '유'], ['축', '진'], ['인', '해'], ['묘', '오'], ['사', '신'], ['술', '미'],
];

// 6해: 자미·축오·인사·묘진·신해·유술
const HAE_PAIRS: [JiJi, JiJi][] = [
  ['자', '미'], ['축', '오'], ['인', '사'], ['묘', '진'], ['신', '해'], ['유', '술'],
];

// 형(刑):
//   삼형 (3-way): 인사신, 축술미
//   상형 (2-way): 자묘
//   자형 (self): 진진, 오오, 유유, 해해 — 같은 지지가 둘 이상일 때
const HYUNG_TRIPLES: [JiJi, JiJi, JiJi][] = [
  ['인', '사', '신'],
  ['축', '술', '미'],
];
const HYUNG_PAIRS: [JiJi, JiJi][] = [
  ['자', '묘'],
];
const HYUNG_SELF: JiJi[] = ['진', '오', '유', '해'];

function pillarsForBranch(saju: Saju, branch: JiJi): ('년' | '월' | '일' | '시')[] {
  const out: ('년' | '월' | '일' | '시')[] = [];
  if (saju.year.branch === branch) out.push('년');
  if (saju.month.branch === branch) out.push('월');
  if (saju.day.branch === branch) out.push('일');
  if (saju.hour?.branch === branch) out.push('시');
  return out;
}

function hasPair(saju: Saju, a: JiJi, b: JiJi): boolean {
  const branches = [saju.year.branch, saju.month.branch, saju.day.branch, saju.hour?.branch];
  return branches.includes(a) && branches.includes(b);
}

function countBranch(saju: Saju, branch: JiJi): number {
  let n = 0;
  if (saju.year.branch === branch) n++;
  if (saju.month.branch === branch) n++;
  if (saju.day.branch === branch) n++;
  if (saju.hour?.branch === branch) n++;
  return n;
}

export function evaluateHyungChungPaHae(saju: Saju): HyungChungPaHaeMatch[] {
  const out: HyungChungPaHaeMatch[] = [];

  // 충
  for (const [a, b] of CHUNG_PAIRS) {
    if (hasPair(saju, a, b)) {
      out.push({ kind: '충', a, b, pillars: [...pillarsForBranch(saju, a), ...pillarsForBranch(saju, b)] });
    }
  }
  // 파
  for (const [a, b] of PA_PAIRS) {
    if (hasPair(saju, a, b)) {
      out.push({ kind: '파', a, b, pillars: [...pillarsForBranch(saju, a), ...pillarsForBranch(saju, b)] });
    }
  }
  // 해
  for (const [a, b] of HAE_PAIRS) {
    if (hasPair(saju, a, b)) {
      out.push({ kind: '해', a, b, pillars: [...pillarsForBranch(saju, a), ...pillarsForBranch(saju, b)] });
    }
  }
  // 형 — 삼형: 인사신 / 축술미 (둘 중 하나라도 페어가 있으면 매치)
  for (const triple of HYUNG_TRIPLES) {
    const [x, y, z] = triple;
    if (hasPair(saju, x, y)) {
      out.push({ kind: '형', a: x, b: y, pillars: [...pillarsForBranch(saju, x), ...pillarsForBranch(saju, y)] });
    }
    if (hasPair(saju, y, z)) {
      out.push({ kind: '형', a: y, b: z, pillars: [...pillarsForBranch(saju, y), ...pillarsForBranch(saju, z)] });
    }
    if (hasPair(saju, x, z)) {
      out.push({ kind: '형', a: x, b: z, pillars: [...pillarsForBranch(saju, x), ...pillarsForBranch(saju, z)] });
    }
  }
  // 형 — 상형 (자묘)
  for (const [a, b] of HYUNG_PAIRS) {
    if (hasPair(saju, a, b)) {
      out.push({ kind: '형', a, b, pillars: [...pillarsForBranch(saju, a), ...pillarsForBranch(saju, b)] });
    }
  }
  // 형 — 자형 (같은 지지 둘 이상)
  for (const branch of HYUNG_SELF) {
    if (countBranch(saju, branch) >= 2) {
      out.push({ kind: '형', a: branch, b: branch, pillars: pillarsForBranch(saju, branch) });
    }
  }

  return out;
}
