'use client';

import { useState, useMemo, useEffect } from 'react';
import FilterPanel, { Filters } from '@/components/FilterPanel';
import PersonGrid from '@/components/PersonGrid';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import {
  useEnrichedPeople,
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

const PAGE_SIZE = 60;

export default function BrowseTab() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { people: enrichedPeople, loading } = useEnrichedPeople();

  // Reset pagination whenever filters change so the user always sees the
  // top of the new result set.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

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
  }, [filters, enrichedPeople]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="lg:sticky lg:top-4">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            availableGyeokguks={getUniqueGyeokguks(enrichedPeople)}
            availableNationalities={getUniqueNationalities(enrichedPeople)}
            availableIndustries={getUniqueIndustries(enrichedPeople)}
            availableIljus={getUniqueIljus(enrichedPeople)}
            totalCount={enrichedPeople.length}
            filteredCount={filteredPeople.length}
          />
        </div>
      </aside>

      <div className="flex-1">
        {loading && enrichedPeople.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            불러오는 중…
          </div>
        )}
        <AnalyticsPanel
          filteredPeople={filteredPeople}
          totalCount={enrichedPeople.length}
          filters={filters}
          onChange={setFilters}
        />
        <PersonGrid people={filteredPeople.slice(0, visibleCount)} />
        {visibleCount < filteredPeople.length && (
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="px-6 py-2.5 bg-white border border-gray-200 hover:border-gray-300 text-sm font-semibold text-gray-700 rounded-lg transition-colors"
            >
              더 보기 ({filteredPeople.length - visibleCount}명 남음)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
