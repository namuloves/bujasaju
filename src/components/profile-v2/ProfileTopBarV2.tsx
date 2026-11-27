'use client';

import { useRouter } from 'next/navigation';
import type { EnrichedPerson } from '@/lib/saju/types';
import { industryToKorean } from '@/components/FilterPanel';
import { formatNetWorth } from '@/components/profile/format';
import Portrait from './Portrait';

interface Props {
  person: EnrichedPerson;
  displayName: string;
  lang: string;
  /** Overlay mode (profile overlay): no back button; "전체 페이지" and a
   *  close button on the right instead. */
  overlay?: {
    onClose: () => void;
    fullPageHref: string;
  };
}

/** Same ghost style as the back button, so every top-bar action matches. */
const ACTION_CLASS =
  'h-11 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors text-sm flex items-center shrink-0';

/** Sticky mini-header: back, avatar, name, net worth, industry, 일주.
 *  Same as v1 apart from a 44px tap target on the back button. In the
 *  overlay it is the panel's fixed header, with the actions on the right. */
export default function ProfileTopBarV2({ person, displayName, lang, overlay }: Props) {
  const router = useRouter();
  const isKo = lang === 'ko';

  // Back within the site; straight to home for visitors who landed here
  // from search or a shared link (their history has nothing to go back to).
  const goBack = () => {
    if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 profile-topbar">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-1.5 flex items-center gap-3">
        {!overlay && (
          <>
            <button
              onClick={goBack}
              className={`${ACTION_CLASS} -ml-2 px-2 gap-1`}
              aria-label={isKo ? '돌아가기' : 'Back'}
            >
              <span className="text-lg leading-none">←</span>
              <span className="hidden sm:inline">{isKo ? '돌아가기' : 'Back'}</span>
            </button>
            <div className="h-5 w-px bg-gray-200 shrink-0" />
          </>
        )}
        <Portrait person={person} className="w-8 h-8 rounded-full overflow-hidden shrink-0" textClass="text-[11px]" />
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
          <span className="text-xs text-gray-500 shrink-0">
            {formatNetWorth(person.netWorth, isKo)}
          </span>
          <span className="text-xs text-gray-500 truncate hidden sm:inline">
            · {isKo ? industryToKorean(person.industry) : person.industry}
          </span>
          {person.saju && (
            <span className="text-xs text-gray-500 truncate hidden sm:inline">
              · {person.saju.ilju} 일주
            </span>
          )}
        </div>
        {overlay && (
          <div className="flex items-center gap-1 -mr-2 shrink-0">
            <a href={overlay.fullPageHref} className={`${ACTION_CLASS} px-2 gap-1`}>
              <span>{isKo ? '전체 페이지' : 'Full page'}</span>
              <span aria-hidden="true">↗</span>
            </a>
            <button
              type="button"
              onClick={overlay.onClose}
              className={`${ACTION_CLASS} w-11 justify-center`}
              aria-label={isKo ? '닫기' : 'Close'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
