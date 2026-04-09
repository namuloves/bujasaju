'use client';

import { useState, useMemo } from 'react';
import FilterPanel, { Filters } from '@/components/FilterPanel';
import PersonGrid from '@/components/PersonGrid';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import {
  enrichedPeople,
  getUniqueNationalities,
  getUniqueIndustries,
  getUniqueGyeokguks,
  getUniqueIljus,
} from '@/lib/data/enriched';

const defaultFilters: Filters = {
  ilgan: '',
  ilju: '',
  wolji: '',
  gyeokguk: '',
  search: '',
  nationality: '',
  industry: '',
  gender: '',
  sort: 'netWorth_desc',
};

export default function BrowseTab() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const filteredPeople = useMemo(() => {
    const filtered = enrichedPeople.filter((person) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !person.name.toLowerCase().includes(q) &&
          !(person.nameKo && person.nameKo.includes(filters.search))
        )
          return false;
      }
      if (filters.gender && person.gender !== filters.gender) return false;
      if (filters.ilju && person.saju.ilju !== filters.ilju) return false;
      if (filters.ilgan && person.saju.saju.day.stem !== filters.ilgan) return false;
      if (filters.wolji && person.saju.wolji !== filters.wolji) return false;
      if (filters.gyeokguk && person.saju.gyeokguk !== filters.gyeokguk) return false;
      if (filters.nationality && !person.nationality.includes(filters.nationality)) return false;
      if (filters.industry && person.industry !== filters.industry) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (filters.sort) {
      case 'netWorth_asc':
        sorted.sort((a, b) => a.netWorth - b.netWorth);
        break;
      case 'name_asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'netWorth_desc':
      default:
        sorted.sort((a, b) => b.netWorth - a.netWorth);
        break;
    }
    return sorted;
  }, [filters]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="lg:sticky lg:top-4">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            availableGyeokguks={getUniqueGyeokguks()}
            availableNationalities={getUniqueNationalities()}
            availableIndustries={getUniqueIndustries()}
            availableIljus={getUniqueIljus()}
            totalCount={enrichedPeople.length}
            filteredCount={filteredPeople.length}
          />
        </div>
      </aside>

      <div className="flex-1">
        <AnalyticsPanel
          filteredPeople={filteredPeople}
          totalCount={enrichedPeople.length}
          filters={filters}
          onChange={setFilters}
        />
        <PersonGrid people={filteredPeople} />
      </div>
    </div>
  );
}
