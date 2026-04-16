'use client';

import { useMemo } from 'react';
import type { EnrichedPerson } from '@/lib/saju/types';
import type { Filters } from '@/components/FilterPanel';
import CURATED_SECTIONS from './curatedSections';
import CuratedSection from './CuratedSection';

/** How many people to show per section (1 cover + rest as mini cards). */
const CARDS_PER_SECTION = 6; // 1 cover + 5 minis = fills 6-col grid in 1 row

interface Props {
  people: EnrichedPerson[];
  onApplyFilter: (filter: Partial<Filters>) => void;
}

export default function CuratedBrowseView({ people, onApplyFilter }: Props) {
  const sections = useMemo(() => {
    return CURATED_SECTIONS.map((config) => {
      const filtered = people.filter(config.filter);
      const sorted = [...filtered].sort((a, b) => b.netWorth - a.netWorth);
      return {
        config,
        people: sorted.slice(0, CARDS_PER_SECTION),
        total: filtered.length,
      };
    });
  }, [people]);

  return (
    <div className="space-y-10">
      {sections.map(({ config, people: sectionPeople, total }) => (
        <CuratedSection
          key={config.id}
          config={config}
          people={sectionPeople}
          totalInSection={total}
          onShowMore={
            config.applyFilter
              ? () => onApplyFilter(config.applyFilter!)
              : null
          }
        />
      ))}
    </div>
  );
}
