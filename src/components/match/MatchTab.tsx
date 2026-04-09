'use client';

import { useEffect, useState } from 'react';
import BirthdayForm, { MatchInput } from './BirthdayForm';
import SajuConfirmCard from './SajuConfirmCard';
import MatchResults from './MatchResults';
import { calculateSaju } from '@/lib/saju/index';
import type { SajuResult, GyeokGuk, JiJi, CheonGan } from '@/lib/saju/types';

type Step = 'form' | 'confirm' | 'results';

const STORAGE_KEY = 'bujasaju.matchInput';

function computeSaju(input: MatchInput): SajuResult {
  if (input.mode === 'birthday') {
    const date = new Date(
      input.year,
      input.month - 1,
      input.day,
      input.hour ?? 0,
      0,
      0,
    );
    return calculateSaju(date, { includeHour: input.hour !== null });
  }
  // Direct mode — synthesize a SajuResult from the three fields. The day
  // pillar is derived from `ilju` (e.g. '갑진' → stem='갑', branch='진').
  // Year/month/hour pillars are left as blanks — they aren't used by
  // the matching logic (which only looks at ilju, wolji, gyeokguk).
  const stem = input.ilju[0] as CheonGan;
  const branch = input.ilju[1] as JiJi;
  return {
    saju: {
      year: { stem: '갑', branch: '자' }, // placeholder
      month: { stem: '갑', branch: input.wolji },
      day: { stem, branch },
      hour: null,
    },
    gyeokguk: input.gyeokguk,
    ilju: input.ilju,
    wolji: input.wolji,
  };
}

export default function MatchTab() {
  const [input, setInput] = useState<MatchInput | null>(null);
  const [step, setStep] = useState<Step>('form');

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MatchInput;
      setInput(parsed);
      setStep('results'); // skip straight to results on return visits
    } catch {
      // ignore
    }
  }, []);

  const handleFormSubmit = (next: MatchInput) => {
    setInput(next);
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (!input) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(input));
    } catch {
      // ignore
    }
    setStep('results');
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
      {step === 'confirm' && saju && (
        <SajuConfirmCard saju={saju} onConfirm={handleConfirm} onEdit={handleEdit} />
      )}
      {step === 'results' && saju && (
        <MatchResults me={saju} onReset={handleReset} />
      )}
    </div>
  );
}
