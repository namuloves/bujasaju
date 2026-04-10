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

    // Find matching event: exact year match only (year-1 causes duplicates)
    const event = eventsByYear.get(curr.year);

    if (pct >= 0.5 && event) {
      annotations.push({
        year: curr.year,
        netWorth: curr.netWorth,
        pctChange: pct,
        event: event.event,
        eventKo: event.eventKo,
        type: 'jump',
      });
    } else if (pct <= -0.25 && event) {
      annotations.push({
        year: curr.year,
        netWorth: curr.netWorth,
        pctChange: pct,
        event: event.event,
        eventKo: event.eventKo,
        type: 'fall',
      });
    }
  }

  // Pick top annotations: ensure mix of jumps and falls
  annotations.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange));
  const jumps = annotations.filter(a => a.type === 'jump');
  const falls = annotations.filter(a => a.type === 'fall');
  const topAnnotations: Annotation[] = [];
  // Always include the biggest fall if there is one
  if (falls.length > 0) {
    topAnnotations.push(falls[0]);
    topAnnotations.push(...jumps.slice(0, 2));
  } else {
    topAnnotations.push(...jumps.slice(0, 3));
  }
  // Sort by year for display
  topAnnotations.sort((a, b) => a.year - b.year);

  const W = 320;
  const H = topAnnotations.length > 0 ? 200 : 160;
  const PAD = { top: 16, right: 16, bottom: 28, left: 48 };
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
        className="w-full h-auto max-h-[200px] md:max-h-[250px]"
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
          const color = ann.type === 'jump' ? '#22c55e' : '#ef4444';
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
          const color = ann ? (ann.type === 'jump' ? '#22c55e' : '#ef4444') : '#0c45a7';
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

        {/* Annotation labels */}
        {topAnnotations.map((ann, i) => {
          const cx = scaleX(ann.year);
          const cy = scaleY(ann.netWorth);
          const pctLabel = ann.type === 'jump'
            ? `+${Math.round(ann.pctChange * 100)}%`
            : `${Math.round(ann.pctChange * 100)}%`;
          const color = ann.type === 'jump' ? '#16a34a' : '#dc2626';
          const bgColor = ann.type === 'jump' ? '#f0fdf4' : '#fef2f2';
          // Offset label to avoid overlap: alternate above/below
          const yOffset = i % 2 === 0 ? -8 : 16;
          const eventText = lang === 'ko' && ann.eventKo ? ann.eventKo : ann.event;
          const shortEvent = eventText.length > 20 ? eventText.slice(0, 20) + '…' : eventText;
          // Position the label: try to keep it within bounds
          const labelX = Math.min(Math.max(cx, PAD.left + 40), W - PAD.right - 40);
          return (
            <g key={`ann-${i}`}>
              {/* Background pill */}
              <rect
                x={labelX - 38}
                y={cy + yOffset - 7}
                width="76"
                height="16"
                rx="3"
                fill={bgColor}
                stroke={color}
                strokeWidth="0.5"
                opacity="0.9"
              />
              {/* Year + percentage */}
              <text
                x={labelX}
                y={cy + yOffset + 4}
                textAnchor="middle"
                fontSize="6.5"
                fontWeight="bold"
                fill={color}
              >
                {ann.year} {pctLabel}
              </text>
            </g>
          );
        })}

        {/* Y-axis labels */}
        {yTicks.map((tick, i) => (
          <text
            key={i}
            x={PAD.left - 4}
            y={tick.y + 3}
            textAnchor="end"
            className="fill-gray-400"
            fontSize="8"
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
            fontSize="8"
          >
            {tick.year}
          </text>
        ))}
      </svg>

      {/* Event annotations below chart — mobile only, desktop shows them inside the SVG */}
      {topAnnotations.length > 0 && (
        <div className="mt-2 space-y-1 md:hidden">
          {topAnnotations.map((ann, i) => {
            const color = ann.type === 'jump' ? 'text-green-600' : 'text-red-500';
            const bg = ann.type === 'jump' ? 'bg-green-50' : 'bg-red-50';
            const arrow = ann.type === 'jump' ? '↑' : '↓';
            const pctLabel = ann.type === 'jump'
              ? `+${Math.round(ann.pctChange * 100)}%`
              : `${Math.round(ann.pctChange * 100)}%`;
            const eventText = lang === 'ko' && ann.eventKo ? ann.eventKo : ann.event;
            return (
              <div key={i} className={`${bg} rounded-md px-2.5 py-1.5 flex items-start gap-1.5`}>
                <span className={`${color} text-xs font-bold shrink-0 mt-px`}>{arrow} {ann.year} {pctLabel}</span>
                <span className="text-xs text-gray-600 leading-snug">{eventText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
