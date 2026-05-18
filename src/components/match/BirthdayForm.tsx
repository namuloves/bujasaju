'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

import BillionaireTicker from './BillionaireTicker';
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

export default function BirthdayForm({ initial, onSubmit }: Props) {
  const { t, lang } = useLanguage();

  // Birthday mode state. The time-of-birth field was removed from the UI —
  // matching is by 일주 only, which is derived from year/month/day. The
  // MatchInput type still carries an optional `timeBranch` for the direct
  // mode and for hydrating legacy localStorage entries.
  const birthInit = initial?.mode === 'birthday' ? initial : null;
  const [year, setYear] = useState<number>(birthInit?.year ?? 1990);
  const [month, setMonth] = useState<number>(birthInit?.month ?? 1);
  const [day, setDay] = useState<number>(birthInit?.day ?? 1);

  // Direct mode state — 4 pillars in 시주/일주/월주/년주 order
  const directInit = initial?.mode === 'direct' ? initial : null;
  const [hourPillar, setHourPillar] = useState<string | null>(directInit?.hourPillar ?? null);
  const [dayPillar, setDayPillar] = useState<string>(directInit?.dayPillar ?? '');
  const [monthPillar, setMonthPillar] = useState<string>(directInit?.monthPillar ?? '');
  const [yearPillar, setYearPillar] = useState<string>(directInit?.yearPillar ?? '');

  // If the user previously submitted via direct mode, open the panel by default
  // so they can see and edit what they entered. Otherwise it stays collapsed.
  const [directOpen, setDirectOpen] = useState<boolean>(initial?.mode === 'direct');

  const handleBirthdaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ mode: 'birthday', year, month, day, timeBranch: null });
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

  const ctaCopy = lang === 'ko' ? '나와 같은 사주 일주 가진 부자 찾기' : t.submit;

  return (
    <form onSubmit={handleBirthdaySubmit} className="pt-0 pb-6 sm:pb-8">
      <BillionaireTicker />

      <div className="text-center mt-4 sm:mt-6 mb-6 sm:mb-8 px-6">
        {lang === 'ko' ? (
          <h2 className="text-[22px] sm:text-[34px] font-extrabold tracking-tight text-gray-900 leading-tight">
            나와 같은 사주 일주를<br />가진 부자 찾기
          </h2>
        ) : (
          <h2 className="text-[22px] sm:text-[34px] font-extrabold tracking-tight text-gray-900 leading-tight">
            {t.matchHeadline}
          </h2>
        )}
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          {lang === 'ko' ? (
            <>
              생년월일만 알려주시면{' '}
              <br className="sm:hidden" />
              같은 일주의 부자를 찾아드릴게요
            </>
          ) : t.matchSubhead}
        </p>
      </div>

      <div className="px-4 sm:px-8">
        <div className="max-w-xl mx-auto border border-gray-200 rounded-2xl p-5 sm:p-7 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            <label className="flex flex-col">
              <span className="text-[11px] font-semibold text-gray-500 mb-1.5">{t.year}</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-11 px-3 text-sm text-gray-900 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-[11px] font-semibold text-gray-500 mb-1.5">{t.month}</span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="h-11 px-3 text-sm text-gray-900 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              <span className="text-[11px] font-semibold text-gray-500 mb-1.5">{t.day}</span>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="h-11 px-3 text-sm text-gray-900 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="submit"
            className="group w-full h-[52px] inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-[15px] font-semibold rounded-xl transition-transform hover:-translate-y-[1px]"
          >
            {ctaCopy}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>

      {/* Direct saju input — secondary path, opens on demand. */}
      <div className="mt-5 text-center text-[13px] text-gray-500">
        {lang === 'ko' ? '사주 4기둥을 이미 알고 있어요 ' : "I already know my 사주 "}
        <button
          type="button"
          onClick={() => setDirectOpen((v) => !v)}
          className="text-gray-500 hover:text-gray-900 underline underline-offset-2 decoration-gray-300 hover:decoration-gray-900"
        >
          {lang === 'ko' ? '직접 입력하기 ›' : 'enter directly ›'}
        </button>
      </div>

      {directOpen && (
      <div className="mt-6 pt-6 border-t border-gray-200 max-w-xl mx-auto px-6">
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
      )}
    </form>
  );
}
