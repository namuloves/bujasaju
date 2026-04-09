'use client';

/**
 * Small analytics card that appears above the result grid.
 *
 * Behavior (B+welcome):
 * - When NO filter is active: shows a single "전체 N명" + Top 6 일간 card.
 *   Disappears as soon as any filter is set.
 * - When a filter is active: shows two columns
 *     left  = primary breakdown (saju dimension, contextual)
 *     right = secondary breakdown (nationality OR industry)
 * - Bars are pure CSS — no chart library.
 * - Bar items are click-to-filter: clicking "갑진" sets filters.ilju = '갑진'.
 */

import { useMemo } from 'react';
import type { EnrichedPerson } from '@/lib/saju/types';
import type { Filters } from './FilterPanel';
import { useLanguage } from '@/lib/i18n';
import { nationalityToKorean, industryToKorean } from './FilterPanel';
import { CHEON_GAN, STEM_TO_OHAENG } from '@/lib/saju/constants';
import type { CheonGan } from '@/lib/saju/types';

interface Props {
  filteredPeople: EnrichedPerson[];
  totalCount: number;
  filters: Filters;
  onChange: (filters: Filters) => void;
}

type BreakdownItem = {
  key: string;        // raw filter value (e.g. '갑진', 'US')
  label: string;      // display label (localized)
  count: number;
};

type BreakdownDimension = 'ilgan' | 'ilju' | 'gyeokguk' | 'nationality' | 'industry';

// Tally a list of people by a saju/meta key. Returns sorted descending.
function tallyBy(
  people: EnrichedPerson[],
  pick: (p: EnrichedPerson) => string | undefined,
): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const p of people) {
    const k = pick(p);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// Determine which breakdowns to show based on the active filters.
// Returns up to 2 dimensions: a primary (saju) and a secondary (meta).
function pickBreakdowns(filters: Filters): {
  primary: BreakdownDimension;
  secondary: BreakdownDimension | null;
} {
  // Saju dimension: drill one level deeper than the most specific filter.
  // Order of specificity: ilju > ilgan/wolji/gyeokguk > meta
  if (filters.ilju) {
    // Already at the deepest saju level — show 격국 instead.
    return { primary: 'gyeokguk', secondary: 'nationality' };
  }
  if (filters.ilgan) {
    // Drill into 일주 within this 일간.
    return { primary: 'ilju', secondary: 'nationality' };
  }
  if (filters.wolji || filters.gyeokguk) {
    return { primary: 'ilgan', secondary: 'nationality' };
  }
  if (filters.nationality) {
    return { primary: 'ilgan', secondary: 'industry' };
  }
  if (filters.industry) {
    return { primary: 'ilgan', secondary: 'nationality' };
  }
  // gender / search only
  return { primary: 'ilgan', secondary: 'nationality' };
}

const PICKERS: Record<BreakdownDimension, (p: EnrichedPerson) => string | undefined> = {
  ilgan: (p) => p.saju.saju.day.stem,
  ilju: (p) => p.saju.ilju,
  gyeokguk: (p) => p.saju.gyeokguk,
  // For nationality, use the first segment if compound (e.g. "US/ZA" → "US")
  nationality: (p) => p.nationality?.split('/')[0],
  industry: (p) => p.industry,
};

const FILTER_KEY: Record<BreakdownDimension, keyof Filters> = {
  ilgan: 'ilgan',
  ilju: 'ilju',
  gyeokguk: 'gyeokguk',
  nationality: 'nationality',
  industry: 'industry',
};

export default function AnalyticsPanel({
  filteredPeople,
  totalCount,
  filters,
  onChange,
}: Props) {
  const { t, lang } = useLanguage();

  // Is any filter active? (sort and search don't count as "filtering" the
  // analytics — sort doesn't change the set, and search is its own thing).
  const hasFilter =
    !!(filters.ilgan || filters.ilju || filters.wolji || filters.gyeokguk ||
       filters.nationality || filters.industry || filters.gender || filters.search);

  const { primary, secondary } = useMemo(() => pickBreakdowns(filters), [filters]);

  // Localize a key into a display label.
  const labelFor = (dim: BreakdownDimension, key: string): string => {
    if (lang !== 'ko') return key;
    if (dim === 'nationality') return nationalityToKorean(key);
    if (dim === 'industry') return industryToKorean(key);
    return key; // saju keys are already in Korean
  };

  // Build the primary breakdown.
  // Special case: for 일간 we show ALL 10 천간 in canonical order (갑을병정무기경신임계)
  // so the pie chart is stable and memorable. For everything else, top 6.
  const primaryItems = useMemo<BreakdownItem[]>(() => {
    if (primary === 'ilgan') {
      const counts = new Map<string, number>();
      for (const p of filteredPeople) {
        const k = PICKERS.ilgan(p);
        if (!k) continue;
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
      return CHEON_GAN.map((stem) => ({
        key: stem,
        label: stem,
        count: counts.get(stem) ?? 0,
      }));
    }
    const sorted = tallyBy(filteredPeople, PICKERS[primary]);
    return sorted.slice(0, 6).map(([k, count]) => ({
      key: k,
      label: labelFor(primary, k),
      count,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPeople, primary, lang]);

  // Build the secondary breakdown (top 5). Only when filtered.
  const secondaryItems = useMemo<BreakdownItem[]>(() => {
    if (!hasFilter || !secondary) return [];
    const sorted = tallyBy(filteredPeople, PICKERS[secondary]);
    return sorted.slice(0, 5).map(([k, count]) => ({
      key: k,
      label: labelFor(secondary, k),
      count,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPeople, secondary, hasFilter, lang]);

  // Don't render if there's nothing to show.
  if (filteredPeople.length === 0) return null;
  if (primaryItems.length === 0) return null;

  // Headline
  const filteredCount = filteredPeople.length;
  const pct = ((filteredCount / totalCount) * 100).toFixed(1);
  const headline = hasFilter
    ? t.analyticsHeadlineFiltered(filteredCount, pct)
    : t.analyticsHeadlineWelcome(totalCount);

  // Section title for the primary breakdown
  const primaryTitle =
    primary === 'ilgan' ? t.analyticsTopDayMaster :
    primary === 'ilju' ? t.analyticsTopDayPillar :
    primary === 'gyeokguk' ? t.analyticsTopPattern :
    primary === 'nationality' ? t.analyticsTopNationality :
    t.analyticsTopIndustry;

  const secondaryTitle =
    secondary === 'nationality' ? t.analyticsTopNationality :
    secondary === 'industry' ? t.analyticsTopIndustry :
    null;

  // Click-to-filter handler. If the clicked item is already the active filter,
  // unset it (toggle).
  const handleBarClick = (dim: BreakdownDimension, key: string) => {
    const filterKey = FILTER_KEY[dim];
    const current = filters[filterKey];
    const next: Filters = { ...filters, [filterKey]: current === key ? '' : key };
    // Mirror FilterPanel's interlock: setting ilju clears ilgan, and vice versa.
    if (filterKey === 'ilju' && next.ilju) next.ilgan = '';
    if (filterKey === 'ilgan' && next.ilgan) next.ilju = '';
    onChange(next);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <div className="text-sm font-semibold text-gray-900 mb-3">{headline}</div>
      <div className={`grid gap-4 ${secondaryItems.length > 0 ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        {primary === 'ilgan' ? (
          <PieChart
            title={primaryTitle}
            items={primaryItems}
            onClick={(key) => handleBarClick('ilgan', key)}
            activeKey={filters.ilgan}
          />
        ) : (
          <BarChart
            title={primaryTitle}
            items={primaryItems}
            onClick={(key) => handleBarClick(primary, key)}
            activeKey={filters[FILTER_KEY[primary]]}
          />
        )}
        {secondaryItems.length > 0 && secondary && secondaryTitle && (
          <BarChart
            title={secondaryTitle}
            items={secondaryItems}
            onClick={(key) => handleBarClick(secondary, key)}
            activeKey={filters[FILTER_KEY[secondary]]}
          />
        )}
      </div>
    </div>
  );
}

// ─── Bar chart (CSS, no library) ────────────────────────────────────────────

interface BarChartProps {
  title: string;
  items: BreakdownItem[];
  onClick: (key: string) => void;
  activeKey: string;
}

// ─── Pie chart (SVG, no library) ────────────────────────────────────────────
// Used for the 일간 breakdown: 10 slices in canonical 갑을병정무기경신임계 order,
// colored by 오행 with 양(+) slightly darker than 음(−).

const OHAENG_COLORS: Record<string, { yang: string; eum: string }> = {
  // 목 (green), 화 (red), 토 (yellow/brown), 금 (gray), 수 (blue)
  '목': { yang: '#16a34a', eum: '#4ade80' }, // 갑 / 을
  '화': { yang: '#dc2626', eum: '#f87171' }, // 병 / 정
  '토': { yang: '#ca8a04', eum: '#facc15' }, // 무 / 기
  '금': { yang: '#64748b', eum: '#cbd5e1' }, // 경 / 신
  '수': { yang: '#0c45a7', eum: '#60a5fa' }, // 임 / 계
};

// 갑(양) 을(음) 병(양) 정(음) 무(양) 기(음) 경(양) 신(음) 임(양) 계(음)
function stemColor(stem: string): string {
  const oh = STEM_TO_OHAENG[stem as CheonGan];
  if (!oh) return '#9ca3af';
  const idx = CHEON_GAN.indexOf(stem as CheonGan);
  const isYang = idx % 2 === 0;
  return isYang ? OHAENG_COLORS[oh].yang : OHAENG_COLORS[oh].eum;
}

interface PieChartProps {
  title: string;
  items: BreakdownItem[];
  onClick: (key: string) => void;
  activeKey: string;
}

function PieChart({ title, items, onClick, activeKey }: PieChartProps) {
  const total = items.reduce((sum, it) => sum + it.count, 0);
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const innerR = 44; // donut hole
  const hasActive = !!activeKey;

  // Build slices. Skip zero-count items.
  let angle = -Math.PI / 2; // start at 12 o'clock
  const slices = items.map((item) => {
    const frac = total > 0 ? item.count / total : 0;
    const sweep = frac * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    // midpoint angle for label placement
    const mid = (start + end) / 2;
    return { item, start, end, sweep, mid, frac };
  });

  function arcPath(start: number, end: number, ri: number, ro: number): string {
    const large = end - start > Math.PI ? 1 : 0;
    const x1 = cx + ro * Math.cos(start);
    const y1 = cy + ro * Math.sin(start);
    const x2 = cx + ro * Math.cos(end);
    const y2 = cy + ro * Math.sin(end);
    const x3 = cx + ri * Math.cos(end);
    const y3 = cy + ri * Math.sin(end);
    const x4 = cx + ri * Math.cos(start);
    const y4 = cy + ri * Math.sin(start);
    return [
      `M ${x1} ${y1}`,
      `A ${ro} ${ro} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${ri} ${ri} 0 ${large} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');
  }

  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-2">{title}</div>
      <div className="flex items-center gap-4">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="shrink-0"
          role="img"
          aria-label={title}
        >
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" />
          ) : (
            slices.map(({ item, start, end, sweep }) => {
              if (sweep <= 0) return null;
              const isActive = activeKey === item.key;
              const dimmed = hasActive && !isActive;
              // Tiny gap between slices using a slight inward shrink
              const gap = 0.01;
              const s = start + gap / 2;
              const e = end - gap / 2;
              return (
                <path
                  key={item.key}
                  d={arcPath(s, e, innerR, r)}
                  fill={stemColor(item.key)}
                  opacity={dimmed ? 0.25 : 1}
                  stroke="#fff"
                  strokeWidth={1}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => onClick(item.key)}
                >
                  <title>{`${item.label} · ${item.count}`}</title>
                </path>
              );
            })
          )}
          {/* center total */}
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            className="fill-gray-900"
            style={{ fontSize: 16, fontWeight: 700 }}
          >
            {total.toLocaleString()}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            className="fill-gray-400"
            style={{ fontSize: 10 }}
          >
            일간
          </text>
        </svg>
        {/* Legend — all 10 stems in canonical order */}
        <ul className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1 min-w-0">
          {items.map((item) => {
            const isActive = activeKey === item.key;
            const dimmed = hasActive && !isActive;
            const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0.0';
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={() => onClick(item.key)}
                  className={`w-full flex items-center gap-1.5 rounded px-1 py-0.5 text-left transition-colors ${
                    isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  } ${dimmed ? 'opacity-50' : ''}`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: stemColor(item.key) }}
                  />
                  <span
                    className={`text-xs font-medium ${
                      isActive ? 'text-indigo-700' : 'text-gray-800'
                    }`}
                  >
                    {item.label}
                  </span>
                  <span className="ml-auto text-[10px] tabular-nums text-gray-500">
                    {item.count}
                    <span className="text-gray-400"> · {pct}%</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function BarChart({ title, items, onClick, activeKey }: BarChartProps) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((item, idx) => {
          const pct = (item.count / max) * 100;
          const isActive = activeKey === item.key;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onClick(item.key)}
                className={`group w-full flex items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors ${
                  isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="w-4 text-[10px] tabular-nums text-gray-400">
                  {idx + 1}.
                </span>
                <span
                  className={`w-14 truncate text-xs font-medium ${
                    isActive ? 'text-indigo-700' : 'text-gray-800'
                  }`}
                >
                  {item.label}
                </span>
                <span className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <span
                    className={`block h-full rounded-full transition-colors ${
                      isActive ? 'bg-indigo-500' : 'bg-indigo-300 group-hover:bg-indigo-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="w-10 text-right text-[11px] tabular-nums text-gray-500">
                  {item.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
