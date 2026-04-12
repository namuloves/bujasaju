'use client';

import type { WealthDataPoint, TimelineEvent } from '@/lib/deepBio';

interface Props {
  data: WealthDataPoint[];
  timeline?: TimelineEvent[];
  lang?: string;
  className?: string;
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
export default function WealthChart({ data, timeline = [], lang = 'en', className = '' }: Props) {
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

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.netWorth <= 0) continue;
    const pct = (curr.netWorth - prev.netWorth) / prev.netWorth;

    // Find matching event: exact year, or nearest within ±2 years
    const event = eventsByYear.get(curr.year)
      ?? eventsByYear.get(curr.year - 1)
      ?? eventsByYear.get(curr.year + 1)
      ?? eventsByYear.get(curr.year - 2)
      ?? eventsByYear.get(curr.year + 2);

    if (event) {
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
  const yTicks = [0, maxNet / 2, maxNet].map(v => ({
    value: v,
    y: scaleY(v),
    label: v >= 1 ? `$${v.toFixed(0)}B` : `$${(v * 1000).toFixed(0)}M`,
  }));

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

        {/* Main line */}
        <path d={linePath} fill="none" stroke="#0c45a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {sorted.map((d, i) => {
          const ann = topAnnotations.find(a => a.year === d.year);
          const color = ann ? (ann.type === 'jump' ? '#15803d' : '#ef4444') : '#0c45a7';
          const r = ann ? 4 : 3;
          return (
            <circle
              key={i}
              cx={scaleX(d.year)}
              cy={scaleY(d.netWorth)}
              r={r}
              fill={color}
              stroke="white"
              strokeWidth="1.5"
            />
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
            const bg = ann.type === 'jump' ? 'bg-green-50' : 'bg-red-50';
            const arrow = ann.type === 'jump' ? '↑' : '↓';
            const eventText = lang === 'ko' && ann.eventKo ? ann.eventKo : ann.event;
            return (
              <div key={i} className={`${bg} rounded-md px-2.5 py-1.5 flex items-start gap-1.5`}>
                <span className={`${color} text-xs font-bold shrink-0 mt-px`}>{arrow} {ann.year}</span>
                <span className="text-sm text-gray-600 leading-snug">{eventText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
