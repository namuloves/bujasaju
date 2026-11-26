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
}

/** Sticky mini-header: back, avatar, name, net worth, industry, 일주.
 *  Same as v1 apart from a 44px tap target on the back button. */
export default function ProfileTopBarV2({ person, displayName, lang }: Props) {
  const router = useRouter();

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
        <button
          onClick={goBack}
          className="h-11 -ml-2 px-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors text-sm flex items-center gap-1 shrink-0"
          aria-label={lang === 'ko' ? '돌아가기' : 'Back'}
        >
          <span className="text-lg leading-none">←</span>
          <span className="hidden sm:inline">{lang === 'ko' ? '돌아가기' : 'Back'}</span>
        </button>
        <div className="h-5 w-px bg-gray-200 shrink-0" />
        <Portrait person={person} className="w-8 h-8 rounded-full overflow-hidden shrink-0" textClass="text-[11px]" />
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
          <span className="text-xs text-gray-500 shrink-0">
            {formatNetWorth(person.netWorth, lang === 'ko')}
          </span>
          <span className="text-xs text-gray-500 truncate hidden sm:inline">
            · {lang === 'ko' ? industryToKorean(person.industry) : person.industry}
          </span>
          {person.saju && (
            <span className="text-xs text-gray-500 truncate hidden sm:inline">
              · {person.saju.ilju} 일주
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
