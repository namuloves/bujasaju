'use client';

import { useState, useMemo } from 'react';
import Header from '@/components/Header';
import FilterPanel, { Filters } from '@/components/FilterPanel';
import PersonGrid from '@/components/PersonGrid';
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

export default function Home() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const filteredPeople = useMemo(() => {
    const filtered = enrichedPeople.filter((person) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!person.name.toLowerCase().includes(q) &&
            !(person.nameKo && person.nameKo.includes(filters.search))) return false;
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

    // Sort
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
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

          {/* Main Grid */}
          <div className="flex-1">
            <PersonGrid people={filteredPeople} />
          </div>
        </div>
      </main>
    </div>
  );
}
