'use client';

import { useLanguage } from '@/lib/i18n';

/** Tab keys are kept identical to the legacy TabBar so existing
 *  ?tab=match / ?tab=browse URLs keep working. */
export type CleanTab = 'browse' | 'match';

interface Props {
  activeTab: CleanTab;
  onChange: (tab: CleanTab) => void;
  /** When defined, renders a search input in the header. */
  search?: string;
  onSearchChange?: (v: string) => void;
}

/**
 * Top navigation. Logo + tabs on the left, search input in the middle.
 * Everything in one horizontal row to minimise vertical real estate.
 */
export default function CleanNav({
  activeTab,
  onChange,
  search,
  onSearchChange,
}: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  const TabBtn = ({
    value,
    label,
    sublabel,
  }: {
    value: CleanTab;
    label: string;
    sublabel?: string;
  }) => {
    const active = activeTab === value;
    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        aria-pressed={active}
        className={`relative inline-flex items-baseline gap-1.5 px-1 py-1 text-[14px] font-medium transition-colors ${
          active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
        }`}
      >
        <span>{label}</span>
        {sublabel && (
          <span className="text-[11px] text-gray-400 font-normal">{sublabel}</span>
        )}
        {active && (
          <span className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-gray-900" />
        )}
      </button>
    );
  };

  const showSearch = onSearchChange != null;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
        {/* Logo + tabs */}
        <div className="flex items-baseline gap-6 shrink-0">
          <a href="/" className="text-lg font-semibold tracking-tight text-gray-900">
            부자사주
          </a>
          <nav className="flex items-center gap-5" aria-label="primary">
            <TabBtn
              value="browse"
              label={isKo ? '둘러보기' : 'Browse'}
              sublabel={isKo ? '3,300명' : '3.3k'}
            />
            <TabBtn
              value="match"
              label={isKo ? '나랑 비슷한 사주의 부자 알아보기' : 'Match quiz'}
            />
          </nav>
        </div>

        {/* Inline search — only visible on the Browse tab */}
        {showSearch && (
          <div className="relative flex-1 max-w-xl">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={search ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={isKo ? '이름·회사·산업 검색…' : 'Search…'}
              className="w-full h-9 pl-9 pr-3 text-[13px] bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
            />
          </div>
        )}
      </div>
    </header>
  );
}
