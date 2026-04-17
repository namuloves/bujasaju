'use client';

import { useState, lazy, Suspense } from 'react';
import { useLanguage } from '@/lib/i18n';

const HeroOrbit = lazy(() => import('./HeroOrbit'));
import { CHEON_GAN, JI_JI } from '@/lib/saju/constants';
import type { CheonGan, JiJi } from '@/lib/saju/types';

// Build the real 60갑자 sequence (the version in constants.ts is buggy).
// Runs j from 0..59 by stem/branch sexagenary rule: (stem+branch) both advance.
const SIXTY_GAPJA: string[] = (() => {
  const out: string[] = [];
  for (let i = 0; i < 60; i++) {
    out.push(CHEON_GAN[i % 10] + JI_JI[i % 12]);
  }
  return out;
})();

const SIXTY_GAPJA_SET = new Set(SIXTY_GAPJA);

// A pillar is valid if it's exactly 2 chars: a valid stem + a valid branch,
// AND forms one of the 60갑자 (stems and branches combine in a fixed cycle —
// e.g. 갑축 is not a real pillar).
function isValidPillar(s: string): boolean {
  return SIXTY_GAPJA_SET.has(s);
}

// Legacy migration: map a 24h hour to its 시지. 자시 wraps midnight (23, 0).
// Used to hydrate old localStorage entries that stored `hour` instead of
// `timeBranch`.
function hourToBranch(hour: number | null): JiJi | null {
  if (hour === null || hour === undefined) return null;
  if (hour === 23 || hour === 0) return '자';
  // 축시 starts at 1, each branch covers 2 hours: 1→축, 3→인, 5→묘, ...
  const idx = Math.floor((hour - 1) / 2);
  const branches: JiJi[] = ['축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  return branches[idx] ?? null;
}

export interface BirthdayInput {
  mode: 'birthday';
  year: number;
  month: number;
  day: number;
  // 시지 (2-hour window). null = unknown. This replaces the old
  // hour+minute fields; those are still accepted from legacy localStorage
  // entries and migrated in MatchTab.
  timeBranch?: JiJi | null;
  // Legacy fields — no longer written by this form, but may appear in
  // saved state from older versions of the app.
  hour?: number | null;
  minute?: number;
}

/**
 * Direct input mode: user enters the full 4 pillars (시주 · 일주 · 월주 · 년주).
 * 시주 is optional — pass null if the user doesn't know their hour.
 * 격국 is derived from 일간 + 월지 in the consumer, not asked for here.
 */
export interface DirectInput {
  mode: 'direct';
  hourPillar: string | null; // e.g. '갑자' or null
  dayPillar: string;         // e.g. '병인'
  monthPillar: string;       // e.g. '경인'
  yearPillar: string;        // e.g. '갑자'
}

export type MatchInput = BirthdayInput | DirectInput;

interface Props {
  initial?: MatchInput;
  onSubmit: (input: MatchInput) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1900 + 1 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

// 시지 (2-hour window) options, in traditional order starting from 자시.
// Each entry: the 지지 + the range in 24-hour format.
// Note 자시 wraps midnight (23:00–01:00).
const TIME_BRANCHES: { branch: JiJi; rangeKo: string; rangeEn: string }[] = [
  { branch: '자', rangeKo: '23시–01시', rangeEn: '23:00–01:00' },
  { branch: '축', rangeKo: '01시–03시', rangeEn: '01:00–03:00' },
  { branch: '인', rangeKo: '03시–05시', rangeEn: '03:00–05:00' },
  { branch: '묘', rangeKo: '05시–07시', rangeEn: '05:00–07:00' },
  { branch: '진', rangeKo: '07시–09시', rangeEn: '07:00–09:00' },
  { branch: '사', rangeKo: '09시–11시', rangeEn: '09:00–11:00' },
  { branch: '오', rangeKo: '11시–13시', rangeEn: '11:00–13:00' },
  { branch: '미', rangeKo: '13시–15시', rangeEn: '13:00–15:00' },
  { branch: '신', rangeKo: '15시–17시', rangeEn: '15:00–17:00' },
  { branch: '유', rangeKo: '17시–19시', rangeEn: '17:00–19:00' },
  { branch: '술', rangeKo: '19시–21시', rangeEn: '19:00–21:00' },
  { branch: '해', rangeKo: '21시–23시', rangeEn: '21:00–23:00' },
];

export default function BirthdayForm({ initial, onSubmit }: Props) {
  const { t, lang } = useLanguage();

  // Birthday mode state
  const birthInit = initial?.mode === 'birthday' ? initial : null;
  const [year, setYear] = useState<number>(birthInit?.year ?? 1990);
  const [month, setMonth] = useState<number>(birthInit?.month ?? 1);
  const [day, setDay] = useState<number>(birthInit?.day ?? 1);
  // Prefer the new timeBranch field; fall back to legacy hour -> branch mapping
  // so users who saved their input under the old schema don't lose it.
  const [timeBranch, setTimeBranch] = useState<JiJi | null>(
    birthInit?.timeBranch ?? hourToBranch(birthInit?.hour ?? null),
  );

  // Direct mode state — 4 pillars in 시주/일주/월주/년주 order
  const directInit = initial?.mode === 'direct' ? initial : null;
  const [hourPillar, setHourPillar] = useState<string | null>(directInit?.hourPillar ?? null);
  const [dayPillar, setDayPillar] = useState<string>(directInit?.dayPillar ?? '');
  const [monthPillar, setMonthPillar] = useState<string>(directInit?.monthPillar ?? '');
  const [yearPillar, setYearPillar] = useState<string>(directInit?.yearPillar ?? '');

  const handleBirthdaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ mode: 'birthday', year, month, day, timeBranch });
  };

  // Validation: day/month/year pillars are required; hour is optional (empty = unknown).
  // Empty strings render neutrally (no red border); only non-empty invalid input turns red.
  const dayValid = isValidPillar(dayPillar);
  const monthValid = isValidPillar(monthPillar);
  const yearValid = isValidPillar(yearPillar);
  const hourValid = hourPillar === null || hourPillar === '' || isValidPillar(hourPillar);
  const dayShowError = dayPillar !== '' && !dayValid;
  const monthShowError = monthPillar !== '' && !monthValid;
  const yearShowError = yearPillar !== '' && !yearValid;
  const hourShowError = !hourValid;
  const directFormValid = dayValid && monthValid && yearValid && hourValid;
  const anyError = dayShowError || monthShowError || yearShowError || hourShowError;

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directFormValid) return;
    onSubmit({
      mode: 'direct',
      hourPillar: hourPillar && hourPillar !== '' ? hourPillar : null,
      dayPillar,
      monthPillar,
      yearPillar,
    });
  };

  return (
    <form onSubmit={handleBirthdaySubmit} className="px-6 sm:px-8 pt-0 pb-6 sm:pb-8">
      <Suspense fallback={<div className="h-[130px] sm:h-[150px] mb-6" />}>
        <HeroOrbit />
      </Suspense>
      <div className="text-center mb-6">
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 whitespace-nowrap">
          {t.matchHeadline}
        </h2>
        <p className="text-sm text-gray-500">
          {lang === 'ko' ? (
            <>생년월일을 입력하면 같은 일주를 가진<br />부자를 찾아드립니다.</>
          ) : t.matchSubhead}
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{t.year}</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{t.month}</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{t.day}</span>
            <select
              value={day}
              onChange={(e) => setDay(Number(e.target.value))}
              className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col col-span-3 sm:col-span-1">
            <span className="text-xs text-gray-500 mb-1">{t.hourOptional}</span>
            <select
              value={timeBranch ?? ''}
              onChange={(e) =>
                setTimeBranch(e.target.value === '' ? null : (e.target.value as JiJi))
              }
              className="px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t.hourUnknown}</option>
              {TIME_BRANCHES.map(({ branch, rangeKo, rangeEn }) => (
                <option key={branch} value={branch}>
                  {lang === 'ko'
                    ? `${branch}시 (${rangeKo})`
                    : `${branch}시 (${rangeEn})`}
                </option>
              ))}
            </select>
          </label>
      </div>

      <div className="flex justify-center mt-6">
        <button
          type="submit"
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {t.submit}
        </button>
      </div>

      {/* Direct saju input — always visible for users who know their 사주 */}
      <div className="mt-8 pt-6 border-t border-gray-200 max-w-xl mx-auto">
        <div className="text-xs font-medium text-gray-500 mb-3">{t.inputModeDirect}</div>
        <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{t.yearPillarLabel}</span>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={2}
                  placeholder="예: 갑자"
                  value={yearPillar}
                  onChange={(e) => setYearPillar(e.target.value)}
                  className={`px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    yearShowError ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{t.monthPillarLabel}</span>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={2}
                  placeholder="예: 경인"
                  value={monthPillar}
                  onChange={(e) => setMonthPillar(e.target.value)}
                  className={`px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    monthShowError ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{t.dayPillarLabel}</span>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={2}
                  placeholder="예: 병인"
                  value={dayPillar}
                  onChange={(e) => setDayPillar(e.target.value)}
                  className={`px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    dayShowError ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{t.hourPillarLabel}</span>
                <input
                  type="text"
                  inputMode="text"
                  maxLength={2}
                  placeholder="예: 갑자"
                  value={hourPillar ?? ''}
                  onChange={(e) =>
                    setHourPillar(e.target.value === '' ? null : e.target.value)
                  }
                  className={`px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    hourShowError ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </label>
            </div>
            {anyError && (
              <p className="text-xs text-red-500 text-center">
                60갑자에 해당하는 기둥을 입력해 주세요 (예: 갑자, 병인, 경오)
              </p>
            )}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleDirectSubmit}
                disabled={!directFormValid}
                className="px-5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.submit}
              </button>
            </div>
        </div>
      </div>
    </form>
  );
}
