'use client';

import { EnrichedPerson } from '@/lib/saju/types';
import PersonCard from './PersonCard';

interface PersonGridProps {
  people: EnrichedPerson[];
}

export default function PersonGrid({ people }: PersonGridProps) {
  return (
    <div>
      {people.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">해당하는 사람이 없습니다</p>
          <p className="text-gray-300 text-sm mt-1">필터를 조정해 보세요</p>
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
