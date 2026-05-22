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
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl">✨</span>
          <h2 className="text-base font-bold text-gray-900">사주 풀이</h2>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-bold text-gray-900">{ilju}</h3>
          <span className="text-sm text-gray-500">({entry.한자})</span>
        </div>
        <p className="mt-2 text-[15px] italic text-indigo-700 leading-relaxed">
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

      {/* 재물·건강 */}
      <Section emoji="💰" title="재물·건강">
        <p className="text-[15px] leading-relaxed text-gray-800">
          {entry.재물건강}
        </p>
      </Section>

      {/* 주의점 */}
      <Section emoji="⚠️" title="주의점">
        <p className="text-[15px] leading-relaxed text-gray-800">
          {entry.주의점}
        </p>
      </Section>

      {/* 개운법 */}
      <Section emoji="🌱" title="개운법">
        <p className="text-[15px] leading-relaxed text-gray-800">
          {entry.개운법}
        </p>
      </Section>
    </div>
  );
}

function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-base">{emoji}</span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}
