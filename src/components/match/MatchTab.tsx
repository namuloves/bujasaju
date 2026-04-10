'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import BirthdayForm, { MatchInput } from './BirthdayForm';
import SajuConfirmCard from './SajuConfirmCard';
import { calculateSaju } from '@/lib/saju/index';

// Both RevealAnimation and MatchResults pull in the matcher + (transitively)
// the enriched-people hook. They only render after the user confirms their
// saju, so lazy-load both to keep the form step tiny.
const RevealAnimation = dynamic(() => import('./RevealAnimation'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
  ),
});
const MatchResults = dynamic(() => import('./MatchResults'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
  ),
});
import { determineGyeokguk } from '@/lib/saju/gyeokguk';
import type { SajuResult, JiJi, CheonGan } from '@/lib/saju/types';

type Step = 'form' | 'calculating' | 'confirm' | 'revealing' | 'results';

// Brief synthetic delay so submitting a birthday feels like "computing your
// chart" instead of instantly popping the confirm card. The saju calculation
// itself is synchronous and takes <1ms.
const CALCULATING_MS = 900;

const STORAGE_KEY = 'bujasaju.matchInput';

function computeSaju(input: MatchInput): SajuResult {
  if (input.mode === 'birthday') {
    // Old localStorage entries (pre-minute) won't have a `minute` field;
    // default to 0 in that case so saved inputs still hydrate cleanly.
    const minute = input.hour !== null ? (input.minute ?? 0) : 0;
    const date = new Date(
      input.year,
      input.month - 1,
      input.day,
      input.hour ?? 0,
      minute,
      0,
    );
    return calculateSaju(date, { includeHour: input.hour !== null });
  }
  // Direct mode — synthesize a SajuResult from the 4 user-entered pillars.
  // Each pillar is a 2-char 갑자 string (stem + branch). The hour pillar is
  // optional. 격국 is derived from 일간 + 월지, same as the birthday path.
  const dayStem = input.dayPillar[0] as CheonGan;
  const dayBranch = input.dayPillar[1] as JiJi;
  const monthStem = input.monthPillar[0] as CheonGan;
  const monthBranch = input.monthPillar[1] as JiJi;
  const yearStem = input.yearPillar[0] as CheonGan;
  const yearBranch = input.yearPillar[1] as JiJi;
  const hour =
    input.hourPillar && input.hourPillar.length === 2
      ? {
          stem: input.hourPillar[0] as CheonGan,
          branch: input.hourPillar[1] as JiJi,
        }
      : null;
  return {
    saju: {
      year: { stem: yearStem, branch: yearBranch },
      month: { stem: monthStem, branch: monthBranch },
      day: { stem: dayStem, branch: dayBranch },
      hour,
    },
    gyeokguk: determineGyeokguk(dayStem, monthBranch),
    ilju: input.dayPillar,
    wolji: monthBranch,
  };
}

export default function MatchTab() {
  const [input, setInput] = useState<MatchInput | null>(null);
  const [step, setStep] = useState<Step>('form');

  // On reload, always start fresh at the form. localStorage still holds the
  // last input so BirthdayForm can pre-fill fields, but the user must
  // explicitly submit again.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MatchInput;
      setInput(parsed);
      // Stay on 'form' — don't auto-advance.
    } catch {
      // ignore
    }
  }, []);

  const handleFormSubmit = (next: MatchInput) => {
    setInput(next);
    setStep('calculating');
    // Short beat before landing on the confirm card so users feel the
    // system "doing something" with their birthday.
    window.setTimeout(() => setStep('confirm'), CALCULATING_MS);
  };

  const handleConfirm = () => {
    if (!input) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {
      // ignore
    }
    setStep('revealing');
  };

  const handleEdit = () => {
    setStep('form');
  };

  const handleReset = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setInput(null);
    setStep('form');
  };

  const saju = input ? computeSaju(input) : null;

  return (
    <div className="max-w-5xl mx-auto">
      {step === 'form' && (
        <BirthdayForm initial={input ?? undefined} onSubmit={handleFormSubmit} />
      )}
      {step === 'calculating' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 min-h-[320px] flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin mb-5" />
          <div className="text-sm font-medium text-gray-700">사주를 계산하는 중…</div>
          <div className="text-xs text-gray-400 mt-1.5">잠시만 기다려 주세요</div>
        </div>
      )}
      {step === 'confirm' && saju && (
        <SajuConfirmCard saju={saju} onConfirm={handleConfirm} onEdit={handleEdit} />
      )}
      {step === 'revealing' && saju && (
        <RevealAnimation saju={saju} onDone={() => setStep('results')} />
      )}
      {step === 'results' && saju && (
        <MatchResults me={saju} onReset={handleReset} />
      )}
    </div>
  );
}
