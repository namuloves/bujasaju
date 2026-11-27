'use client';

/**
 * Profile v2 — everything below the top bar, from the hero down to the
 * sources. Shared by the full page (/profile/[id]/v2) and the profile
 * overlay (DeepBioModal), so both always show the same sections in the
 * same order with the same styles.
 *
 * The caller supplies the frame: the column width and padding, the top bar,
 * and anything page-only (section nav, family link, related people).
 */

import type { DeepBio, SajuConnection } from '@/lib/deepBio';
import { hasStructuredReading } from '@/lib/deepBio';
import type { EnrichedPerson } from '@/lib/saju/types';
import { LoadingSpinner, EmptyBioState, ko } from '@/components/deep-bio/DeepBioTabs';
import DeepBioContent from '@/components/deep-bio/DeepBioContent';
import DaewoonStrip from '@/components/profile/DaewoonStrip';
import CompareWithUser from '@/components/profile/CompareWithUser';
import ProfileHeroV2 from './ProfileHeroV2';
import SajuChartCardV2 from './SajuChartCardV2';
import BackgroundV2 from './BackgroundV2';
import { SajuReadingV2, DaeunReadingList, startAgeFromReading } from './SajuReadingV2';
import { SECTION } from './sections';
import { useVisitorHasSaju } from './useVisitorHasSaju';

interface Props {
  person: EnrichedPerson;
  bio: DeepBio | null;
  bioLoading: boolean;
  displayName: string;
  lang: string;
  /** Put the section ids on the sections, for the page's section nav.
   *  Off in the overlay, which has no nav and sits on top of other pages. */
  anchors?: boolean;
}

export default function ProfileBodyV2({ person, bio, bioLoading, displayName, lang, anchors = true }: Props) {
  const visitorHasSaju = useVisitorHasSaju();
  const anchor = (id: string) => (anchors ? id : undefined);

  const knownFor = bio?.personalTraits
    ? ko(lang, bio.personalTraits.knownFor, bio.personalTraits.knownForKo)
    : null;

  // sajuConnection lives on the v2 bio shape; DeepBio doesn't declare it.
  const sc = (bio as { sajuConnection?: SajuConnection } | null)?.sajuConnection;
  const reading = sc && hasStructuredReading(sc) ? sc : null;
  const daeunItems = reading?.daeunKo ?? [];

  return (
    <>
      <ProfileHeroV2 person={person} bio={bio} displayName={displayName} knownFor={knownFor} lang={lang} />

      {/* Comparison with the visitor's own chart — quiz-takers only. The
          "내 사주 입력하기" CTA for everyone else is paused; remove the
          `visitorHasSaju &&` to bring it back (button style). */}
      {person.saju && visitorHasSaju && (
        <div className="mt-6">
          <CompareWithUser person={person} ctaStyle="button" />
        </div>
      )}

      <SajuChartCardV2
        id={anchor(SECTION.saju)}
        person={person}
        displayName={displayName}
        showChart={!visitorHasSaju}
        oneLine={reading?.oneLineKo}
        lang={lang}
      />

      {reading && (
        <div id={anchor(SECTION.reading)} className="scroll-mt-20 mt-10">
          <SajuReadingV2 sc={reading} lang={lang} />
        </div>
      )}

      {/* 대운 — strip and the period-by-period reading together. */}
      {person.birthday && person.gender && (
        <section id={anchor(SECTION.daeun)} className="scroll-mt-20 mt-10">
          <DaewoonStrip
            person={person}
            rounding="round"
            startAgeOverride={startAgeFromReading(daeunItems)}
            showYears
            autoScrollToCurrent
          />
          {daeunItems.length > 0 && (
            <div className="mt-6">
              <DaeunReadingList items={daeunItems} lang={lang} />
            </div>
          )}
        </section>
      )}

      <BackgroundV2 id={anchor(SECTION.background)} person={person} bio={bio} lang={lang} />

      {/* Rest of the bio — character, timeline, setbacks, sources. */}
      <div className="mt-10">
        {bioLoading ? (
          <LoadingSpinner />
        ) : !bio ? (
          <EmptyBioState lang={lang} />
        ) : (
          <DeepBioContent bio={bio} person={person} lang={lang} hideKeyFacts hideSajuConnection={!!reading} />
        )}
      </div>
    </>
  );
}
