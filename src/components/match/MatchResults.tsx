'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { enrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { SajuResult } from '@/lib/saju/types';
import PersonCard from '@/components/PersonCard';
import SajuHero from './SajuHero';
import ShareButtons from './ShareButtons';

interface Props {
  me: SajuResult;
  onReset: () => void;
}

export default function MatchResults({ me, onReset }: Props) {
  const { t } = useLanguage();

  const groups = useMemo(() => matchBillionaires(me, enrichedPeople), [me]);

  // Rendered sections — 일주-only is intentionally hidden here and surfaced
  // via a dedicated button below (we'll decide later whether to open it on
  // a separate page or inline it). The data still flows through `groups`.
  const sections: Array<{
    key: string;
    title: string;
    medal: string;
    people: typeof enrichedPeople;
  }> = [
    { key: 'twins', title: t.chartTwinsTitle, medal: '🥇', people: groups.chartTwins },
    { key: 'g1', title: t.group1Title, medal: '🥈', people: groups.iljuPlusWolji },
    { key: 'g2', title: t.group2Title, medal: '🥉', people: groups.iljuPlusGyeokguk },
  ];

  // Summary count only counts what's rendered (excludes the hidden 일주-only
  // group since it's behind a button).
  const totalMatches =
    groups.chartTwins.length +
    groups.iljuPlusWolji.length +
    groups.iljuPlusGyeokguk.length;

  const sameIljuCount = groups.iljuOnly.length;

  return (
    <div className="space-y-8">
      {/* Quiz-result hero: 4 pillars + key stats + match count */}
      <SajuHero saju={me} totalMatches={totalMatches} onReset={onReset} />

      {sections.map((section) => {
        if (section.people.length === 0) return null;
        // The top tier ("차트가 가장 비슷한 사람") auto-expands its saju chart
        // so the user can immediately see how similar the charts are without
        // having to click into each card.
        const autoOpenChart = section.key === 'twins';
        return (
          <section key={section.key}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl">{section.medal}</span>
              <h3 className="text-base font-bold text-gray-900">{section.title}</h3>
              <span className="text-xs text-gray-400">
                {t.countPeople(section.people.length)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
