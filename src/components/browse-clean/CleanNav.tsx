'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/i18n';

/** Tab keys are kept identical to the legacy TabBar so existing
 *  ?tab=match / ?tab=browse URLs keep working. */
export type CleanTab = 'browse' | 'match';

interface Props {
  /**
   * Which tab is currently showing. Omit on standalone pages (/about,
   * /privacy, /terms) — none of the tabs is "current" there, so none gets
   * the underline.
   */
  activeTab?: CleanTab;
  /**
   * Tab click handler. Omit on standalone pages: without it the tabs render
   * as plain links to `/?tab=…` instead of buttons, because there is no tab
   * state on those pages to switch. See the TabBtn comment.
   */
  onChange?: (tab: CleanTab) => void;
  /** When defined, renders a search input in the header. */
  search?: string;
  onSearchChange?: (v: string) => void;
  /** Total people count shown as the Browse tab sublabel. */
  peopleCount?: number;
}

/**
 * Top navigation. Logo + tabs on the left, search input in the middle.
 * Everything in one horizontal row to minimise vertical real estate.
 *
 * Serves two cases:
 *   - The tabbed pages (/ and /browse-clean) pass activeTab + onChange and
 *     get interactive tab buttons.
 *   - Standalone pages pass neither and get the same bar with link tabs, so
 *     the site header is consistent everywhere and there is always a way
 *     back into the app.
 */
export default function CleanNav({
  activeTab,
  onChange,
  search,
  onSearchChange,
  peopleCount,
}: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  // Format the people count as the Browse sublabel. Fall back to a static
  // approximation if no count was provided.
  const browseSublabel = (() => {
    if (peopleCount == null) return isKo ? '3,300명' : '3.3k';
    if (isKo) return `${peopleCount.toLocaleString('ko-KR')}명`;
    if (peopleCount >= 1000) return `${(peopleCount / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return String(peopleCount);
  })();

  const TabBtn = ({
    value,
    label,
    labelDesktop,
    sublabel,
  }: {
    value: CleanTab;
    label: string;
    /** Optional longer label shown at sm+ breakpoints. Falls back to `label`. */
    labelDesktop?: string;
    sublabel?: string;
  }) => {
    const active = activeTab === value;

    const inner = (
      <>
        {labelDesktop ? (
          <>
            <span className="md:hidden">{label}</span>
            <span className="hidden md:inline">{labelDesktop}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
        {sublabel && (
          <span className="hidden md:inline text-[11px] text-gray-400 font-normal">{sublabel}</span>
        )}
        {active && (
          <span className="absolute left-1 right-1 -bottom-0.5 h-[2px] bg-gray-900" />
        )}
      </>
    );

    const className = `relative inline-flex items-baseline gap-1.5 px-1 py-1 text-[13px] sm:text-[14px] font-medium transition-colors whitespace-nowrap ${
      active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'
    }`;

    // No onChange means there is no tab state to flip — we're on a
    // standalone page. Render a real link so the tab navigates home to the
    // right tab (and so it middle-clicks and right-clicks like a link
    // should). `?tab=` is read by getInitialTab() in app/page.tsx.
    if (!onChange) {
      return (
        <Link href={`/?tab=${value}`} className={className}>
          {inner}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        aria-pressed={active}
        className={className}
      >
        {inner}
      </button>
    );
  };

  const showSearch = onSearchChange != null;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 sm:gap-6">
        {/* Logo + tabs */}
        <div className="flex items-baseline gap-3 sm:gap-6 min-w-0 flex-1 sm:flex-none">
          <a href="/" className="text-lg font-semibold tracking-tight text-gray-900 shrink-0">
            부자사주
          </a>
          <nav className="flex items-center gap-3 sm:gap-5 min-w-0" aria-label="primary">
            <TabBtn
              value="browse"
              label={isKo ? '둘러보기' : 'Browse'}
              sublabel={browseSublabel}
            />
            <TabBtn
              value="match"
              label={isKo ? '내 사주 알아보기' : 'Match quiz'}
              labelDesktop={isKo ? '나랑 비슷한 사주의 부자 알아보기' : undefined}
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
              type="text"
              value={search ?? ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={isKo ? '이름·회사·산업 검색…' : 'Search…'}
              className="w-full h-9 pl-9 pr-9 text-[13px] bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-300 placeholder:text-gray-400"
            />
            {/* Clear button — visible only when there's a query */}
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                aria-label={isKo ? '검색어 지우기' : 'Clear search'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
