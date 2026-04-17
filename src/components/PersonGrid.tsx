'use client';

import { EnrichedPerson } from '@/lib/saju/types';
import MiniPersonCard from './browse/MiniPersonCard';
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
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {people.map((person) => (
            <MiniPersonCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </div>
  );
}
