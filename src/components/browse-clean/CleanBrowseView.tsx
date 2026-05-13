'use client';

import { useMemo, useState, useDeferredValue, type ReactNode } from 'react';
import { useEnrichedPeople, getUniqueNationalities, getUniqueIndustries } from '@/lib/data/enriched';
import CURATED_SECTIONS, { isMissingOhaeng } from '@/components/browse/curatedSections';
import type { OHaeng } from '@/lib/saju/types';
import type { Filters } from '@/components/FilterPanel';
import { nationalityToKorean, industryToKorean } from '@/components/FilterPanel';
import { useLanguage } from '@/lib/i18n';
import CleanSection from './CleanSection';
import CleanMiniCard from './CleanMiniCard';
import CleanInlineFilters from './CleanInlineFilters';

interface Props {
  /**
   * Render-prop for the nav header. Called with the current search value
   * and a setter — lets the host page mount a nav that owns the layout
   * (tabs, branding) while this view contributes the search state.
   */
  nav?: (search: string, onSearchChange: (v: string) => void) => ReactNode;
}

const CARDS_PER_SECTION = 6;
const FLAT_PAGE_SIZE = 60;

const defaultFilters: Filters = {
  ilgan: '',
  ilju: '',
  wolji: '',
  gyeokguk: '',
  search: '',
  nationality: '',
  industry: '',
  industryExclude: '',
  gender: '',
  wealthOrigin: '',
  missingOhaeng: '',
  sort: 'netWorth_desc',
};

const ACTIVE_FILTER_KEYS: (keyof Filters)[] = [
  'ilgan', 'ilju', 'wolji', 'gyeokguk',
  'nationality', 'industry', 'industryExclude',
  'gender', 'wealthOrigin', 'missingOhaeng',
];

function countActiveFilters(f: Filters): number {
  return ACTIVE_FILTER_KEYS.filter((k) => f[k]).length;
}

function hasAnyFilter(f: Filters): boolean {
  return countActiveFilters(f) > 0 || !!f.search;
}

/**
 * Active 필터를 한국어 어순에 맞춰 자연스러운 문장으로 변환.
 *   - 결핍=목 + 자수성가 + 한국 → "목이 부족한 자수성가 한국 부자"
 *   - 일간=갑 + 여성 → "갑 일간 여성 부자"
 *   - 산업=기술 + 여성 → "기술 분야 여성 부자"
 *
 * 어순: [사주특징] + [생애특징] + [성별] + [국적] + [분야] + "부자"
 */
function humanFilterTitle(f: Filters, isKo: boolean): string {
  if (!isKo) {
    // 영어는 단순 콤마 연결.
    const parts: string[] = [];
    if (f.missingOhaeng) parts.push(`missing ${f.missingOhaeng}`);
    if (f.ilgan) parts.push(`${f.ilgan} stem`);
    if (f.wolji) parts.push(`${f.wolji} branch`);
    if (f.ilju) parts.push(f.ilju);
    if (f.gyeokguk) parts.push(f.gyeokguk);
    if (f.wealthOrigin === 'self-made') parts.push('self-made');
    if (f.wealthOrigin === 'inherited') parts.push('inherited');
    if (f.gender === 'F') parts.push('women');
    if (f.gender === 'M') parts.push('men');
    if (f.nationality) parts.push(f.nationality);
    if (f.industry) parts.push(f.industry);
    return parts.length ? `${parts.join(', ')} billionaires` : 'Filtered results';
  }

  // 한국어 어순: 사주 → 생애 → 성별 → 국적 → 분야 → "부자"
  const sajuParts: string[] = [];
  if (f.missingOhaeng) {
    sajuParts.push(`${f.missingOhaeng} 기운이 없는`);
  }
  if (f.ilju) sajuParts.push(`${f.ilju}일주`);
  if (f.ilgan && !f.ilju) sajuParts.push(`${f.ilgan} 일간`);
  if (f.wolji) sajuParts.push(`${f.wolji}월에 태어난`);
  if (f.gyeokguk) sajuParts.push(f.gyeokguk);

  const lifeParts: string[] = [];
  if (f.wealthOrigin === 'self-made') lifeParts.push('자수성가');
  if (f.wealthOrigin === 'inherited') lifeParts.push('상속');

  const genderParts: string[] = [];
  if (f.gender === 'F') genderParts.push('여성');
  if (f.gender === 'M') genderParts.push('남성');

  const placeParts: string[] = [];
  if (f.nationality) placeParts.push(nationalityToKorean(f.nationality));

  const fieldParts: string[] = [];
  if (f.industry) fieldParts.push(`${industryToKorean(f.industry)} 분야`);

  const all = [
    ...sajuParts,
    ...lifeParts,
    ...genderParts,
    ...placeParts,
    ...fieldParts,
  ];

  return all.length ? `${all.join(' ')} 부자` : '필터 결과';
}

export default function CleanBrowseView({ nav }: Props = {}) {
  const { people, loading } = useEnrichedPeople();
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [visibleCount, setVisibleCount] = useState(FLAT_PAGE_SIZE);

  const deferredFilters = useDeferredValue(filters);

  const filtered = useMemo(() => {
    const f = deferredFilters;
    const list = people.filter((p) => {
      if (f.search) {
        const q = f.search.toLowerCase();
        const en = p.name.toLowerCase();
        const ko = (p.nameKo ?? '').toLowerCase();
        const src = (p.source ?? '').toLowerCase();
        const ind = (p.industry ?? '').toLowerCase();
        if (!en.includes(q) && !ko.includes(f.search) && !src.includes(q) && !ind.includes(q)) {
          return false;
        }
      }
      if (f.gender && p.gender !== f.gender) return false;
      if (f.ilju && p.saju.ilju !== f.ilju) return false;
      if (f.ilgan && p.saju.saju.day.stem !== f.ilgan) return false;
      if (f.wolji && p.saju.wolji !== f.wolji) return false;
      if (f.gyeokguk && p.saju.gyeokguk !== f.gyeokguk) return false;
      if (f.nationality && !p.nationality.includes(f.nationality)) return false;
      if (f.industry && p.industry !== f.industry) return false;
      if (f.industryExclude && (p.industry ?? '').includes(f.industryExclude)) return false;
      if (f.wealthOrigin && p.wealthOrigin !== f.wealthOrigin) return false;
      if (f.missingOhaeng && !isMissingOhaeng(p, f.missingOhaeng as OHaeng)) return false;
      return true;
    });

    const sorted = [...list];
    switch (f.sort) {
      case 'netWorth_asc': sorted.sort((a, b) => a.netWorth - b.netWorth); break;
      case 'name_asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: sorted.sort((a, b) => b.netWorth - a.netWorth);
    }
    return sorted;
  }, [people, deferredFilters]);

  const sections = useMemo(() => {
    return CURATED_SECTIONS.map((config) => {
      const matched = people.filter(config.filter);
      const sorted = [...matched].sort((a, b) => b.netWorth - a.netWorth);
      return {
        config,
        people: sorted.slice(0, CARDS_PER_SECTION),
        total: matched.length,
      };
    }).filter((s) => s.people.length > 0);
  }, [people]);

  const inFilteredMode = hasAnyFilter(filters);

  const updateFilters = (next: Filters) => {
    setFilters(next);
    setVisibleCount(FLAT_PAGE_SIZE);
  };

  return (
    <div>
      {nav?.(filters.search, (v) => updateFilters({ ...filters, search: v }))}

      <main className="max-w-6xl mx-auto px-6 pt-6 pb-24">
      <CleanInlineFilters
        filters={filters}
        onChange={updateFilters}
        availableNationalities={getUniqueNationalities(people)}
        availableIndustries={getUniqueIndustries(people)}
        filteredCount={inFilteredMode ? filtered.length : people.length}
        totalCount={people.length}
      />

      {loading && people.length === 0 ? (
        <div className="text-center py-24 text-sm text-gray-400">
          {isKo ? '불러오는 중…' : 'Loading…'}
        </div>
      ) : inFilteredMode ? (
        <section className="mb-20">
          <header className="mb-6">
            <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-gray-900 leading-tight">
              {filters.search && countActiveFilters(filters) === 0
                ? (isKo ? `"${filters.search}" 검색 결과` : `Search: "${filters.search}"`)
                : humanFilterTitle(filters, isKo)}
            </h2>
            <p className="text-[14px] text-gray-500 mt-1.5">
              {filters.search && countActiveFilters(filters) > 0 ? `"${filters.search}" · ` : ''}
              {filtered.length}
              {isKo ? '명' : ' people'}
            </p>
          </header>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">
              {isKo ? '일치하는 결과가 없어요.' : 'No matches found.'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
                {filtered.slice(0, visibleCount).map((person) => (
                  <CleanMiniCard key={person.id} person={person} />
                ))}
              </div>
              {visibleCount < filtered.length && (
                <div className="flex justify-center mt-10">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((v) => v + FLAT_PAGE_SIZE)}
                    className="px-5 py-2.5 text-[13px] font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {isKo
                      ? `더 보기 (${filtered.length - visibleCount}명 남음)`
                      : `Show more (${filtered.length - visibleCount} left)`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        sections.map(({ config, people: sectionPeople, total }) => (
          <CleanSection
            key={config.id}
            config={config}
            people={sectionPeople}
            totalInSection={total}
            onShowMore={
              config.applyFilter && total > CARDS_PER_SECTION
                ? () =>
                    updateFilters({
                      ...defaultFilters,
                      ...config.applyFilter!,
                      search: '',
                    })
                : null
            }
          />
        ))
      )}
      </main>
    </div>
  );
}
