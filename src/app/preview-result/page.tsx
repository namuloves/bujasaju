'use client';

/**
 * /preview-result — sandbox route for the redesigned MatchResults (V2).
 *
 * Computes a real saju from a hardcoded sample birthday so the new layout
 * has the same data shape as the live page, but with no form/reveal/quiz
 * steps in front of it. Lets us iterate on the result design without
 * touching the live /?tab=match flow.
 *
 * Birthday can be overridden via querystring:
 *   /preview-result?y=1980&m=3&d=14&t=1
 * where t is a JiJi index 0–11 (optional).
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { computeSaju } from '@/components/match/MatchTab';
import type { JiJi } from '@/lib/saju/types';

const MatchResultsV2 = dynamic(
  () => import('@/components/match/MatchResultsV2'),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
    ),
  },
);

const TIME_BRANCHES: JiJi[] = [
  '子', '丑', '寅', '卯', '辰', '巳',
  '午', '未', '申', '酉', '戌', '亥',
];

function getInput() {
  if (typeof window === 'undefined') {
    return { year: 1990, month: 5, day: 15, timeBranch: null as JiJi | null };
  }
  const params = new URLSearchParams(window.location.search);
  const year = parseInt(params.get('y') ?? '', 10);
  const month = parseInt(params.get('m') ?? '', 10);
  const day = parseInt(params.get('d') ?? '', 10);
  const timeIdx = parseInt(params.get('t') ?? '', 10);
  return {
    year: Number.isFinite(year) ? year : 1990,
    month: Number.isFinite(month) ? month : 5,
    day: Number.isFinite(day) ? day : 15,
    timeBranch:
      Number.isFinite(timeIdx) && timeIdx >= 0 && timeIdx < 12
        ? TIME_BRANCHES[timeIdx]
        : null,
  };
}

export default function PreviewResultPage() {
  const [input, setInput] = useState(() => getInput());
  // Re-read input after mount so SSR + client agree on the default and any
  // querystring override kicks in.
  useEffect(() => {
    setInput(getInput());
  }, []);

  const saju = useMemo(() => {
    return computeSaju({
      mode: 'birthday',
      year: input.year,
      month: input.month,
      day: input.day,
      timeBranch: input.timeBranch,
    });
  }, [input.year, input.month, input.day, input.timeBranch]);

  const handleReset = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Sandbox banner — makes it obvious this is the preview route and not
          the live result page. Links back to the real flow. */}
      <div className="bg-amber-50 border-b border-amber-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <p className="text-amber-900">
            <span className="font-semibold">PREVIEW</span> · 결과 페이지 V2
            (히어로 리빌 + 희소도 + 공유 카드)
          </p>
          <div className="flex items-center gap-3 text-amber-900/70">
            <span>
              {input.year}.{input.month}.{input.day}
              {input.timeBranch ? ` · ${input.timeBranch}시` : ''}
            </span>
            <Link
              href="/?tab=match"
              className="font-medium underline underline-offset-2 hover:text-amber-700"
            >
              실제 결과 페이지 →
            </Link>
          </div>
        </div>
      </div>

      <MatchResultsV2
        me={saju}
        onReset={handleReset}
        userBirthday={`${input.year}-${String(input.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`}
        userGender="M"
      />
    </div>
  );
}
