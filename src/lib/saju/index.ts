import { CheonGan, JiJi, Ju, SajuResult } from './types';
import { CHEON_GAN, JI_JI } from './constants';
import { determineGyeokguk } from './gyeokguk';

// @ts-ignore - lunar-javascript doesn't have type definitions
const { Solar } = require('lunar-javascript');

// Hanja → Korean mapping for 천간
const HANJA_TO_STEM: Record<string, CheonGan> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
};

// Hanja → Korean mapping for 지지
const HANJA_TO_BRANCH: Record<string, JiJi> = {
  '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사',
  '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해',
};

function parsePillar(hanjaStr: string): Ju {
  const stem = HANJA_TO_STEM[hanjaStr[0]];
  const branch = HANJA_TO_BRANCH[hanjaStr[1]];
  return { stem, branch };
}

// === Main Saju Calculator using lunar-javascript ===
// If the `birthday` Date has a non-default time component (hour !== 0), we
// pass that hour into lunar-javascript so it can compute the 시주 (hour pillar).
// Callers that only know the birth date should pass a Date at midnight — the
// hour pillar will simply be the 00시(자시) pillar, which is the established
// convention when hour of birth is unknown... so callers who want "no hour"
// should explicitly pass `includeHour: false` and we'll return hour: null.
export function calculateSaju(
  birthday: Date,
  opts: { includeHour?: boolean } = {},
): SajuResult {
  const y = birthday.getFullYear();
  const m = birthday.getMonth() + 1;
  const d = birthday.getDate();
  const h = birthday.getHours();
  const mi = birthday.getMinutes();

  const solar = opts.includeHour
    ? Solar.fromYmdHms(y, m, d, h, mi, 0)
    : Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  const yearPillar = parsePillar(bazi.getYear());
  const monthPillar = parsePillar(bazi.getMonth());
  const dayPillar = parsePillar(bazi.getDay());
  const hourPillar = opts.includeHour ? parsePillar(bazi.getTime()) : null;

  // Determine 격국 from 일간 and 월지
  const gyeokguk = determineGyeokguk(dayPillar.stem, monthPillar.branch);

  const ilju = `${dayPillar.stem}${dayPillar.branch}`;
  const wolji = monthPillar.branch;

  return {
    saju: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
    },
    gyeokguk,
    ilju,
    wolji,
  };
}

// Helper: parse YYYY-MM-DD string to Date
export function parseBirthday(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
