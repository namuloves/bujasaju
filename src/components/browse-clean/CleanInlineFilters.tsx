'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import type { Filters } from '@/components/FilterPanel';
import { nationalityToKorean, industryToKorean } from '@/components/FilterPanel';
import InlineDropdown from './InlineDropdown';

/**
 * Compact inline filter panel. All filter categories on one or two rows,
 * each rendered as a single inline strip: [Label] [chip] [chip] [chip] +N.
 * Optimised for vertical density — meant to live above the fold without
 * pushing the result grid below the viewport.
 */

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  availableNationalities: string[];
  availableIndustries: string[];
  filteredCount: number;
  totalCount: number;
}

interface InlineRowProps {
  label: string;
  options: { value: string; label: string; emoji?: string }[];
  active: string;
  onPick: (value: string) => void;
  /** Number of chips visible before "+N" overflow. */
  visible?: number;
}

function InlineRow({ label, options, active, onPick, visible = 4 }: InlineRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  const shown = expanded ? options : options.slice(0, visible);
  const hidden = options.length - shown.length;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap shrink-0">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1 min-w-0">
        {shown.map((opt) => {
          const isActive = active === opt.value;
          return (
            <button
              key={opt.value || 'all'}
              type="button"
              onClick={() => onPick(isActive ? '' : opt.value)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1 px-2.5 h-7 text-[11.5px] font-medium rounded-full border whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {opt.emoji && <span aria-hidden="true" className="text-[10px]">{opt.emoji}</span>}
              {opt.label}
            </button>
          );
        })}
        {hidden > 0 && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="px-1.5 h-7 text-[11px] font-medium text-gray-400 hover:text-gray-900 transition-colors"
          >
            +{hidden}
          </button>
        )}
        {expanded && options.length > visible && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="px-1.5 h-7 text-[11px] font-medium text-gray-400 hover:text-gray-900 transition-colors"
          >
            {isKo ? '접기' : 'less'}
          </button>
        )}
      </div>
    </div>
  );
}

const ILGAN_OPTIONS = [
  { value: '갑', label: '갑', emoji: '🌳' },
  { value: '병', label: '병', emoji: '🌅' },
  { value: '무', label: '무', emoji: '🏔️' },
  { value: '경', label: '경', emoji: '⚔️' },
  { value: '임', label: '임', emoji: '🌊' },
  { value: '을', label: '을', emoji: '🌷' },
  { value: '정', label: '정', emoji: '🔥' },
  { value: '기', label: '기', emoji: '🖼️' },
  { value: '신', label: '신', emoji: '💎' },
  { value: '계', label: '계', emoji: '💧' },
];

const WOLJI_OPTIONS = [
  '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해', '자', '축',
].map((v) => ({ value: v, label: v }));

const MISSING_OPTIONS = [
  { value: '목', label: '목' },
  { value: '화', label: '화' },
  { value: '토', label: '토' },
  { value: '금', label: '금' },
  { value: '수', label: '수' },
];

export default function CleanInlineFilters({
  filters,
  onChange,
  availableNationalities,
  availableIndustries,
  filteredCount,
  totalCount,
}: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  const update = (key: keyof Filters, value: string) => {
    const next = { ...filters, [key]: value };
    if (key === 'ilgan' && value) next.ilju = '';
    if (key === 'ilju' && value) next.ilgan = '';
    onChange(next);
  };

  const clearAll = () => {
    onChange({
      ilgan: '', ilju: '', wolji: '', gyeokguk: '', search: '',
      nationality: '', industry: '', industryExclude: '', gender: '',
      wealthOrigin: '', missingOhaeng: '', sort: 'netWorth_desc',
    });
  };

  const hasAny =
    !!filters.ilgan || !!filters.ilju || !!filters.wolji || !!filters.gyeokguk ||
    !!filters.nationality || !!filters.industry || !!filters.gender ||
    !!filters.wealthOrigin || !!filters.missingOhaeng;

  const PINNED_COUNTRIES = ['KR', 'US', 'JP', 'CN', 'IN', 'DE', 'GB', 'FR'];
  const nationalityOptions = [
    ...PINNED_COUNTRIES.map((c) => ({
      value: c,
      label: isKo ? nationalityToKorean(c) : c,
    })),
    ...availableNationalities
      .filter((c) => !PINNED_COUNTRIES.includes(c))
      .map((c) => ({ value: c, label: isKo ? nationalityToKorean(c) : c })),
  ];

  const industryOptions = availableIndustries.map((ind) => ({
    value: ind,
    label: isKo ? industryToKorean(ind) : ind,
  }));

  return (
    <section
      aria-label={isKo ? '필터' : 'Filters'}
      className="mb-8 border border-gray-100 rounded-xl bg-white px-4 py-3 relative"
    >
      {/* Clear-all link, only when filters are active. Floats top-right
          of the filter panel so it doesn't add a permanent row. */}
      {hasAny && (
        <button
          type="button"
          onClick={clearAll}
          className="absolute top-3 right-4 text-[11.5px] text-gray-500 hover:text-gray-900 transition-colors"
        >
          {isKo ? '초기화' : 'Clear'}
        </button>
      )}

      {/* Row 1: 국적 · 산업 · 특징 · 성별 (4 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-x-4 gap-y-2 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap shrink-0">
            {isKo ? '국적' : 'Country'}
          </span>
          <InlineDropdown
            placeholder={isKo ? `전체 ${nationalityOptions.length}개국` : `All ${nationalityOptions.length} countries`}
            value={filters.nationality}
            options={nationalityOptions}
            onChange={(v) => update('nationality', v)}
          />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap shrink-0">
            {isKo ? '산업' : 'Industry'}
          </span>
          <InlineDropdown
            placeholder={isKo ? `전체 ${industryOptions.length}개 산업` : `All ${industryOptions.length} industries`}
            value={filters.industry}
            options={industryOptions}
            onChange={(v) => update('industry', v)}
          />
        </div>
        <InlineRow
          label={isKo ? '특징' : 'Story'}
          options={[
            { value: 'self-made', label: isKo ? '자수성가' : 'Self-made' },
            { value: 'inherited', label: isKo ? '상속' : 'Inherited' },
          ]}
          active={filters.wealthOrigin}
          onPick={(v) => update('wealthOrigin', v)}
          visible={2}
        />
        <InlineRow
          label={isKo ? '성별' : 'Gender'}
          options={[
            { value: 'F', label: isKo ? '여성' : 'Women' },
            { value: 'M', label: isKo ? '남성' : 'Men' },
          ]}
          active={filters.gender}
          onPick={(v) => update('gender', v)}
          visible={2}
        />
      </div>

      {/* Row 2: 일간 (wide) · 결핍 · 월지 — flex with proportional widths */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-x-4 gap-y-2">
        <div className="flex-[2.4_2.4_0%] min-w-0">
          <InlineRow
            label={isKo ? '일간' : 'Stem'}
            options={ILGAN_OPTIONS}
            active={filters.ilgan}
            onPick={(v) => update('ilgan', v)}
            visible={10}
          />
        </div>
        <div className="flex-[0.9_0.9_0%] min-w-0">
          <InlineRow
            label={isKo ? '결핍' : 'Missing'}
            options={MISSING_OPTIONS}
            active={filters.missingOhaeng}
            onPick={(v) => update('missingOhaeng', v)}
            visible={5}
          />
        </div>
        <div className="flex-[1.1_1.1_0%] min-w-0">
          <InlineRow
            label={isKo ? '월지' : 'Branch'}
            options={WOLJI_OPTIONS}
            active={filters.wolji}
            onPick={(v) => update('wolji', v)}
            visible={6}
          />
        </div>
      </div>
    </section>
  );
}
