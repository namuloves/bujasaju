'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { EnrichedPerson, SajuResult } from '@/lib/saju/types';
import PersonCard from '@/components/PersonCard';
import SajuHero from './SajuHero';
import ShareButtons from './ShareButtons';
import MatchSummary from './MatchSummary';

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
  // person lives in exactly one group), so no double-counting.
  //
  // The "같은 일주 · 같은 월주" tier is always rendered even when empty,
  // so users get an explicit "정확히 같은 월주를 가진 부자는 없습니다"
  // instead of the section silently disappearing.
  const sections: Array<{
    key: string;
    title: string;
    medal: string;
    people: EnrichedPerson[];
    emptyMessage?: string;
    alwaysShow?: boolean;
  }> = [
    {
      key: 'monthJu',
      title: t.monthJuTitle,
      medal: '🥇',
      people: groups.iljuPlusMonthJu,
      emptyMessage: t.monthJuEmpty,
      alwaysShow: true,
    },
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

  return (
    <div className="space-y-8">
      {/* Quiz-result hero: 4 pillars + key stats + match count */}
      <SajuHero saju={me} totalMatches={totalMatches} onReset={onReset} />

      {/* Claude-generated 사주 풀이 — streams in while the user scans
          the hero. Uses the shared client cache + prefetch kicked off by
          the reveal animation, so it's usually already arriving by the
          time this component mounts. */}
      <MatchSummary saju={me} matches={summaryMatches} />

      {sections.map((section) => {
        const isEmpty = section.people.length === 0;
        if (isEmpty && !section.alwaysShow) return null;
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
            {isEmpty ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center text-sm text-gray-500">
                {section.emptyMessage}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {section.people.map((person) => (
                  <PersonCard
                    key={person.id}
                    person={person}
                    defaultShowChart={autoOpenChart}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {totalMatches === 0 && sameIljuCount === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg">{t.groupEmpty}</p>
        </div>
      )}

      {/* "같은 일주" group surfaced as a CTA button. Destination TBD —
          for now it's a no-op so we can iterate on where it leads. */}
      {sameIljuCount > 0 && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            // TODO: decide whether this opens a new page, a modal, or inlines the list.
            onClick={() => {
              /* intentionally a no-op for now */
            }}
            className="px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            {t.seeSameIljuButton(sameIljuCount)}
          </button>
        </div>
      )}

      {/* Footer share — second chance to share after scrolling through results */}
      <div className="bg-white rounded-xl border border-gray-200 mt-4">
        <ShareButtons title={t.shareTitle} variant="footer" />
      </div>
    </div>
  );
}
