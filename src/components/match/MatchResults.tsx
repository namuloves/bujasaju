'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { EnrichedPerson, SajuResult } from '@/lib/saju/types';
import PersonCard from '@/components/PersonCard';
import { hasDeepBioSync, hasDeepBioV2Sync } from '@/lib/deepBio';
import SajuHero from './SajuHero';
import FeaturedPersonCard from './FeaturedPersonCard';
import ShareButtons from './ShareButtons';
import MatchSummary from './MatchSummary';
import DeepInterpretation from './DeepInterpretation';
import EmailCaptureCard from './EmailCaptureCard';
// import SingleMatchCard from './SingleMatchCard';

interface Props {
  me: SajuResult;
  onReset: () => void;
  /**
   * User's birthday (YYYY-MM-DD) and gender, needed for 대운 calculation
   * inside the deep interpretation. Optional — when missing, the v2 deep
   * interpretation section is silently skipped.
   */
  userBirthday?: string;
  userGender?: 'M' | 'F';
}

export default function MatchResults({ me, onReset, userBirthday, userGender }: Props) {
  const { t } = useLanguage();
  const { people: enrichedPeople, loading } = useEnrichedPeople();

  const groups = useMemo(
    () => matchBillionaires(me, enrichedPeople),
    [me, enrichedPeople],
  );

  // Rendered sections — 일주-only is intentionally hidden here and surfaced
  // via a dedicated button below. The tiers are mutually exclusive (each
  // person lives in exactly one group), so no double-counting. Empty
  // sections are hidden entirely (including 같은 월주) — an empty-state
  // card here just adds noise without giving the user anything useful.
  const sections: Array<{
    key: string;
    title: string;
    medal: string;
    people: EnrichedPerson[];
  }> = [
    { key: 'monthJu', title: t.monthJuTitle, medal: '🥇', people: groups.iljuPlusMonthJu },
    { key: 'twins', title: t.chartTwinsTitle, medal: '🏅', people: groups.chartTwins },
    { key: 'g1', title: t.group1Title, medal: '🥈', people: groups.iljuPlusWolji },
    { key: 'g2', title: t.group2Title, medal: '🥉', people: groups.iljuPlusGyeokguk },
  ];

  // Summary count covers every rendered section. iljuOnly is behind a
  // button so it's excluded. All tiers are mutually exclusive now, so
  // simple addition is correct.
  const totalMatches =
    groups.iljuPlusMonthJu.length +
    groups.chartTwins.length +
    groups.iljuPlusWolji.length +
    groups.iljuPlusGyeokguk.length;

  // Flattened list fed to the Claude summary — strongest tiers first so
  // the prompt's "top N" slice naturally picks the most relevant people.
  const summaryMatches = useMemo(
    () => [
      ...groups.iljuPlusMonthJu,
      ...groups.chartTwins,
      ...groups.iljuPlusWolji,
      ...groups.iljuPlusGyeokguk,
    ],
    [groups],
  );

  const sameIljuCount = groups.iljuOnly.length;
  const [showSameIlju, setShowSameIlju] = useState(false);

  if (loading && enrichedPeople.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        부자 데이터를 불러오는 중…
      </div>
    );
  }

  // Featured person for the top card — prefer one with a deep bio
  const featuredPerson = summaryMatches.find(p => hasDeepBioSync(p.id))
    || summaryMatches[0] || null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top row: 당신의 사주 (left) + 사주 풀이 (right) in one card */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="px-5 sm:px-6 py-5 sm:py-6">
            <SajuHero saju={me} totalMatches={totalMatches} onReset={onReset} featuredPerson={featuredPerson} />
          </div>
          <div className="px-5 sm:px-6 py-5 sm:py-6 space-y-5">
            <MatchSummary saju={me} matches={summaryMatches} />
            {featuredPerson && hasDeepBioV2Sync(featuredPerson.id) && userBirthday && userGender && (
              <div className="border-t border-gray-100 pt-5">
                <DeepInterpretation
                  saju={me}
                  featured={featuredPerson}
                  userBirthday={userBirthday}
                  userGender={userGender}
                />
              </div>
            )}
            {featuredPerson && (
              <div className="max-w-xs">
                <FeaturedPersonCard person={featuredPerson} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-8 min-w-0">
      {(() => {
        // Exclude the featured person shown in the top card
        const featuredId = featuredPerson?.id;
        return sections.map((section) => {
          const people = section.people.filter(p => p.id !== featuredId);
          if (people.length === 0) return null;
          const autoOpenChart = section.key === 'twins' || section.key === 'monthJu';
          return (
            <section key={section.key}>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl">{section.medal}</span>
                <h3 className="text-base font-bold text-gray-900">{section.title}</h3>
                <span className="text-xs text-gray-400">
                  {t.countPeople(people.length)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    defaultShowChart={autoOpenChart}
                  />
                ))}
              </div>
            </section>
          );
        });
      })()}

      {totalMatches === 0 && sameIljuCount === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg">{t.groupEmpty}</p>
        </div>
      )}

      {/* "같은 일주" group — hidden by default behind a CTA */}
      {sameIljuCount > 0 && (
        <>
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setShowSameIlju((v) => !v)}
              aria-expanded={showSameIlju}
              aria-controls="same-ilju-section"
              className="px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              {showSameIlju
                ? t.hideSameIljuButton
                : t.seeSameIljuButton(sameIljuCount)}
            </button>
          </div>
          {showSameIlju && (
            <section id="same-ilju-section">
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl">🎖️</span>
                <h3 className="text-base font-bold text-gray-900">{t.group3Title}</h3>
                <span className="text-xs text-gray-400">
                  {t.countPeople(sameIljuCount)}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groups.iljuOnly.map((person) => (
                  <PersonCard key={person.id} person={person} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Share + email */}
      <div className="bg-white rounded-2xl px-4 sm:px-6 py-5">
        <ShareButtons title={t.shareTitle} variant="hero" />
        <div className="mt-4">
          <EmailCaptureCard />
        </div>
      </div>

      </div>
    </div>
  );
}
