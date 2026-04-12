'use client';

import { useState, useMemo, useEffect, useDeferredValue } from 'react';
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

  // Defer the filter object so that typing in the search box is always
  // instant — the heavy 3,300-row filter/sort runs at lower priority and
  // React will interrupt it if another keystroke arrives first.
  const deferredFilters = useDeferredValue(filters);

  // Reset pagination whenever filters change so the user always sees the
  // top of the new result set.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters]);

  const filteredPeople = useMemo(() => {
    const f = deferredFilters;
    const filtered = enrichedPeople.filter((person) => {
      if (f.search) {
        const q = f.search.toLowerCase();
        const qNoSpace = q.replace(/\s+/g, '');
        const nameEn = person.name.toLowerCase();
        const nameKo = person.nameKo ?? '';
        const nameKoNoSpace = nameKo.replace(/\s+/g, '');
        const src = (person.source ?? '').toLowerCase();
        const industry = (person.industry ?? '').toLowerCase();
        if (
          !nameEn.includes(q) &&
          !nameKo.includes(f.search) &&
          !nameKoNoSpace.includes(qNoSpace) &&
          !src.includes(q) &&
          !industry.includes(q)
        )
          return false;
      }
      if (f.gender && person.gender !== f.gender) return false;
      if (f.ilju && person.saju.ilju !== f.ilju) return false;
      if (f.ilgan && person.saju.saju.day.stem !== f.ilgan) return false;
      if (f.wolji && person.saju.wolji !== f.wolji) return false;
      if (f.gyeokguk && person.saju.gyeokguk !== f.gyeokguk) return false;
      if (f.nationality && !person.nationality.includes(f.nationality)) return false;
      if (f.industry && person.industry !== f.industry) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (f.sort) {
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
  }, [deferredFilters, enrichedPeople]);

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
