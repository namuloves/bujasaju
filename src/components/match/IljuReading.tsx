'use client';

import { useEffect, useState } from 'react';

interface IljuEntry {
  한자: string;
  한줄요약: string;
  핵심키워드: string[];
  종합풀이: string;
  성격: string;
  직업적성: string;
  연애결혼: {
    남자: string;
    여자: string;
  };
  재물건강: string;
  주의점: string;
  개운법: string;
  출처: string[];
}

type IljuDataset = Record<string, IljuEntry>;

let cached: IljuDataset | null = null;
let inflight: Promise<IljuDataset> | null = null;

async function loadIljuData(): Promise<IljuDataset> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch('/saju-data/ilju-summary.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<IljuDataset>;
    })
    .then((d) => {
      cached = d;
      return d;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

interface Props {
  ilju: string;
}

export default function IljuReading({ ilju }: Props) {
  const [entry, setEntry] = useState<IljuEntry | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadIljuData()
      .then((data) => {
        if (cancelled) return;
        const found = data[ilju];
        if (!found) setError(true);
        else setEntry(found);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ilju]);

  if (error) return null;
  if (!entry) {
    return (
      <div className="space-y-2.5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3" />
        <div className="h-3.5 bg-gray-100 rounded w-full" />
        <div className="h-3.5 bg-gray-100 rounded w-11/12" />
        <div className="h-3.5 bg-gray-100 rounded w-4/5" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3">사주 풀이</h2>
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-bold text-gray-900">{ilju}</h3>
          <span className="text-sm text-gray-500">({entry.한자})</span>
        </div>
        <p className="mt-2 text-[15px] text-gray-700 leading-relaxed">
          {entry.한줄요약}
        </p>
      </div>

      {/* Keywords */}
      {entry.핵심키워드.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.핵심키워드.map((kw) => (
            <span
              key={kw}
              className="inline-block px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-full"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* 종합풀이 */}
      <p className="text-[15px] leading-relaxed text-gray-800">
        {entry.종합풀이}
      </p>

      {/* 재물·건강 / 주의점 / 개운법 — collapsible on mobile so the
          downstream "매칭 부자 분석" section doesn't get pushed too far
          below the fold. On md+ screens these stay open as flat sections
          since there's enough vertical room.
          The three sit in their own div so their gap is tight (just the
          shared border line) without inheriting the parent space-y-5. */}
      <div className="md:space-y-5">
        <CollapsibleSection title="재물·건강">
          <p className="text-[15px] leading-relaxed text-gray-800">
            {entry.재물건강}
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="주의점">
          <p className="text-[15px] leading-relaxed text-gray-800">
            {entry.주의점}
          </p>
        </CollapsibleSection>

        <CollapsibleSection title="개운법">
          <p className="text-[15px] leading-relaxed text-gray-800">
            {entry.개운법}
          </p>
        </CollapsibleSection>
      </div>
    </div>
  );
}

/**
 * Section that collapses on mobile (closed by default) and stays expanded
 * on md+ screens. Uses a media-query hook to decide the initial open state
 * so the server-rendered markup is consistent and the user doesn't see a
 * flash of the wrong layout. Tap toggles only on mobile — on desktop the
 * <summary> is non-interactive (cursor: default, no click handler change
 * because `open` is forced on).
 */
function CollapsibleSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  // Match Tailwind's `md` breakpoint (768px). Initialised to false so SSR
  // sees the collapsed-on-mobile state; the effect bumps to true on
  // larger viewports after mount.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <details
      // Force-open on desktop so the section behaves like a normal block.
      // On mobile, the user clicks <summary> to toggle.
      open={isDesktop || undefined}
      className="border-b border-gray-100 md:border-b-0 [&[open]>summary>span.chev]:rotate-180"
    >
      <summary className="flex items-center justify-between py-3 cursor-pointer list-none md:cursor-default md:py-0 [&::-webkit-details-marker]:hidden">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <svg
          className="chev md:hidden text-gray-400 transition-transform duration-200"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <polyline points="3.5 5.25 7 8.75 10.5 5.25" />
        </svg>
      </summary>
      <div className="pb-3 md:pb-0 md:pt-2">{children}</div>
    </details>
  );
}
