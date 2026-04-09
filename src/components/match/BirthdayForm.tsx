'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { CHEON_GAN, JI_JI } from '@/lib/saju/constants';
import type { CheonGan, JiJi, GyeokGuk } from '@/lib/saju/types';

// Build the real 60갑자 sequence (the version in constants.ts is buggy).
const SIXTY_GAPJA: string[] = (() => {
  const out: string[] = [];
  for (let i = 0; i < 60; i++) {
    out.push(CHEON_GAN[i % 10] + JI_JI[i % 12]);
  }
  return out;
})();

const ALL_GYEOKGUKS: GyeokGuk[] = [
  '정관격', '편관격', '정재격', '편재격',
  '식신격', '상관격', '정인격', '편인격',
  '건록격', '양인격',
];

export interface BirthdayInput {
  mode: 'birthday';
  year: number;
  month: number;
  day: number;
  hour: number | null; // null = unknown
}

export interface DirectInput {
  mode: 'direct';
  ilju: string;   // e.g. '갑진'
  wolji: JiJi;
  gyeokguk: GyeokGuk;
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
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function BirthdayForm({ initial, onSubmit }: Props) {
  const { t } = useLanguage();

  // Birthday mode state
  const birthInit = initial?.mode === 'birthday' ? initial : null;
  const [year, setYear] = useState<number>(birthInit?.year ?? 1990);
  const [month, setMonth] = useState<number>(birthInit?.month ?? 1);
  const [day, setDay] = useState<number>(birthInit?.day ?? 1);
  const [hour, setHour] = useState<number | null>(birthInit?.hour ?? null);

  // Direct mode state
  const directInit = initial?.mode === 'direct' ? initial : null;
  const [directOpen, setDirectOpen] = useState<boolean>(initial?.mode === 'direct');
  const [ilju, setIlju] = useState<string>(directInit?.ilju ?? '갑자');
  const [wolji, setWolji] = useState<JiJi>(directInit?.wolji ?? '인');
  const [gyeokguk, setGyeokguk] = useState<GyeokGuk>(directInit?.gyeokguk ?? '정관격');

  const handleBirthdaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ mode: 'birthday', year, month, day, hour });
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ mode: 'direct', ilju, wolji, gyeokguk });
  };

  return (
    <form onSubmit={handleBirthdaySubmit} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8">
      <div className="text-center mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          {t.matchHeadline}
        </h2>
        <p className="text-sm text-gray-500">{t.matchSubhead}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto">
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{t.year}</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">{t.hourOptional}</span>
            <select
              value={hour ?? ''}
              onChange={(e) => setHour(e.target.value === '' ? null : Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t.hourUnknown}</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h.toString().padStart(2, '0')}:00
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

      {/* Direct saju input — collapsible section for users who know their saju */}
      <div className="mt-8 pt-6 border-t border-gray-200 max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => setDirectOpen((v) => !v)}
          className="w-full flex items-center justify-between text-left text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors"
          aria-expanded={directOpen}
        >
          <span>{t.inputModeDirect}</span>
          <span className={`transition-transform ${directOpen ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {directOpen && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{t.directIljuLabel}</span>
                <select
                  value={ilju}
                  onChange={(e) => setIlju(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {SIXTY_GAPJA.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{t.directWoljiLabel}</span>
                <select
                  value={wolji}
                  onChange={(e) => setWolji(e.target.value as JiJi)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {JI_JI.map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col">
                <span className="text-xs text-gray-500 mb-1">{t.directGyeokgukLabel}</span>
                <select
                  value={gyeokguk}
                  onChange={(e) => setGyeokguk(e.target.value as GyeokGuk)}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ALL_GYEOKGUKS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={handleDirectSubmit}
                className="px-5 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
              >
                {t.submit}
              </button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
