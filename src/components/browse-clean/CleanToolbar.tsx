'use client';

import { useLanguage } from '@/lib/i18n';

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
}

/**
 * Single-line toolbar that replaces the dense sidebar.
 * - Big search input on the left
 * - "필터" disclosure button on the right with a count badge
 * The full filter panel slides over from the side when the button is clicked.
 */
export default function CleanToolbar({
  search,
  onSearchChange,
  activeFilterCount,
  onOpenFilters,
}: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  return (
    <div className="sticky top-0 z-30 -mx-6 px-6 py-4 bg-white/85 backdrop-blur-md mb-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isKo ? '이름·회사·산업 검색…' : 'Search name, company, industry…'}
            className="w-full h-11 pl-10 pr-4 text-[14px] bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
          />
        </div>
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex items-center gap-2 h-11 px-4 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="7" y1="12" x2="17" y2="12" />
            <line x1="10" y1="18" x2="14" y2="18" />
          </svg>
          {isKo ? '필터' : 'Filters'}
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold text-white bg-gray-900 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
