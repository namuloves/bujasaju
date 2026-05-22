'use client';

import { useEffect, useState } from 'react';
import type { OHaeng } from '@/lib/saju/types';

const STORAGE_KEY = 'bujasaju.colorOverrides';

// Default palette — tuned via the in-browser ColorPicker. Softer than the
// original saturated CleanMiniCard pairs to read better at the larger sizes
// used in SajuHero. Update this constant when you tune again.
export const DEFAULT_PALETTE: Record<OHaeng, { from: string; to: string; angle: number }> = {
  목: { from: '#56BD7E', to: '#5EBA82', angle: 116 },
  화: { from: '#F88681', to: '#F47873', angle: 113 },
  토: { from: '#EEB059', to: '#F0B25C', angle: 105 },
  금: { from: '#B8B8B8', to: '#B8B8B8', angle: 109 },
  수: { from: '#0087DB', to: '#0B8BDA', angle: 113 },
};

export type Palette = typeof DEFAULT_PALETTE;

/**
 * Read the user's saved overrides (if any) from localStorage and merge with
 * the default palette. Safe to call from server components — returns the
 * defaults when localStorage isn't available.
 */
export function readPalette(): Palette {
  if (typeof window === 'undefined') return DEFAULT_PALETTE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PALETTE;
    const parsed = JSON.parse(raw) as Partial<Palette>;
    return {
      목: { ...DEFAULT_PALETTE.목, ...parsed.목 },
      화: { ...DEFAULT_PALETTE.화, ...parsed.화 },
      토: { ...DEFAULT_PALETTE.토, ...parsed.토 },
      금: { ...DEFAULT_PALETTE.금, ...parsed.금 },
      수: { ...DEFAULT_PALETTE.수, ...parsed.수 },
    };
  } catch {
    return DEFAULT_PALETTE;
  }
}

export function gradientFor(palette: Palette, oh: OHaeng): string {
  const { from, to, angle } = palette[oh];
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
}

// Event name the picker dispatches when colors change so other components
// (SajuHero) can re-render without a page reload.
const CHANGE_EVENT = 'bujasaju:colors-changed';

export function subscribeToColorChanges(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

function isPickerEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('dev') === 'colors';
}

const OHAENG_LABELS: Record<OHaeng, string> = {
  목: '목 (갑·을)',
  화: '화 (병·정)',
  토: '토 (무·기)',
  금: '금 (경·신)',
  수: '수 (임·계)',
};

export default function ColorPicker() {
  const [enabled, setEnabled] = useState(false);
  const [palette, setPalette] = useState<Palette>(DEFAULT_PALETTE);
  const [collapsed, setCollapsed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');

  // Detect ?dev=colors flag + hydrate from localStorage
  useEffect(() => {
    setEnabled(isPickerEnabled());
    setPalette(readPalette());
  }, []);

  function updateOne(oh: OHaeng, patch: Partial<Palette[OHaeng]>) {
    const next: Palette = { ...palette, [oh]: { ...palette[oh], ...patch } };
    setPalette(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }

  function reset() {
    setPalette(DEFAULT_PALETTE);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }

  function copySnippet() {
    const snippet = `const OHAENG_GRADIENT: Record<OHaeng, string> = {
${(Object.entries(palette) as Array<[OHaeng, Palette[OHaeng]]>)
  .map(
    ([oh, { from, to, angle }]) =>
      `  ${oh}: 'linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)',`,
  )
  .join('\n')}
};`;
    navigator.clipboard.writeText(snippet).then(() => {
      setCopyState('copied');
      setTimeout(() => setCopyState('idle'), 1500);
    });
  }

  if (!enabled) return null;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg hover:bg-gray-800"
      >
        🎨 색상 픽커
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 max-h-[80vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 text-xs">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900">🎨 색상 픽커</h3>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-400 hover:text-gray-700 text-base leading-none w-6 h-6"
          aria-label="접기"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        {(Object.keys(OHAENG_LABELS) as OHaeng[]).map((oh) => {
          const { from, to, angle } = palette[oh];
          const grad = `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
          return (
            <div key={oh} className="border border-gray-200 rounded-lg p-2.5">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded-md shadow-sm"
                  style={{ backgroundImage: grad }}
                />
                <span className="font-semibold text-gray-900">
                  {OHAENG_LABELS[oh]}
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr_auto] gap-x-2 gap-y-1 items-center">
                <label className="text-gray-500">from</label>
                <input
                  type="color"
                  value={from}
                  onChange={(e) => updateOne(oh, { from: e.target.value })}
                  className="w-full h-7 rounded cursor-pointer border border-gray-200"
                />
                <code className="text-[10px] text-gray-500 font-mono">
                  {from}
                </code>

                <label className="text-gray-500">to</label>
                <input
                  type="color"
                  value={to}
                  onChange={(e) => updateOne(oh, { to: e.target.value })}
                  className="w-full h-7 rounded cursor-pointer border border-gray-200"
                />
                <code className="text-[10px] text-gray-500 font-mono">
                  {to}
                </code>

                <label className="text-gray-500">angle</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={angle}
                  onChange={(e) =>
                    updateOne(oh, { angle: Number(e.target.value) })
                  }
                  className="w-full"
                />
                <code className="text-[10px] text-gray-500 font-mono">
                  {angle}°
                </code>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={copySnippet}
          className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
        >
          {copyState === 'copied' ? '복사됨!' : 'TS 스니펫 복사'}
        </button>
        <button
          onClick={reset}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
        >
          리셋
        </button>
      </div>

      <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
        URL에 <code className="bg-gray-100 px-1 rounded">?dev=colors</code>{' '}
        있을 때만 보입니다. 색상은 브라우저에 저장돼요.
      </p>
    </div>
  );
}
