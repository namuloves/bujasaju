/**
 * 격국 결정 — 한국 명리 통설 (월간 투간 우선).
 *
 * 통설 절차:
 *   1. 변격(종격) 검사 먼저.
 *   2. 월지가 일간의 록지/양인지면 → 건록격/양인격 (특수격).
 *   3. 월간(月干)이 일간과 다른 십성이면 → 월간 십성이 격.  ← 한국 통설 핵심
 *      (월간이 천간에 그대로 드러나 있어 월령의 대표 기운으로 본다)
 *   4. 월간이 비겁이면(일간과 같은 오행) → 월지 본기 → 중기 → 여기 투간 검사
 *      (자평진전식 fallback)
 *   5. 셋 다 미투간이면 → 월지 본기의 십성으로 채택 (잠재격국).
 *
 * 예: 갑목 일간 + 사월 + 월간 정화 → 월간 정 = 갑의 상관 → 상관격.
 *     (자평진전식이면 사 본기 병이 미투간하니 여기 무 투간으로 편재격.
 *      한국 통설은 월간 정이 명백히 보이므로 그쪽이 우선.)
 *
 * 변격(외격) 검사:
 *   - 비겁 6+개 → 종강격
 *   - 비겁 + 인성 6+개 → 종왕격
 *   - 재성 6+개 + 일간 약 → 종재격
 *   - 관성 6+개 + 일간 약 → 종관격
 *   - 식상 6+개 + 일간 약 → 종아격
 */

import type { CheonGan, JiJi, Saju, GyeokGuk, SipSin } from '../types';
import { JIJANGGAN, getBongi } from '../constants';
import { getSipSin } from '../tenGods';
import { checkTuggan } from './jangan';

// 일간의 록(祿) — 12운성 건록지
const ROK_BRANCH: Record<CheonGan, JiJi> = {
  갑: '인', 을: '묘', 병: '사', 정: '오', 무: '사',
  기: '오', 경: '신', 신: '유', 임: '해', 계: '자',
};

// 일간의 양인(羊刃) — 양간만 적용. 일간의 제왕지.
const YANGIN_BRANCH: Record<CheonGan, JiJi | null> = {
  갑: '묘', 을: null, 병: '오', 정: null, 무: '오',
  기: null, 경: '유', 신: null, 임: '자', 계: null,
};

const SIPSIN_TO_GYEOKGUK: Record<SipSin, GyeokGuk> = {
  비견: '건록격', 겁재: '양인격',
  식신: '식신격', 상관: '상관격',
  편재: '편재격', 정재: '정재격',
  편관: '편관격', 정관: '정관격',
  편인: '편인격', 정인: '정인격',
};

export interface GyeokgukResult {
  gyeokguk: GyeokGuk;
  /** 어떻게 결정됐는지 */
  via: '월간투간' | '본기투간' | '중기투간' | '여기투간' | '잠재본기' | '잠재중기' | '잠재여기' | '건록격' | '양인격' | '변격';
  /** 변격일 때 종 X 격 */
  jonggyeok?: '종강격' | '종왕격' | '종재격' | '종관격' | '종아격';
  reason: string;
}

/**
 * 격국 결정 (정격 + 변격 검사).
 *
 * @param sipsinCounts 5카테고리 카운트 — 변격 검사용
 */
export function determineGyeokgukFull(
  saju: Saju,
  categoryCounts: { 비겁: number; 인성: number; 식상: number; 재성: number; 관성: number },
): GyeokgukResult {
  const dayStem = saju.day.stem;
  const monthBranch = saju.month.branch;

  // 1. 변격 검사 먼저 (한 카테고리가 6+개면 종격)
  const THRESHOLD = 6; // 80% = 8글자 중 6.4 ≈ 6개
  const total = categoryCounts.비겁 + categoryCounts.인성 + categoryCounts.식상 +
                categoryCounts.재성 + categoryCounts.관성;

  if (categoryCounts.비겁 >= THRESHOLD) {
    return {
      gyeokguk: '건록격',
      via: '변격',
      jonggyeok: '종강격',
      reason: `종강격 — 비겁 ${categoryCounts.비겁}/${total}개로 압도적. 흐름에 종속.`,
    };
  }
  if (categoryCounts.비겁 + categoryCounts.인성 >= THRESHOLD &&
      categoryCounts.재성 + categoryCounts.관성 <= 1) {
    return {
      gyeokguk: '정인격',
      via: '변격',
      jonggyeok: '종왕격',
      reason: `종왕격 — 비겁+인성 ${categoryCounts.비겁 + categoryCounts.인성}개, 재관 미약.`,
    };
  }
  if (categoryCounts.재성 >= THRESHOLD && categoryCounts.비겁 + categoryCounts.인성 <= 1) {
    return {
      gyeokguk: '편재격',
      via: '변격',
      jonggyeok: '종재격',
      reason: `종재격 — 재성 ${categoryCounts.재성}개 압도, 일간 약함.`,
    };
  }
  if (categoryCounts.관성 >= THRESHOLD && categoryCounts.비겁 + categoryCounts.인성 <= 1) {
    return {
      gyeokguk: '편관격',
      via: '변격',
      jonggyeok: '종관격',
      reason: `종관격 — 관성 ${categoryCounts.관성}개 압도, 일간 약함.`,
    };
  }
  if (categoryCounts.식상 >= THRESHOLD && categoryCounts.비겁 + categoryCounts.인성 <= 1) {
    return {
      gyeokguk: '식신격',
      via: '변격',
      jonggyeok: '종아격',
      reason: `종아격 — 식상 ${categoryCounts.식상}개 압도.`,
    };
  }

  // 2. 특수격 — 건록격 / 양인격
  if (monthBranch === ROK_BRANCH[dayStem]) {
    return {
      gyeokguk: '건록격',
      via: '건록격',
      reason: `월지 ${monthBranch}이 일간 ${dayStem}의 록(건록)지.`,
    };
  }
  if (monthBranch === YANGIN_BRANCH[dayStem]) {
    return {
      gyeokguk: '양인격',
      via: '양인격',
      reason: `월지 ${monthBranch}이 일간 ${dayStem}의 양인(제왕)지.`,
    };
  }

  // 3. 자평진전 표준: 월지 본기 → 중기 → 여기 투간 검사
  //    (단 투간된 십성이 비견/겁재면 격으로 잡지 않고 다음 순위로)
  const tuggan = checkTuggan(monthBranch, saju);
  const expanded = JIJANGGAN[monthBranch];
  const bongi = expanded[expanded.length - 1];
  const isThreeStems = expanded.length === 3;
  const yeogi = expanded[0];
  const junggi = isThreeStems ? expanded[1] : null;

  // 비견/겁재는 격으로 안 잡음 — 다음 순위로 넘어감
  const isNonBigeop = (s: string) => s !== '비견' && s !== '겁재';

  if (tuggan.본기) {
    const sipsin = getSipSin(dayStem, tuggan.본기.stem);
    if (isNonBigeop(sipsin)) {
      return {
        gyeokguk: SIPSIN_TO_GYEOKGUK[sipsin],
        via: '본기투간',
        reason: `월지 ${monthBranch}의 본기 ${bongi}이 ${tuggan.본기.pillar}간에 투간 → ${sipsin}격.`,
      };
    }
  }
  if (junggi && tuggan.중기) {
    const sipsin = getSipSin(dayStem, tuggan.중기.stem);
    if (isNonBigeop(sipsin)) {
      return {
        gyeokguk: SIPSIN_TO_GYEOKGUK[sipsin],
        via: '중기투간',
        reason: `월지 ${monthBranch}의 중기 ${junggi}이 ${tuggan.중기.pillar}간에 투간 → ${sipsin}격.`,
      };
    }
  }
  if (tuggan.여기) {
    const sipsin = getSipSin(dayStem, tuggan.여기.stem);
    if (isNonBigeop(sipsin)) {
      return {
        gyeokguk: SIPSIN_TO_GYEOKGUK[sipsin],
        via: '여기투간',
        reason: `월지 ${monthBranch}의 여기 ${yeogi}이 ${tuggan.여기.pillar}간에 투간 → ${sipsin}격.`,
      };
    }
  }

  // 4. 잠재격국 — 지장간 모두 미투간이면 본기 채택. 단 본기가 비겁/겁재면
  //    중기/여기 중 비겁 아닌 것으로 fallback (비겁격은 따로 없음).
  let sipsin = getSipSin(dayStem, bongi);
  let viaLabel: '잠재본기' | '잠재중기' | '잠재여기' = '잠재본기';
  let usedStem = bongi;
  if (sipsin === '비견' || sipsin === '겁재') {
    if (junggi) {
      const sJunggi = getSipSin(dayStem, junggi);
      if (sJunggi !== '비견' && sJunggi !== '겁재') {
        sipsin = sJunggi;
        viaLabel = '잠재중기';
        usedStem = junggi;
      }
    }
    if ((sipsin === '비견' || sipsin === '겁재') && yeogi) {
      const sYeogi = getSipSin(dayStem, yeogi);
      if (sYeogi !== '비견' && sYeogi !== '겁재') {
        sipsin = sYeogi;
        viaLabel = '잠재여기';
        usedStem = yeogi;
      }
    }
  }
  return {
    gyeokguk: SIPSIN_TO_GYEOKGUK[sipsin],
    via: viaLabel,
    reason: `월지 ${monthBranch}의 지장간이 천간에 미투간. ${viaLabel === '잠재본기' ? `본기 ${usedStem}` : viaLabel === '잠재중기' ? `본기 ${bongi}이 비겁이라 중기 ${usedStem}` : `본기·중기 모두 비겁이라 여기 ${usedStem}`}로 ${sipsin}격 채택.`,
  };
}

/**
 * 5카테고리 카운트 헬퍼 — 사주의 8글자(천간 4 + 지지 본기 4)를 일간 기준 카테고리로 분류.
 * 일간 자신은 카운트에서 제외.
 */
export function countSipsinCategories(saju: Saju): {
  비겁: number; 인성: number; 식상: number; 재성: number; 관성: number;
} {
  const dayStem = saju.day.stem;
  const counts = { 비겁: 0, 인성: 0, 식상: 0, 재성: 0, 관성: 0 };

  const stems = [saju.year.stem, saju.month.stem, saju.hour?.stem];
  for (const s of stems) {
    if (!s) continue;
    addCategory(counts, getSipSin(dayStem, s));
  }

  const branches = [saju.year.branch, saju.month.branch, saju.day.branch, saju.hour?.branch];
  for (const b of branches) {
    if (!b) continue;
    const bongi = getBongi(b);
    addCategory(counts, getSipSin(dayStem, bongi));
  }

  return counts;
}

function addCategory(counts: ReturnType<typeof countSipsinCategories>, sipsin: SipSin) {
  switch (sipsin) {
    case '비견': case '겁재': counts.비겁++; break;
    case '편인': case '정인': counts.인성++; break;
    case '식신': case '상관': counts.식상++; break;
    case '편재': case '정재': counts.재성++; break;
    case '편관': case '정관': counts.관성++; break;
  }
}
