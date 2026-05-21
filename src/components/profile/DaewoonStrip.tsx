'use client';

import { useEffect, useState } from 'react';
import type { EnrichedPerson } from '@/lib/saju/types';
import { calculateDaeUnClient, type DaeUnResult, type DaeUnPeriod } from '@/lib/saju/daewoon-client';

interface Props {
  person: EnrichedPerson;
}

// Tailwind color tokens per 오행 — matched to the saju chart for visual continuity.
const OHAENG_BG: Record<string, string> = {
  목: 'bg-emerald-50',
  화: 'bg-rose-50',
  토: 'bg-amber-50',
  금: 'bg-slate-50',
  수: 'bg-sky-50',
};
const OHAENG_BORDER: Record<string, string> = {
  목: 'border-emerald-200',
  화: 'border-rose-200',
  토: 'border-amber-200',
  금: 'border-slate-200',
  수: 'border-sky-200',
};
const OHAENG_TEXT: Record<string, string> = {
  목: 'text-emerald-700',
  화: 'text-rose-700',
  토: 'text-amber-700',
  금: 'text-slate-700',
  수: 'text-sky-700',
};

function computeAge(birthday: string): number {
  const birth = new Date(birthday + 'T00:00:00+09:00');
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function DaewoonStrip({ person }: Props) {
  const [result, setResult] = useState<DaeUnResult | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Skip if we don't have what we need to compute.
    if (!person.birthday || !person.gender) {
      setError(true);
      return;
    }
    calculateDaeUnClient(person.birthday, person.gender, {
      saju: person.saju.saju,
      gyeokguk: person.saju.gyeokguk,
      ilju: person.saju.ilju,
      wolji: person.saju.wolji,
    })
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [person.birthday, person.gender, person.saju]);

  if (error) return null;
  if (!result) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 w-16 bg-gray-100 rounded-lg flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  // Show 8 periods starting from the first one. Most lifetimes won't go past
  // 8 anyway (start age ~5 + 80 years = 85세 covers the whole 8th box).
  const periods = result.periods.slice(0, 8);
  const currentAge = computeAge(person.birthday);
  const currentIdx = periods.findIndex(
    (p) => currentAge >= p.startAge && currentAge <= p.endAge,
  );

  return (
    <section>
      <div className="flex items-baseline gap-2 mb-3">
        <h3 className="text-sm font-bold text-gray-900">⏳ 대운 흐름</h3>
        <span className="text-xs text-gray-500">
          {result.isForward ? '순행' : '역행'} · {result.startAge}세 시작
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {periods.map((p, idx) => (
          <DaewoonBox key={idx} period={p} isCurrent={idx === currentIdx} />
        ))}
      </div>
    </section>
  );
}

function DaewoonBox({ period, isCurrent }: { period: DaeUnPeriod; isCurrent: boolean }) {
  const bg = OHAENG_BG[period.stemElement] ?? 'bg-gray-50';
  const border = OHAENG_BORDER[period.stemElement] ?? 'border-gray-200';
  const text = OHAENG_TEXT[period.stemElement] ?? 'text-gray-700';
  return (
    <div
      className={`flex-shrink-0 w-16 rounded-lg border-2 ${border} ${bg} p-2 text-center ${
        isCurrent ? 'ring-2 ring-indigo-400 ring-offset-1' : ''
      }`}
    >
      <div className="text-[10px] font-semibold text-gray-500">
        {period.startAge}~{period.endAge}세
      </div>
      <div className={`mt-1 text-base font-bold ${text} leading-tight`}>
        {period.stem}
      </div>
      <div className={`text-base font-bold ${text} leading-tight`}>
        {period.branch}
      </div>
      <div className="mt-1 text-[10px] text-gray-500">
        {period.stemElement}/{period.branchElement}
      </div>
    </div>
  );
}
