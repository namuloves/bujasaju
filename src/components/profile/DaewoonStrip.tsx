'use client';

import { useEffect, useRef, useState } from 'react';
import type { EnrichedPerson, OHaeng } from '@/lib/saju/types';
import { calculateDaeUnClient, type DaeUnResult, type DaeUnPeriod, type DaeUnRounding } from '@/lib/saju/daewoon-client';

interface Props {
  person: EnrichedPerson;
  /** Start-age rounding. Defaults to the original 'floor'. */
  rounding?: DaeUnRounding;
  /** Use this start age instead of the computed one (e.g. taken from the
   *  person's hand-written reading so the strip and reading agree). */
  startAgeOverride?: number;
  /** Show the calendar year each period starts under its age range. */
  showYears?: boolean;
  /** Scroll the strip so the current period is in view on narrow screens. */
  autoScrollToCurrent?: boolean;
}

/**
 * Background tints for each pillar cell — 25% mixes of the app's actual
 * solid gradient colors (DEFAULT_PALETTE in ColorPicker.tsx). Sit at a
 * matching lightness so 천간 / 지지 cells read as the same visual family
 * but with distinct hues.
 */
const OHAENG_TINT: Record<OHaeng, string> = {
  목: '#d4efdc',  // 25% mix of #56BD7E
  화: '#fde1df',  // 25% mix of #F88681 (updated brand color)
  토: '#fbeacd',  // 25% mix of #EEB059
  금: '#eaeaea',  // 25% mix of #B8B8B8
  수: '#c0dcf4',  // 25% mix of #0087DB
};

function computeAge(birthday: string): number {
  const birth = new Date(birthday + 'T00:00:00+09:00');
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function DaewoonStrip({ person, rounding = 'floor', startAgeOverride, showYears = false, autoScrollToCurrent = false }: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
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
    }, 100, rounding)
      .then((r) => {
        if (cancelled) return;
        if (startAgeOverride !== undefined && startAgeOverride !== r.startAge) {
          // Same pillar sequence, shifted ages.
          setResult({
            ...r,
            startAge: startAgeOverride,
            periods: r.periods.map((p, i) => ({
              ...p,
              startAge: startAgeOverride + i * 10,
              endAge: startAgeOverride + i * 10 + 9,
            })),
          });
        } else {
          setResult(r);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [person.birthday, person.gender, person.saju, rounding, startAgeOverride]);

  // Keep the current period in view on narrow screens. Runs after the
  // strip renders; scrolls only the strip, never the page.
  useEffect(() => {
    if (!autoScrollToCurrent || !result) return;
    const el = scrollerRef.current;
    const cur = el?.querySelector<HTMLElement>('[data-current="true"]');
    if (!el || !cur) return;
    el.scrollLeft = cur.offsetLeft - el.clientWidth / 2 + cur.clientWidth / 2;
  }, [autoScrollToCurrent, result]);

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

  // Show 8 periods, but reversed: latest decade on the left, earliest on
  // the right. Reads like a timeline that grows toward older history as
  // you scroll right (matches the user's mental model — present-first).
  const periods = result.periods.slice(0, 8).slice().reverse();
  const currentAge = computeAge(person.birthday);
  const currentIdx = periods.findIndex(
    (p) => currentAge >= p.startAge && currentAge <= p.endAge,
  );

  return (
    <section>
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-medium text-gray-900">대운 흐름</h3>
          <span className="text-xs text-gray-500">
            {result.isForward ? '순행' : '역행'} · {result.startAge}세 시작
          </span>
        </div>
        {/* One line for the first-time reader: what a 대운 is and how to
            read the strip. Regulars skip it; newcomers otherwise see eight
            boxes of hanja with no way in. */}
        <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
          대운(大運)은 10년마다 바뀌는 운의 계절입니다. 왼쪽이 최근, 오른쪽이 어린 시절이고,
          {currentIdx >= 0 ? ' 파란 칸이 지금 지나고 있는 10년입니다.' : ' 각 칸의 색은 천간·지지의 오행입니다.'}
        </p>
      </div>

      {/* The current-period ring extends past the box edges, so the scroll
          container needs vertical breathing room (py-1) on top of horizontal
          padding (px-1) — otherwise overflow-x-auto clips the ring. */}
      <div ref={scrollerRef} className="relative flex gap-2 overflow-x-auto overflow-y-visible py-1 -mx-1 px-1">
        {periods.map((p, idx) => (
          <DaewoonBox
            key={idx}
            period={p}
            isCurrent={idx === currentIdx}
            startYear={showYears ? Number(person.birthday.slice(0, 4)) + p.startAge : undefined}
          />
        ))}
      </div>
    </section>
  );
}

function DaewoonBox({ period, isCurrent, startYear }: { period: DaeUnPeriod; isCurrent: boolean; startYear?: number }) {
  // Pull tints once and fall back to a neutral gray if the data ever has
  // an unexpected ohaeng value.
  const stemBg = OHAENG_TINT[period.stemElement as OHaeng] ?? '#f3f4f6';
  const branchBg = OHAENG_TINT[period.branchElement as OHaeng] ?? '#f3f4f6';

  return (
    <div
      // Current period gets a soft blue fill — mirrors the same panel used
      // on CompareWithUser to mark a matched pillar, so "you are here" reads
      // the same across screens. Other periods stay neutral.
      data-current={isCurrent ? 'true' : undefined}
      className={`flex-shrink-0 w-[80px] rounded-xl px-1 pt-2 pb-2 text-center ${
        isCurrent ? 'bg-blue-50' : 'bg-gray-50'
      }`}
    >
      <div className={`text-[10px] font-medium text-gray-500 ${startYear ? 'mb-0.5' : 'mb-2'}`}>
        {period.startAge}~{period.endAge}세
      </div>
      {startYear !== undefined && (
        <div className="text-[10px] text-gray-500 mb-2 tabular-nums">{startYear}~</div>
      )}
      <div className="flex flex-col items-center gap-1.5">
        {/* Stem cell — 천간. Background tint follows the stem's ohaeng. */}
        <div className="flex flex-col items-center">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-medium text-gray-900"
            style={{ background: stemBg }}
          >
            {period.stem}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {period.stemElement}
          </div>
        </div>
        {/* Branch cell — 지지. Independently colored by its own ohaeng. */}
        <div className="flex flex-col items-center">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-medium text-gray-900"
            style={{ background: branchBg }}
          >
            {period.branch}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {period.branchElement}
          </div>
        </div>
      </div>
    </div>
  );
}
