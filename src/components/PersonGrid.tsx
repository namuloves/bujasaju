'use client';

import { EnrichedPerson } from '@/lib/saju/types';
import PersonCard from './PersonCard';
import { useLanguage } from '@/lib/i18n';

interface PersonGridProps {
  people: EnrichedPerson[];
}

export default function PersonGrid({ people }: PersonGridProps) {
  const { t } = useLanguage();
  return (
    <div>
      {people.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">{t.noResults}</p>
          <p className="text-gray-300 text-sm mt-1">{t.adjustFilters}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {people.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}
