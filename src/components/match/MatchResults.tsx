'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/i18n';
import { enrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { SajuResult } from '@/lib/saju/types';
import PersonCard from '@/components/PersonCard';

interface Props {
  me: SajuResult;
  onReset: () => void;
}

export default function MatchResults({ me, onReset }: Props) {
  const { t } = useLanguage();

  const groups = useMemo(() => matchBillionaires(me, enrichedPeople), [me]);

  const sections: Array<{
    key: string;
    title: string;
    people: typeof enrichedPeople;
  }> = [
    { key: 'g1', title: t.group1Title, people: groups.iljuPlusWolji },
    { key: 'g2', title: t.group2Title, people: groups.iljuPlusGyeokguk },
    { key: 'g3', title: t.group3Title, people: groups.iljuOnly },
  ];

  const totalMatches =
    groups.iljuPlusWolji.length +
    groups.iljuPlusGyeokguk.length +
    groups.iljuOnly.length;

  return (
    <div className="space-y-8">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-3">
        <div className="text-sm">
          <span className="text-gray-500">{t.yourSaju}: </span>
          <span className="font-semibold text-indigo-600">{me.ilju}</span>
          <span className="text-gray-400"> · </span>
          <span className="font-semibold text-indigo-600">{me.wolji}</span>
          <span className="text-gray-400"> · </span>
          <span className="font-semibold text-indigo-600">{me.gyeokguk}</span>
          <span className="text-gray-400 ml-3">
            {t.countPeople(totalMatches)}
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
        >
          {t.resetMyBirthday}
        </button>
      </div>

      {sections.map((section, idx) => {
        if (section.people.length === 0) return null;
        const medal = ['🥇', '🥈', '🥉'][idx];
        return (
          <section key={section.key}>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl">{medal}</span>
              <h3 className="text-base font-bold text-gray-900">{section.title}</h3>
              <span className="text-xs text-gray-400">
                {t.countPeople(section.people.length)}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {section.people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          </section>
        );
      })}

      {totalMatches === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg">{t.groupEmpty}</p>
        </div>
      )}
    </div>
  );
}
