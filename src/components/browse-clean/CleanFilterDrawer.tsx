'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/lib/i18n';
import FilterPanel, { Filters } from '@/components/FilterPanel';
import {
  getUniqueGyeokguks,
  getUniqueNationalities,
  getUniqueIndustries,
  getIljusGroupedByStem,
} from '@/lib/data/enriched';
import type { EnrichedPerson } from '@/lib/saju/types';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (next: Filters) => void;
  people: EnrichedPerson[];
  filteredCount: number;
  onReset: () => void;
}

/**
 * Right-side slide-over that hosts the existing FilterPanel so users
 * still have access to 일주/일간/월지/격국/오행/산업/국적/성별/정렬 — just
 * out of the way until they ask for it.
 */
export default function CleanFilterDrawer({
  open,
  onClose,
  filters,
  onChange,
  people,
  filteredCount,
  onReset,
}: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  // Lock body scroll while the drawer is open + close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-gray-900/30 transition-opacity duration-200 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isKo ? '필터' : 'Filters'}
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[380px] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isKo ? '필터' : 'Filters'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={isKo ? '닫기' : 'Close'}
            className="p-1.5 -mr-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          <FilterPanel
            filters={filters}
            onChange={onChange}
            availableGyeokguks={getUniqueGyeokguks(people)}
            availableNationalities={getUniqueNationalities(people)}
            availableIndustries={getUniqueIndustries(people)}
            availableIljus={getIljusGroupedByStem(people)}
            totalCount={people.length}
            filteredCount={filteredCount}
          />
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={onReset}
            className="text-[13px] text-gray-500 hover:text-gray-900 border-b border-transparent hover:border-gray-900 transition-colors"
          >
            {isKo ? '전체 초기화' : 'Reset all'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-[13px] font-semibold text-white bg-gray-900 rounded-full hover:bg-gray-700 transition-colors"
          >
            {isKo ? `${filteredCount}명 보기` : `Show ${filteredCount}`}
          </button>
        </div>
      </aside>
    </>
  );
}
