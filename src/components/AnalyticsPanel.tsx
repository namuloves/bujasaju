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

import { useDeferredValue, useMemo, useState } from 'react';
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

  // Defer the expensive tallies so typing in the search box stays snappy.
  // React will keep the old bars on screen while it recomputes the new ones
  // in the background, instead of blocking every keystroke on a 3,300-item
  // tally. The visible headline count still updates immediately.
  const deferredPeople = useDeferredValue(filteredPeople);

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
      for (const p of deferredPeople) {
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
    const sorted = tallyBy(deferredPeople, PICKERS[primary]);
    return sorted.slice(0, 6).map(([k, count]) => ({
      key: k,
      label: labelFor(primary, k),
      count,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPeople, primary, lang]);

  // Build the secondary breakdown (top 5). Only when filtered.
  const secondaryItems = useMemo<BreakdownItem[]>(() => {
    if (!hasFilter || !secondary) return [];
    const sorted = tallyBy(deferredPeople, PICKERS[secondary]);
    return sorted.slice(0, 5).map(([k, count]) => ({
      key: k,
      label: labelFor(secondary, k),
      count,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPeople, secondary, hasFilter, lang]);

  // Welcome-state companion: top 10 일주 shown next to the 일간 donut.
  // Only computed on the unfiltered landing view (where the donut is shown
  // and the secondary slot is otherwise empty).
  const welcomeIljuItems = useMemo<BreakdownItem[]>(() => {
    if (hasFilter || primary !== 'ilgan') return [];
    const sorted = tallyBy(deferredPeople, PICKERS.ilju);
    return sorted.slice(0, 8).map(([k, count]) => ({
      key: k,
      label: labelFor('ilju', k),
      count,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPeople, hasFilter, primary, lang]);

  // Full 일주 list for the modal (all 60)
  const allIljuItems = useMemo<BreakdownItem[]>(() => {
    if (hasFilter || primary !== 'ilgan') return [];
    const sorted = tallyBy(deferredPeople, PICKERS.ilju);
    return sorted.map(([k, count]) => ({
      key: k,
      label: labelFor('ilju', k),
      count,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredPeople, hasFilter, primary, lang]);

  const [showFullIljuModal, setShowFullIljuModal] = useState(false);

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

  // Build active filter chips for display
  const activeChips: Array<{ label: string; onRemove: () => void }> = [];
  if (filters.ilgan) activeChips.push({ label: `일간: ${filters.ilgan}`, onRemove: () => onChange({ ...filters, ilgan: '' }) });
  if (filters.ilju) activeChips.push({ label: `일주: ${filters.ilju}`, onRemove: () => onChange({ ...filters, ilju: '' }) });
  if (filters.wolji) activeChips.push({ label: `월지: ${filters.wolji}`, onRemove: () => onChange({ ...filters, wolji: '' }) });
  if (filters.gyeokguk) activeChips.push({ label: `격국: ${filters.gyeokguk}`, onRemove: () => onChange({ ...filters, gyeokguk: '' }) });
  if (filters.nationality) activeChips.push({ label: lang === 'ko' ? `국적: ${nationalityToKorean(filters.nationality)}` : `Country: ${filters.nationality}`, onRemove: () => onChange({ ...filters, nationality: '' }) });
  if (filters.industry) activeChips.push({ label: lang === 'ko' ? `업종: ${industryToKorean(filters.industry)}` : `Industry: ${filters.industry}`, onRemove: () => onChange({ ...filters, industry: '' }) });
  if (filters.gender) activeChips.push({ label: filters.gender === 'M' ? (lang === 'ko' ? '남성' : 'Male') : (lang === 'ko' ? '여성' : 'Female'), onRemove: () => onChange({ ...filters, gender: '' }) });
  if (filters.search) activeChips.push({ label: `"${filters.search}"`, onRemove: () => onChange({ ...filters, search: '' }) });

  const clearAll = () => onChange({ ilgan: '', ilju: '', wolji: '', gyeokguk: '', nationality: '', industry: '', gender: '', sort: filters.sort, search: '' });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm font-semibold text-gray-900">{headline}</div>
        {hasFilter && (
          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">
            {lang === 'ko' ? '필터 초기화' : 'Reset filters'}
          </button>
        )}
      </div>
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {activeChips.map((chip, i) => (
            <button
              key={i}
              onClick={chip.onRemove}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-xs text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              {chip.label}
              <span className="text-indigo-400 text-[10px]">✕</span>
            </button>
          ))}
        </div>
      )}
      <div
        className={`grid gap-x-12 gap-y-4 items-start ${
          secondaryItems.length > 0 || welcomeIljuItems.length > 0
            ? `sm:grid-cols-[auto_auto] sm:justify-start`
            : 'sm:grid-cols-1'
        }`}
      >
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
        {/* Welcome-state: top 8 일주 alongside the 일간 donut. */}
        {welcomeIljuItems.length > 0 && (
          <div>
            <BarChart
              title={t.analyticsTopDayPillar}
              items={welcomeIljuItems}
              onClick={(key) => handleBarClick('ilju', key)}
              activeKey={filters.ilju}
              total={totalCount}
            />
            <button
              onClick={() => setShowFullIljuModal(true)}
              className="mt-2 text-[11px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              {lang === 'ko' ? '전체 보기 →' : 'See all →'}
            </button>
          </div>
        )}
      </div>

      {/* Full 일주 modal */}
      {showFullIljuModal && (
        <FullListModal
          title={t.analyticsTopDayPillar}
          items={allIljuItems}
          onClick={(key) => { handleBarClick('ilju', key); setShowFullIljuModal(false); }}
          activeKey={filters.ilju}
          onClose={() => setShowFullIljuModal(false)}
          total={totalCount}
        />
      )}
    </div>
  );
}

// ─── Bar chart (CSS, no library) ────────────────────────────────────────────

interface BarChartProps {
  title: string;
  items: BreakdownItem[];
  onClick: (key: string) => void;
  activeKey: string;
  total?: number;
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
  // Extra horizontal room for the outer labels ("갑 343 · 10.4%") that
  // replace the old legend list. The donut itself stays centered, but the
  // viewBox is extended 60px on each side so long right/left-anchored labels
  // don't get clipped when the SVG is rendered at narrow widths.
  const labelPad = 60;
  const donutSize = 320;
  const size = donutSize + labelPad * 2;
  const height = 220;
  const cx = size / 2;
  const cy = height / 2;
  const r = 78;
  const innerR = 44; // donut hole
  const labelR = r + 16; // where outer labels anchor
  const hasActive = !!activeKey;

  // Rank items by count (highest = 1). Ties share the same rank is overkill
  // here — stems are only 10 items and ties are fine to break by canonical
  // order (갑을병정...) which is also the incoming items order.
  const rankByKey = new Map<string, number>();
  [...items]
    .map((it, i) => ({ key: it.key, count: it.count, order: i }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .forEach((it, idx) => rankByKey.set(it.key, idx + 1));

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
    // Round to 3 decimals so server-rendered and client-rendered strings match
    // exactly (avoids React hydration mismatches from float serialization drift).
    const f = (n: number) => n.toFixed(3);
    const x1 = f(cx + ro * Math.cos(start));
    const y1 = f(cy + ro * Math.sin(start));
    const x2 = f(cx + ro * Math.cos(end));
    const y2 = f(cy + ro * Math.sin(end));
    const x3 = f(cx + ri * Math.cos(end));
    const y3 = f(cy + ri * Math.sin(end));
    const x4 = f(cx + ri * Math.cos(start));
    const y4 = f(cy + ri * Math.sin(start));
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
      <div className="flex items-center justify-start">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${size} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="max-w-[480px]"
          role="img"
          aria-label={title}
        >
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={r} fill="#f3f4f6" />
          ) : (
            <>
              {slices.map(({ item, start, end, sweep }) => {
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
              })}
              {slices.map(({ item, mid, sweep }) => {
                if (sweep <= 0) return null;
                const isActive = activeKey === item.key;
                const dimmed = hasActive && !isActive;
                const pct = ((item.count / total) * 100).toFixed(1);
                const lx = cx + labelR * Math.cos(mid);
                const ly = cy + labelR * Math.sin(mid);
                // Anchor left/right of the donut based on which half the
                // slice midpoint sits in. Text is drawn outward from the
                // slice so it reads naturally.
                const onRightHalf = Math.cos(mid) >= 0;
                const anchor = onRightHalf ? 'start' : 'end';
                return (
                  <text
                    key={`lbl-${item.key}`}
                    x={lx.toFixed(2)}
                    y={ly.toFixed(2)}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    opacity={dimmed ? 0.35 : 1}
                    className="cursor-pointer select-none"
                    onClick={() => onClick(item.key)}
                  >
                    <tspan
                      style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}
                      className="fill-gray-400"
                    >
                      {rankByKey.get(item.key)}.
                    </tspan>
                    <tspan
                      dx={3}
                      style={{ fontSize: 12, fontWeight: 600 }}
                      className={isActive ? 'fill-indigo-700' : 'fill-gray-800'}
                    >
                      {item.label}
                    </tspan>
                    <tspan
                      dx={4}
                      style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
                      className="fill-gray-500"
                    >
                      {item.count}
                    </tspan>
                    <tspan
                      dx={3}
                      style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}
                      className="fill-gray-400"
                    >
                      · {pct}%
                    </tspan>
                  </text>
                );
              })}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function BarChart({ title, items, onClick, activeKey, total }: BarChartProps) {
  return (
    <div className="max-w-[200px]">
      <div className="text-xs font-medium text-gray-500 mb-2">{title}</div>
      <ul className="space-y-0.5">
        {items.map((item, idx) => {
          const isActive = activeKey === item.key;
          const pct = total ? ((item.count / total) * 100).toFixed(1) : null;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onClick(item.key)}
                className={`w-full flex items-baseline gap-1 rounded-md px-1 py-0.5 text-left transition-colors ${
                  isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-[10px] tabular-nums text-gray-400">
                  {idx + 1}.
                </span>
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-indigo-700' : 'text-gray-800'
                  }`}
                >
                  {item.label}
                </span>
                <span
                  aria-hidden="true"
                  className="flex-1 border-b border-dotted border-gray-300 translate-y-[-3px]"
                />
                <span className="text-[11px] tabular-nums text-gray-500">
                  {item.count}{pct && <span className="text-gray-400 ml-0.5">({pct}%)</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Full list modal ───────────────────────────────────────────────────────

interface FullListModalProps {
  title: string;
  items: BreakdownItem[];
  onClick: (key: string) => void;
  activeKey: string;
  onClose: () => void;
  total?: number;
}

function FullListModal({ title, items, onClick, activeKey, onClose, total }: FullListModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-3">
          <ul className="space-y-0.5">
            {items.map((item, idx) => {
              const isActive = activeKey === item.key;
              const pct = total ? ((item.count / total) * 100).toFixed(1) : null;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onClick(item.key)}
                    className={`w-full flex items-baseline gap-1 rounded-md px-1 py-0.5 text-left transition-colors ${
                      isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-[10px] tabular-nums text-gray-400 w-5 text-right shrink-0">
                      {idx + 1}.
                    </span>
                    <span className={`text-xs font-medium ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {item.label}
                    </span>
                    <span aria-hidden="true" className="flex-1 border-b border-dotted border-gray-300 translate-y-[-3px]" />
                    <span className="text-[11px] tabular-nums text-gray-500">
                      {item.count}{pct && <span className="text-gray-400 ml-0.5">({pct}%)</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
