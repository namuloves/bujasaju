'use client';

/**
 * Profile page — v2 layout (preview). Same data as /profile/[id]; only the
 * layout differs, so the two can be compared before switching. Kept out of
 * search results by ./layout.tsx (noindex).
 *
 * Differences from v1 (design review, Nov 2026):
 *   - Hero: three text sizes, two text grays; names with 생일 · 일주 · 출생지
 *     and 학력 under them, then net worth and who they are. Photo has 8px
 *     corners and no shadow; no-photo profiles get a gray initials tile.
 *   - Order: chart → reading → 대운 → background → rest of the bio. Facts
 *     already in the hero are not repeated.
 *   - Chart card is white and carries the one-line reading on desktop.
 *   - 대운 strip takes its start age from the reading (so the two agree),
 *     shows start years and scrolls to the current period on phones; the
 *     period paragraphs stack on phones.
 *   - Left-margin section nav (xl+).
 *   - Quiz CTA paused; the comparison card still shows for quiz-takers.
 *   - Contrast, 11px minimum labels and one heading style come from scoped
 *     `.profile-v2` CSS in globals.css, so shared components follow.
 *
 * Hero → sources is ProfileBodyV2, shared with the profile overlay
 * (DeepBioModal); this page adds the top bar, section nav and related people.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import type { DeepBio } from '@/lib/deepBio';
import { fetchDeepBio } from '@/lib/deepBio';
import { LoadingSpinner } from '@/components/deep-bio/DeepBioTabs';
import RelatedPeople from '@/components/profile/RelatedPeople';
import FamilyLink from '@/components/profile/FamilyLink';
import ProfileTopBarV2 from '@/components/profile-v2/ProfileTopBarV2';
import ProfileBodyV2 from '@/components/profile-v2/ProfileBodyV2';
import SectionNavV2 from '@/components/profile-v2/SectionNavV2';
import { NAV_ITEMS, SECTION } from '@/components/profile-v2/sections';

export default function ProfilePageV2() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const { people, loading: peopleLoading } = useEnrichedPeople();
  const [bio, setBio] = useState<DeepBio | null>(null);
  const [bioLoading, setBioLoading] = useState(true);

  const personId = params.id as string;
  const person = people.find(p => p.id === personId);

  useEffect(() => {
    fetchDeepBio(personId).then(data => {
      setBio(data);
      setBioLoading(false);
    });
  }, [personId]);

  if (peopleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-500 text-sm">{lang === 'ko' ? '인물을 찾을 수 없어요.' : 'Person not found.'}</p>
        <button onClick={() => router.back()} className="text-sm text-gray-700 hover:text-black">
          {lang === 'ko' ? '← 돌아가기' : '← Go back'}
        </button>
      </div>
    );
  }

  const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;

  return (
    <div className="min-h-screen bg-gray-50 profile-page-root profile-v2">
      <ProfileTopBarV2 person={person} displayName={displayName} lang={lang} />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Section nav in the left margin — xl+ only, where there is room
            beside the 896px column. */}
        <div className="hidden xl:block absolute right-full top-0 bottom-0 mr-4 w-36">
          <SectionNavV2 items={NAV_ITEMS[lang === 'ko' ? 'ko' : 'en']} lang={lang} rescanKey={bio} />
        </div>

        {/* Hero → chart → reading → 대운 → background → rest of the bio.
            Shared with the profile overlay (DeepBioModal). */}
        <ProfileBodyV2 person={person} bio={bio} bioLoading={bioLoading} displayName={displayName} lang={lang} />

        <div id={SECTION.related} className="scroll-mt-20">
          <FamilyLink personId={person.id} />
          <RelatedPeople person={person} people={people} />
        </div>
      </div>
    </div>
  );
}
