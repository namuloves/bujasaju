'use client';

import { useState, useCallback } from 'react';
import type { WealthDataPoint, TimelineEvent } from '@/lib/deepBio';

interface Props {
  data: WealthDataPoint[];
  timeline?: TimelineEvent[];
  lang?: string;
  className?: string;
  source?: string;
}

interface Annotation {
  year: number;
  netWorth: number;
  pctChange: number;
  event: string;
  eventKo?: string;
  type: 'jump' | 'fall';
}

/**
 * SVG line chart showing net worth over time.
 * Highlights significant jumps (green) and falls (red) with
 * annotations tied to career timeline events.
 */
function formatWealth(v: number, lang: string): string {
  if (lang === 'ko') {
    const jo = v * 1.4;
    if (jo >= 1) return `약 ${jo.toFixed(1)}조원`;
    if (jo > 0) return `약 ${(jo * 10000).toFixed(0)}억원`;
    return '0';
  }
  return v >= 1 ? `$${v.toFixed(1)}B` : `$${(v * 1000).toFixed(0)}M`;
}

export default function WealthChart({ data, timeline = [], lang = 'en', className = '', source }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (data.length < 2) return null;

  const sorted = [...data].sort((a, b) => a.year - b.year);
  const minYear = sorted[0].year;
  const maxYear = sorted[sorted.length - 1].year;
  const maxNet = Math.max(...sorted.map(d => d.netWorth));
  const minNet = Math.min(0, ...sorted.map(d => d.netWorth));

  // Detect significant changes (>40% YoY or >30% drop)
  const annotations: Annotation[] = [];
  const eventsByYear = new Map<number, TimelineEvent>();
  for (const e of timeline) {
    // Keep latest event per year
    eventsByYear.set(e.year, e);
  }

  const usedEventYears = new Set<number>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.netWorth <= 0) continue;
    const pct = (curr.netWorth - prev.netWorth) / prev.netWorth;

    // Find matching event: exact year, or nearest within ±2 years
    // Skip events already claimed by another data point to avoid duplicates
    let event: TimelineEvent | undefined;
    let matchedYear: number | undefined;
    for (const offset of [0, -1, 1, -2, 2]) {
      const y = curr.year + offset;
      if (usedEventYears.has(y)) continue;
      const candidate = eventsByYear.get(y);
      if (candidate) { event = candidate; matchedYear = y; break; }
    }

    if (event && matchedYear !== undefined) {
      usedEventYears.add(matchedYear);
      annotations.push({
        year: curr.year,
        netWorth: curr.netWorth,
        pctChange: pct,
        event: event.event,
        eventKo: event.eventKo,
        type: pct >= 0 ? 'jump' : 'fall',
      });
    }
  }

  // Pick top 3 annotations by biggest absolute change
  annotations.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
  const topAnnotations: Annotation[] = annotations.slice(0, 3);
  // Sort by year for display
  topAnnotations.sort((a, b) => a.year - b.year);

  const W = 400;
  const H = 200;
  const PAD = { top: 20, right: 20, bottom: 36, left: 52 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const scaleX = (year: number) =>
    PAD.left + ((year - minYear) / (maxYear - minYear || 1)) * plotW;
  const scaleY = (net: number) =>
    PAD.top + plotH - ((net - minNet) / (maxNet - minNet || 1)) * plotH;

  // SVG path
  const points = sorted.map(d => `${scaleX(d.year)},${scaleY(d.netWorth)}`);
  const linePath = `M${points.join(' L')}`;

  // Gradient fill area
  const areaPath = `${linePath} L${scaleX(maxYear)},${scaleY(0)} L${scaleX(minYear)},${scaleY(0)} Z`;

  // Y-axis labels (3 ticks)
  // 1 USD ≈ 1,400 KRW → $1B ≈ 1.4조원
  const USD_TO_JO = 1.4; // billions USD → 조원
  const yTicks = [0, maxNet / 2, maxNet].map(v => {
    let label: string;
    if (lang === 'ko') {
      const jo = v * USD_TO_JO;
      label = jo >= 1 ? `${jo.toFixed(0)}조` : jo > 0 ? `${(jo * 10000).toFixed(0)}억` : '0';
    } else {
      label = v >= 1 ? `$${v.toFixed(0)}B` : `$${(v * 1000).toFixed(0)}M`;
    }
    return { value: v, y: scaleY(v), label };
  });

  // X-axis labels (first, middle, last year)
  const midYear = Math.round((minYear + maxYear) / 2);
  const xTicks = [minYear, midYear, maxYear].map(year => ({
    year,
    x: scaleX(year),
  }));

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto max-h-[380px] lg:max-h-[440px]"
        aria-label="Net worth over time"
      >
        <defs>
          <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c45a7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0c45a7" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={tick.y}
            x2={W - PAD.right}
            y2={tick.y}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#wealthGrad)" />

        {/* Main line (rendered first so colored segments appear on top) */}
        <path d={linePath} fill="none" stroke="#0c45a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Highlight segments for jumps/falls */}
        {topAnnotations.map((ann, i) => {
          const idx = sorted.findIndex(d => d.year === ann.year);
          if (idx <= 0) return null;
          const prev = sorted[idx - 1];
          const curr = sorted[idx];
          const color = ann.type === 'jump' ? '#15803d' : '#ef4444';
          return (
            <line
              key={`seg-${i}`}
              x1={scaleX(prev.year)}
              y1={scaleY(prev.netWorth)}
              x2={scaleX(curr.year)}
              y2={scaleY(curr.netWorth)}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}

        {/* Data points + interactive hit areas */}
        {sorted.map((d, i) => {
          const ann = topAnnotations.find(a => a.year === d.year);
          const color = ann ? (ann.type === 'jump' ? '#15803d' : '#ef4444') : '#0c45a7';
          const isActive = activeIdx === i;
          const r = isActive ? 5 : ann ? 4 : 3;
          const cx = scaleX(d.year);
          const cy = scaleY(d.netWorth);
          return (
            <g key={i}>
              {/* Invisible hit area for easier touch/click */}
              <circle
                cx={cx}
                cy={cy}
                r={16}
                fill="transparent"
                stroke="transparent"
                onMouseEnter={() => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(null)}
                onClick={() => setActiveIdx(prev => prev === i ? null : i)}
                style={{ cursor: 'pointer' }}
              />
              {/* Visible dot */}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                stroke="white"
                strokeWidth="1.5"
                style={{ pointerEvents: 'none', transition: 'r 0.15s' }}
              />
              {/* Tooltip */}
              {isActive && (() => {
                const label = `${d.year}  ${formatWealth(d.netWorth, lang)}`;
                const boxW = lang === 'ko' ? 110 : 90;
                // Keep tooltip within SVG bounds
                let tx = cx - boxW / 2;
                if (tx < 4) tx = 4;
                if (tx + boxW > W - 4) tx = W - boxW - 4;
                const ty = Math.max(4, cy - 30);
                return (
                  <g>
                    {/* Vertical guide line */}
                    <line x1={cx} y1={cy + 6} x2={cx} y2={scaleY(0)} stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="3,3" />
                    {/* Tooltip box */}
                    <rect x={tx} y={ty} width={boxW} height={22} rx={4} fill="#1e293b" opacity={0.92} />
                    <text
                      x={tx + boxW / 2}
                      y={ty + 15}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill="white"
                    >
                      {label}
                    </text>
                  </g>
                );
              })()}
            </g>
          );
        })}

        {/* Annotations shown as cards below the chart instead of in-SVG text */}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={PAD.left - 4}
            y={tick.y + 3}
            textAnchor="end"
            className="fill-gray-400"
            fontSize="12"
          >
            {tick.label}
          </text>
        ))}

        {/* X-axis labels */}
        {xTicks.map((tick, i) => (
          <text
            key={i}
            x={tick.x}
            y={H - 4}
            textAnchor="middle"
            className="fill-gray-400"
            fontSize="12"
          >
            {tick.year}
          </text>
        ))}
      </svg>

      {/* Event annotations below chart — always on mobile, also on desktop as supplement */}
      {topAnnotations.length > 0 && (
        <div className="mt-2 space-y-1">
          {topAnnotations.map((ann, i) => {
            const color = ann.type === 'jump' ? 'text-green-800' : 'text-red-500';
            const bg = ann.type === 'jump' ? 'bg-green-50/0' : 'bg-red-50/0';
            const arrow = ann.type === 'jump' ? '↑' : '↓';
            const rawText = lang === 'ko' && ann.eventKo ? ann.eventKo : ann.event;
            const eventText = rawText.length > 40 ? rawText.slice(0, 40) + '…' : rawText;
            return (
              <div key={i} className={`${bg} rounded-md px-2.5 py-1.5 flex items-start gap-1.5`}>
                <span className={`${color} text-[11px] font-bold shrink-0 mt-px`}>{arrow} {ann.year}</span>
                <span className="text-xs text-gray-600 leading-snug">{eventText}</span>
              </div>
            );
          })}
        </div>
      )}

      {source && (
        <p className="mt-1.5 text-[10px] text-gray-500 text-right">
          {lang === 'ko' ? '출처' : 'Source'}: {source}
        </p>
      )}
    </div>
  );
}
