/**
 * 신강·신약 판정 — 자평진전 + 적천수 표준.
 *
 * 점수화 안 함. 4 boolean (득령/득지/득시/득세) + 7등급 분류.
 *
 * 득령(得令) — 월지 본기가 일간 입장에서 인성/비겁이면 true
 * 득지(得地) — 일지 본기가 인성/비겁이면 true
 * 득시(得時) — 시지 본기가 인성/비겁이면 true (시주 없으면 null)
 * 득세(得勢) — 일간 제외 사주 8글자 중 인성+비겁 카테고리가 3개 이상이면 true
 */

import type { CheonGan, JiJi, Saju, SipSin } from '../types';
import { getSipSin } from '../tenGods';
import { getBongi } from '../constants';
import { expandSajuJangan } from './jangan';

export type Strength =
  | '극왕' | '태강' | '신강' | '중화신강'
  | '중화' | '중화신약' | '신약' | '태약' | '극약';

export interface StrengthResult {
  /** 4 boolean 지표 */
  deuk: {
    ryeong: boolean;     // 득령
    ji: boolean;         // 득지
    si: boolean | null;  // 득시 (시주 없으면 null)
    se: boolean;         // 득세
  };
  /** 7등급 분류 */
  grade: Strength;
  /** 인성+비겁 카운트 (일간 제외, 천간+지지 본기 8글자 기준) */
  supportCount: number;
  /** 식상+재성+관성 카운트 (일간 제외) */
  drainCount: number;
}

const SUPPORT: Set<SipSin> = new Set(['비견', '겁재', '편인', '정인']);
const DRAIN: Set<SipSin> = new Set(['식신', '상관', '편재', '정재', '편관', '정관']);

/**
 * 일간 X 기준으로 다른 천간 Y가 인성/비겁(서포트)인지 식상/재성/관성(드레인)인지.
 */
function classifyStem(dayStem: CheonGan, otherStem: CheonGan): 'support' | 'drain' {
  const sipsin = getSipSin(dayStem, otherStem);
  return SUPPORT.has(sipsin) ? 'support' : 'drain';
}

/**
 * 강약 판정. 사주에서 일간이 얼마나 강한가.
 */
export function judgeStrength(saju: Saju): StrengthResult {
  const dayStem = saju.day.stem;

  // 1. 득령 — 월지 본기가 인성/비겁이면 true
  const monthBongi = getBongi(saju.month.branch);
  const deukRyeong = classifyStem(dayStem, monthBongi) === 'support';

  // 2. 득지 — 일지 본기가 인성/비겁이면 true
  const dayBongi = getBongi(saju.day.branch);
  const deukJi = classifyStem(dayStem, dayBongi) === 'support';

  // 3. 득시 — 시지 본기가 인성/비겁이면 true (시주 없으면 null)
  let deukSi: boolean | null = null;
  if (saju.hour) {
    const hourBongi = getBongi(saju.hour.branch);
    deukSi = classifyStem(dayStem, hourBongi) === 'support';
  }

  // 4. 득세 — 일간 제외 8글자(천간 + 지지 본기) 중 인성/비겁 카운트
  let supportCount = 0;
  let drainCount = 0;
  const otherStems = [saju.year.stem, saju.month.stem, saju.hour?.stem];
  for (const s of otherStems) {
    if (!s) continue;
    if (classifyStem(dayStem, s) === 'support') supportCount++;
    else drainCount++;
  }
  const branches = [saju.year.branch, saju.month.branch, saju.day.branch, saju.hour?.branch];
  for (const b of branches) {
    if (!b) continue;
    const bongi = getBongi(b);
    if (classifyStem(dayStem, bongi) === 'support') supportCount++;
    else drainCount++;
  }
  const deukSe = supportCount >= 3;

  // 5. 등급 분류 — 4 boolean 조합으로 7등급
  const grade = classifyGrade(deukRyeong, deukJi, deukSe, supportCount, drainCount);

  return {
    deuk: { ryeong: deukRyeong, ji: deukJi, si: deukSi, se: deukSe },
    grade,
    supportCount,
    drainCount,
  };
}

/**
 * 7등급 분류. 자평진전·적천수 표준 매핑:
 *
 * | 등급 | 조건 |
 * |---|---|
 * | 극왕 | 득령+득지+득세 + 비겁/인성 6개+ → 종강격 후보 |
 * | 태강 | 득령+득지+득세 (3지표 모두) |
 * | 신강 | 득령+득세, 실지 / 또는 득령+득지, 실세 |
 * | 중화신강 | 득령만 / 또는 득지+득세, 실령 |
 * | 중화 | 1지표만, support와 drain 균형 |
 * | 중화신약 | 1지표만, drain 우세 |
 * | 신약 | 0지표, drain 5+ |
 * | 태약 | 0지표, support 1개 이하 |
 * | 극약 | support 0개 → 종약격 후보 |
 */
function classifyGrade(
  ryeong: boolean,
  ji: boolean,
  se: boolean,
  support: number,
  drain: number,
): Strength {
  // 극단 케이스 먼저
  if (support === 0) return '극약';
  if (support >= 6) return '극왕';

  const deukCount = (ryeong ? 1 : 0) + (ji ? 1 : 0) + (se ? 1 : 0);

  if (deukCount === 3) return support >= 5 ? '태강' : '신강';
  if (deukCount === 2) {
    if (ryeong) return '신강';            // 득령은 결정적
    return '중화신강';                    // 실령 + 득지 + 득세
  }
  if (deukCount === 1) {
    if (ryeong) return '중화신강';
    return support > drain ? '중화' : '중화신약';
  }
  // deukCount === 0
  if (support >= 2) return '신약';
  return '태약';
}
