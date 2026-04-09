'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SajuResult, Ju, CheonGan, JiJi } from '@/lib/saju/types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG, OHAENG_COLORS } from '@/lib/saju/constants';
import { enrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import { useLanguage } from '@/lib/i18n';

interface Props {
  saju: SajuResult;
  onDone: () => void;
}

// Ordered pillars, right-to-left traditional reading: 년 · 월 · 일 · 시
// We reveal left-to-right on screen (시 first) so the day pillar lands in the
// "center of attention" last before 년, giving a satisfying buildup.
// Actually traditional visual order is 시 일 월 년 left-to-right, and we want
// the animation to build anticipation toward the 일주 (the most important one).
// Reveal order: 년 → 월 → 일 → 시  feels backwards visually.
// Best: reveal 년 first (right-most), then 월, 월→일, ending on 시.
// We'll position them 시-일-월-년 left to right, and reveal 년→월→일→시
// so the user's eyes sweep right-to-left like reading a classical saju chart.
const PILLAR_ORDER: Array<{ key: 'year' | 'month' | 'day' | 'hour'; label: string; revealIndex: number }> = [
  { key: 'hour', label: '時', revealIndex: 3 },
  { key: 'day', label: '日', revealIndex: 2 },
  { key: 'month', label: '月', revealIndex: 1 },
  { key: 'year', label: '年', revealIndex: 0 },
];

// Each pillar reveal takes 450ms; then 650ms "matching" phase; then 500ms
// results reveal — total ~2.75s.
const PILLAR_STAGGER_MS = 450;
const MATCHING_DELAY_MS = PILLAR_ORDER.length * PILLAR_STAGGER_MS + 200;
const RESULTS_DELAY_MS = MATCHING_DELAY_MS + 900;
const DONE_DELAY_MS = RESULTS_DELAY_MS + 900;

function PillarCard({
  ju,
  label,
  revealIndex,
}: {
  ju: Ju | null;
  label: string;
  revealIndex: number;
}) {
  const delay = revealIndex * PILLAR_STAGGER_MS;

  if (!ju) {
    return (
      <div
        className="flex flex-col items-center opacity-0 reveal-pillar"
        style={{ animationDelay: `${delay}ms` }}
      >
        <div className="text-[11px] text-gray-400 mb-1">{label}</div>
        <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300 text-2xl">
          ?
        </div>
        <div className="w-16 h-16 rounded-lg border border-dashed border-gray-300 mt-1 flex items-center justify-center text-gray-300 text-2xl">
          ?
        </div>
      </div>
    );
  }

  const stemOh = STEM_TO_OHAENG[ju.stem as CheonGan];
  const branchOh = BRANCH_TO_OHAENG[ju.branch as JiJi];
  const stemColor = OHAENG_COLORS[stemOh];
  const branchColor = OHAENG_COLORS[branchOh];

  return (
    <div
      className="flex flex-col items-center opacity-0 reveal-pillar"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div
        className={`w-16 h-16 rounded-lg border flex items-center justify-center text-3xl font-bold shadow-sm ${stemColor.bg} ${stemColor.text} ${stemColor.border}`}
      >
        {ju.stem}
      </div>
      <div
        className={`w-16 h-16 rounded-lg border mt-1 flex items-center justify-center text-3xl font-bold shadow-sm ${branchColor.bg} ${branchColor.text} ${branchColor.border}`}
      >
        {ju.branch}
      </div>
    </div>
  );
}

export default function RevealAnimation({ saju, onDone }: Props) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState<'reading' | 'matching' | 'results'>('reading');

  // Pre-compute match count so the final number is ready when we show it.
  // Count only the groups actually rendered on the results page
  // (일주-only is behind a separate button, so exclude it from the headline).
  const totalMatches = useMemo(() => {
    const groups = matchBillionaires(saju, enrichedPeople);
    return (
      groups.chartTwins.length +
      groups.iljuPlusWolji.length +
      groups.iljuPlusGyeokguk.length
    );
  }, [saju]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('matching'), MATCHING_DELAY_MS);
    const t2 = setTimeout(() => setPhase('results'), RESULTS_DELAY_MS);
    const t3 = setTimeout(() => onDone(), DONE_DELAY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-12 min-h-[420px] flex flex-col items-center justify-center">
      <style>{`
        @keyframes reveal-pillar-kf {
          0% {
            opacity: 0;
            transform: rotateY(90deg) translateY(-8px);
          }
          60% {
            opacity: 1;
            transform: rotateY(-6deg) translateY(0);
          }
          100% {
            opacity: 1;
            transform: rotateY(0deg) translateY(0);
          }
        }
        .reveal-pillar {
          animation: reveal-pillar-kf 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          transform-origin: center;
          backface-visibility: hidden;
        }
        @keyframes reveal-count-kf {
          0% { opacity: 0; transform: scale(0.6); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        .reveal-count {
          animation: reveal-count-kf 700ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes pulse-dot-kf {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        .pulse-dot {
          animation: pulse-dot-kf 1.2s ease-in-out infinite;
        }
        @keyframes soft-glow-kf {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
          50% { box-shadow: 0 0 32px 4px rgba(99, 102, 241, 0.25); }
        }
        .soft-glow {
          animation: soft-glow-kf 1.6s ease-in-out infinite;
        }
      `}</style>

      {/* Pillars row — always mounted so the stagger timing is stable */}
      <div className="flex justify-center gap-3 sm:gap-5 mb-8 perspective-1000">
        {PILLAR_ORDER.map(({ key, label, revealIndex }) => {
          const ju = key === 'hour' ? saju.saju.hour : saju.saju[key];
          return (
            <PillarCard
              key={key}
              ju={ju ?? null}
              label={label}
              revealIndex={revealIndex}
            />
          );
        })}
      </div>

      {/* Phase messages */}
      <div className="h-16 flex flex-col items-center justify-center">
        {phase === 'reading' && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t.revealReading}</span>
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 pulse-dot" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 pulse-dot" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 pulse-dot" style={{ animationDelay: '400ms' }} />
            </span>
          </div>
        )}
        {phase === 'matching' && (
          <div className="flex items-center gap-3 text-sm text-indigo-600 font-medium">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <span>{t.revealMatching}</span>
          </div>
        )}
        {phase === 'results' && (
          <div className="reveal-count text-center">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {t.revealFound(totalMatches)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
