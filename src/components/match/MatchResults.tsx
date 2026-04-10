'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { EnrichedPerson, SajuResult } from '@/lib/saju/types';
import PersonCard from '@/components/PersonCard';
import SajuHero from './SajuHero';
import ShareButtons from './ShareButtons';
import MatchSummary from './MatchSummary';
import EmailCaptureCard from './EmailCaptureCard';

interface Props {
  me: SajuResult;
  onReset: () => void;
}

export default function MatchResults({ me, onReset }: Props) {
  const { t } = useLanguage();
  const { people: enrichedPeople } = useEnrichedPeople();

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

  return (
    <div className="md:grid md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-6 lg:gap-8 md:items-start space-y-8 md:space-y-0">
      {/* Left column (md+): hero + share/email stick to the side. On mobile
          it stacks above the matches like before. */}
      <div className="md:sticky md:top-4 space-y-4">
        <SajuHero saju={me} totalMatches={totalMatches} onReset={onReset} />

        {/* Share + email + reset — second box below the chart */}
        <div className="bg-white rounded-2xl px-4 sm:px-6 py-5">
          <ShareButtons title={t.shareTitle} variant="hero" />
          <div className="mt-4">
            <EmailCaptureCard />
          </div>
        </div>
      </div>

      {/* Right column: 사주 풀이 on top, then matched billionaire photos/cards */}
      <div className="space-y-8 min-w-0">
      <MatchSummary saju={me} matches={summaryMatches} />
      {sections.map((section) => {
        if (section.people.length === 0) return null;
        // Auto-expand the saju chart on the strictest tiers so similarity
        // is immediately visible without extra clicks.
        const autoOpenChart = section.key === 'twins' || section.key === 'monthJu';
        return (
          <section key={section.key}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl">{section.medal}</span>
              <h3 className="text-base font-bold text-gray-900">{section.title}</h3>
              <span className="text-xs text-gray-400">
                {t.countPeople(section.people.length)}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.people.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  defaultShowChart={autoOpenChart}
                />
              ))}
            </div>
          </section>
        );
      })}

      {totalMatches === 0 && sameIljuCount === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg">{t.groupEmpty}</p>
        </div>
      )}

      {/* "같은 일주" group — hidden by default behind a CTA, expands inline on click. */}
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

      </div>
    </div>
  );
}
