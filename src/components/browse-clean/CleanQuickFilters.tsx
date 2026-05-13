'use client';

import { useLanguage } from '@/lib/i18n';
import { CHIP_PRESETS, type PresetId } from './presets';

interface Props {
  activePreset: PresetId | null;
  onChange: (next: PresetId | null) => void;
}

/**
 * Single row of 8 curated preset chips — each chip is an editorial entry
 * point (not a raw facet). Only one preset can be active at a time;
 * tapping the active chip clears it.
 *
 * Each chip has an optional tooltip (revealed on hover) for jargon-heavy
 * presets like 식신격 or 화 부족, per Baymard's recommendation on
 * industry-specific filter labels.
 */
export default function CleanQuickFilters({ activePreset, onChange }: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  return (
    <div className="-mx-6 px-6 mb-10 overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-1.5 pb-1 min-w-max">
        {CHIP_PRESETS.map((preset) => {
          const isActive = activePreset === preset.id;
          const label = isKo ? preset.labelKo : preset.labelEn;
          const tooltip = isKo ? preset.tooltipKo : preset.tooltipEn;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={preset.disabled}
              onClick={() => onChange(isActive ? null : preset.id)}
              aria-pressed={isActive}
              title={tooltip}
              className={`group relative inline-flex items-center gap-1.5 px-3.5 h-9 text-[13px] font-medium rounded-full border whitespace-nowrap transition-colors ${
                preset.disabled
                  ? 'bg-gray-50 text-gray-400 border-dashed border-gray-200 cursor-not-allowed'
                  : isActive
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {preset.dotColor && (
                <span
                  aria-hidden="true"
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: preset.dotColor }}
                />
              )}
              {preset.emoji && <span aria-hidden="true">{preset.emoji}</span>}
              <span>{label}</span>
              {tooltip && !preset.disabled && (
                <span
                  aria-hidden="true"
                  className={`text-[10px] font-bold ${isActive ? 'text-white/70' : 'text-gray-300 group-hover:text-gray-500'}`}
                >
                  ⓘ
                </span>
              )}
              {preset.disabled && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 ml-0.5">
                  {isKo ? '곧' : 'soon'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
