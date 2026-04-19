'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { track } from '@vercel/analytics';
import BirthdayForm, { MatchInput } from './BirthdayForm';
import SajuConfirmCard from './SajuConfirmCard';
import { calculateSaju } from '@/lib/saju/index';

// Both RevealAnimation and MatchResults pull in the matcher + (transitively)
// the enriched-people hook. They only render after the user confirms their
// saju, so lazy-load both to keep the form step tiny.
//
// After a Vercel deployment the old chunk URLs become 404. Catch the
// ChunkLoadError and do a full page reload so the browser fetches the new
// build's HTML (and therefore the correct chunk URLs).
function retryImport<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((err: unknown) => {
    if (
      err instanceof Error &&
      err.name === 'ChunkLoadError' &&
      typeof window !== 'undefined'
    ) {
      window.location.reload();
    }
    throw err;
  });
}

const RevealAnimation = dynamic(
  () => retryImport(() => import('./RevealAnimation')),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
    ),
  },
);
const MatchResults = dynamic(
  () => retryImport(() => import('./MatchResults')),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
    ),
  },
);
import { determineGyeokguk } from '@/lib/saju/gyeokguk';
import type { SajuResult, JiJi, CheonGan } from '@/lib/saju/types';

type Step = 'form' | 'calculating' | 'confirm' | 'revealing' | 'results';

// Brief synthetic delay so submitting a birthday feels like "computing your
// chart" instead of instantly popping the confirm card. The saju calculation
// itself is synchronous and takes <1ms.
const CALCULATING_MS = 900;

const STORAGE_KEY = 'bujasaju.matchInput';

// Midpoint hour for each 시지 — fed into lunar-javascript so it picks the
// right 시지 without sitting on a window boundary.
// 자 wraps midnight but midpoint 0 still falls inside the 23–01 window.
const TIME_BRANCH_TO_HOUR: Record<JiJi, number> = {
  자: 0,
  축: 2,
  인: 4,
  묘: 6,
  진: 8,
  사: 10,
  오: 12,
  미: 14,
  신: 16,
  유: 18,
  술: 20,
  해: 22,
};

function computeSaju(input: MatchInput): SajuResult {
  if (input.mode === 'birthday') {
    // New path uses `timeBranch`. Legacy localStorage entries may still have
    // `hour`/`minute` — honor them so saved inputs hydrate cleanly.
    const branch = input.timeBranch ?? null;
    const hasHour = branch !== null || (input.hour != null);
    const hour =
      branch !== null
        ? TIME_BRANCH_TO_HOUR[branch]
        : (input.hour ?? 0);
    const minute = branch !== null ? 0 : (input.minute ?? 0);
    const date = new Date(
      input.year,
      input.month - 1,
      input.day,
      hour,
      minute,
      0,
    );
    return calculateSaju(date, { includeHour: hasHour });
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
    if (saju) {
      track('quiz_confirmed', {
        ilju: saju.ilju,
        wolji: saju.wolji,
        gyeokguk: saju.gyeokguk,
        ilgan: saju.saju.day.stem,
        mode: input.mode,
      });
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
        <MatchResults
          me={saju}
          onReset={handleReset}
          userBirthday={
            input?.mode === 'birthday'
              ? `${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`
              : undefined
          }
          // NOTE: BirthdayForm doesn't yet collect gender; default to 'M' so
          // the v2 deep interpretation can run. Follow-up task: add a gender
          // toggle to BirthdayForm and pass it through here.
          userGender={input?.mode === 'birthday' ? 'M' : undefined}
        />
      )}
    </div>
  );
}
