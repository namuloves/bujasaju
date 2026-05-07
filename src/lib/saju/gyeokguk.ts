import { CheonGan, JiJi, GyeokGuk, SipSin, Saju } from './types';
import { getBongi } from './constants';
import { getSipSin } from './tenGods';

const SIPSIN_TO_GYEOKGUK: Record<SipSin, GyeokGuk> = {
  '정관': '정관격',
  '편관': '편관격',
  '정재': '정재격',
  '편재': '편재격',
  '식신': '식신격',
  '상관': '상관격',
  '정인': '정인격',
  '편인': '편인격',
  '비견': '건록격',
  '겁재': '양인격',
};

/**
 * 단순 격국 결정 — 일간 + 월지 본기 기준 (구버전, fallback용).
 * 한국 통설(월간 우선)을 쓰려면 determineGyeokgukKorean(saju) 사용.
 */
export function determineGyeokguk(dayStem: CheonGan, monthBranch: JiJi): GyeokGuk {
  const bongi = getBongi(monthBranch);
  const sipsin = getSipSin(dayStem, bongi);
  return SIPSIN_TO_GYEOKGUK[sipsin];
}

/**
 * 한국 통설 격국 결정 — 월간(月干) 우선.
 *
 * 한국 명리 통설 절차:
 *   1. 월간(月干)이 일간과 다른 십성이면 → 월간 십성이 격.  ← 한국 통설 핵심
 *      (월간이 천간에 그대로 드러나 있어 월령의 대표 기운으로 본다)
 *   2. 월간이 비겁이면(일간과 같은 오행) → 월지 본기로 fallback.
 *
 * 예: 갑목 일간 + 사월 + 월간 정화 → 월간 정 = 갑의 상관 → 상관격.
 */
export function determineGyeokgukKorean(saju: Saju): GyeokGuk {
  const dayStem = saju.day.stem;
  const monthStem = saju.month.stem;

  const monthStemSipsin = getSipSin(dayStem, monthStem);
  if (monthStemSipsin !== '비견' && monthStemSipsin !== '겁재') {
    return SIPSIN_TO_GYEOKGUK[monthStemSipsin];
  }

  const bongi = getBongi(saju.month.branch);
  const sipsin = getSipSin(dayStem, bongi);
  return SIPSIN_TO_GYEOKGUK[sipsin];
}
