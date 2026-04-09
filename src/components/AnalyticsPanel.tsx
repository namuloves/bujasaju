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

  // Build the primary breakdown (top 6).
  const primaryItems = useMemo<BreakdownItem[]>(() => {
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
        <BarChart
          title={primaryTitle}
          items={primaryItems}
          onClick={(key) => handleBarClick(primary, key)}
          activeKey={filters[FILTER_KEY[primary]]}
        />
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
