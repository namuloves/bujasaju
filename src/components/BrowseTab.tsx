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
  getIljusGroupedByStem,
} from '@/lib/data/enriched';
import { fetchSearchIndex } from '@/lib/deepBio';
import CuratedBrowseView from '@/components/browse/CuratedBrowseView';
import { isMissingOhaeng } from '@/components/browse/curatedSections';
import type { OHaeng } from '@/lib/saju/types';

/**
 * Korean brand/company names → English equivalents for search.
 * When a user types a Korean brand name, we also match against the English version.
 */
const KO_BRAND_ALIASES: Record<string, string[]> = {
  '테슬라': ['tesla'],
  '누텔라': ['nutella', 'ferrero'],
  '페레로': ['ferrero', 'nutella'],
  '아마존': ['amazon'],
  '구글': ['google', 'alphabet'],
  '애플': ['apple'],
  '마이크로소프트': ['microsoft'],
  '메타': ['meta', 'facebook'],
  '페이스북': ['facebook', 'meta'],
  '삼성': ['samsung'],
  '현대': ['hyundai'],
  '엔비디아': ['nvidia'],
  '오라클': ['oracle'],
  '버크셔': ['berkshire'],
  '루이비통': ['lvmh', 'louis vuitton'],
  '에르메스': ['hermes'],
  '샤넬': ['chanel'],
  '로레알': ['loreal', "l'oreal"],
  '월마트': ['walmart'],
  '코스트코': ['costco'],
  '나이키': ['nike'],
  '스타벅스': ['starbucks'],
  '코카콜라': ['coca-cola', 'coca cola'],
  '펩시': ['pepsi', 'pepsico'],
  '맥도날드': ['mcdonald'],
  '다이슨': ['dyson'],
  '이케아': ['ikea'],
  '자라': ['zara', 'inditex'],
  '유니클로': ['uniqlo', 'fast retailing'],
  '소프트뱅크': ['softbank'],
  '알리바바': ['alibaba'],
  '텐센트': ['tencent'],
  '바이트댄스': ['bytedance', 'tiktok'],
  '틱톡': ['tiktok', 'bytedance'],
  '화웨이': ['huawei'],
  '샤오미': ['xiaomi'],
  '블룸버그': ['bloomberg'],
  '골드만삭스': ['goldman sachs'],
  '모건스탠리': ['morgan stanley'],
  '캔바': ['canva'],
  '스페이스엑스': ['spacex'],
  '레딧': ['reddit'],
  '우버': ['uber'],
  '에어비앤비': ['airbnb'],
  '넷플릭스': ['netflix'],
  '디즈니': ['disney'],
  '소니': ['sony'],
  '도요타': ['toyota'],
  '벤츠': ['mercedes', 'daimler'],
  '포르쉐': ['porsche'],
  'bmw': ['bmw'],
  '폭스바겐': ['volkswagen'],
  '롤렉스': ['rolex'],
  '프라다': ['prada'],
  '구찌': ['gucci', 'kering'],
  '팬더': ['panda express', 'panda restaurant'],
  // Korean transliterations of acronyms/abbreviations
  '에스케이': ['sk'],
  '엘지': ['lg'],
  '케이티': ['kt'],
  '씨제이': ['cj'],
  '제이피모건': ['jp morgan', 'jpmorgan'],
  '에이치피': ['hp', 'hewlett'],
  '아이비엠': ['ibm'],
  '지엠': ['gm', 'general motors'],
  '비엠더블유': ['bmw'],
  '에이티앤티': ['at&t'],
  // More Korean company/brand names
  '셀트리온': ['celltrion'],
  '네이버': ['naver'],
  '카카오': ['kakao'],
  '하이닉스': ['hynix', 'sk hynix'],
  '포스코': ['posco'],
  '롯데': ['lotte'],
  '한화': ['hanwha'],
  '두산': ['doosan'],
  '아모레퍼시픽': ['amorepacific'],
  '신세계': ['shinsegae', 'e-mart'],
  // Global brands continued
  '마이크론': ['micron'],
  '인텔': ['intel'],
  '퀄컴': ['qualcomm'],
  '시스코': ['cisco'],
  '세일즈포스': ['salesforce'],
  '어도비': ['adobe'],
  '페이팔': ['paypal'],
  '스트라이프': ['stripe'],
  '쇼피파이': ['shopify'],
  '스포티파이': ['spotify'],
  '링크드인': ['linkedin'],
  '트위터': ['twitter'],
  '엑스': ['x.com', 'twitter'],
  '델': ['dell'],
  '오픈에이아이': ['openai'],
  '앤스로픽': ['anthropic'],
  '바이두': ['baidu'],
  '징동': ['jd.com', 'jd'],
  '핀둬둬': ['pinduoduo', 'pdd'],
  '샹그릴라': ['shangri-la'],
  '유튜브': ['youtube'],
  '왓츠앱': ['whatsapp'],
  '인스타그램': ['instagram'],
  '버진': ['virgin'],
  '로이터': ['reuters'],
  '골드만': ['goldman'],
  '모건': ['morgan'],
  '블랙록': ['blackrock'],
  '피델리티': ['fidelity'],
};

/**
 * 초성 검색 (Chosung / initial consonant search).
 * Extracts the leading consonant from each Korean syllable.
 * e.g. "일론 머스크" → "ㅇㄹㅁㅅㅋ"
 */
const CHOSUNG = [
  'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ',
  'ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ',
];

function getChosung(str: string): string {
  let result = '';
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    // Korean syllable range: 0xAC00 - 0xD7A3
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const idx = Math.floor((code - 0xAC00) / 588);
      result += CHOSUNG[idx];
    }
    // Already a jamo consonant (ㄱ-ㅎ range: 0x3131-0x314E)
    else if (code >= 0x3131 && code <= 0x314E) {
      result += ch;
    }
    // Non-Korean chars pass through (for mixed search like "LG")
    else if (ch !== ' ') {
      result += ch.toLowerCase();
    }
  }
  return result;
}

/** Check if query is purely chosung consonants (ㄱ-ㅎ) */
function isChosungOnly(str: string): boolean {
  for (const ch of str) {
    const code = ch.charCodeAt(0);
    if (code < 0x3131 || code > 0x314E) return false;
  }
  return str.length > 0;
}

/** Expand a Korean search query into additional English terms to match against. */
function expandKoreanQuery(q: string): string[] {
  const extra: string[] = [];
  for (const [ko, ens] of Object.entries(KO_BRAND_ALIASES)) {
    if (q.includes(ko)) {
      extra.push(...ens);
    }
  }
  return extra;
}

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

const PAGE_SIZE = 60;

/** URL query keys that map 1:1 to Filters fields. `tab` is owned by the parent page. */
const FILTER_KEYS: (keyof Filters)[] = [
  'ilgan', 'ilju', 'wolji', 'gyeokguk', 'search',
  'nationality', 'industry', 'industryExclude', 'gender', 'wealthOrigin',
  'missingOhaeng',
];

/** Read filters from the current URL, falling back to defaults for missing keys. */
function filtersFromUrl(): Filters {
  if (typeof window === 'undefined') return defaultFilters;
  const params = new URLSearchParams(window.location.search);
  const next = { ...defaultFilters };
  for (const key of FILTER_KEYS) {
    const v = params.get(key);
    if (v != null) (next as Record<string, string>)[key] = v;
  }
  const sort = params.get('sort');
  if (sort === 'netWorth_asc' || sort === 'name_asc' || sort === 'netWorth_desc') {
    next.sort = sort;
  }
  return next;
}

/** True if the two filter objects are structurally equal. */
function filtersEqual(a: Filters, b: Filters): boolean {
  return FILTER_KEYS.every((k) => a[k] === b[k]) && a.sort === b.sort;
}

/** True if any filter is active (i.e. we're in flat-grid mode, not curated). */
function hasActiveFilter(f: Filters): boolean {
  return FILTER_KEYS.some((k) => f[k]);
}

/**
 * Sync filters to URL. Uses pushState when `pushHistory` is true (user clicked
 * "더 보기" on a curated section), replaceState otherwise (e.g. typing in the
 * search box) to avoid polluting history.
 */
function writeFiltersToUrl(filters: Filters, pushHistory: boolean) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  for (const key of FILTER_KEYS) {
    const v = filters[key];
    if (v) url.searchParams.set(key, v);
    else url.searchParams.delete(key);
  }
  if (filters.sort && filters.sort !== 'netWorth_desc') {
    url.searchParams.set('sort', filters.sort);
  } else {
    url.searchParams.delete('sort');
  }
  const next = url.toString();
  if (next === window.location.href) return;
  if (pushHistory) window.history.pushState({}, '', next);
  else window.history.replaceState({}, '', next);
}

export default function BrowseTab() {
  const [filters, setFiltersState] = useState<Filters>(defaultFilters);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { people: enrichedPeople, loading } = useEnrichedPeople();
  const [deepSearchIndex, setDeepSearchIndex] = useState<Record<string, string>>({});

  // Preload the deep-bio search index on mount so it's ready when user types
  useEffect(() => {
    fetchSearchIndex().then(setDeepSearchIndex);
  }, []);

  // Hydrate filters from URL on mount, and listen to back/forward nav so
  // the user's browser history restores the previous curated/flat view.
  useEffect(() => {
    setFiltersState(filtersFromUrl());
    const onPop = () => setFiltersState(filtersFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /**
   * setFilters wrapper that also syncs the URL.
   * - `pushHistory` = true: navigation event (e.g. "더 보기" click) — creates
   *   a new history entry so browser back returns to the previous state.
   * - `pushHistory` = false: incremental change (typing, dropdown tweak) —
   *   replaces the current entry to avoid polluting history.
   */
  const setFilters = (next: Filters, pushHistory = false) => {
    setFiltersState((prev) => {
      if (filtersEqual(prev, next)) return prev;
      writeFiltersToUrl(next, pushHistory);
      return next;
    });
  };

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
        const bioKo = (person.bioKo ?? '').toLowerCase();
        // Expand Korean brand queries to English equivalents
        const expanded = expandKoreanQuery(qNoSpace);
        const bio = (person.bio ?? '').toLowerCase();
        const searchable = nameEn + ' ' + src + ' ' + industry + ' ' + bio + ' ' + bioKo;
        // 초성 검색: if query is all jamo consonants, match against chosung of Korean name
        const chosungMatch = isChosungOnly(qNoSpace) && nameKo
          ? getChosung(nameKo).includes(qNoSpace)
          : false;
        if (
          !nameEn.includes(q) &&
          !nameKo.includes(f.search) &&
          !nameKoNoSpace.includes(qNoSpace) &&
          !src.includes(q) &&
          !industry.includes(q) &&
          !bioKo.includes(q) &&
          !expanded.some(term =>
            // Short terms (<=3 chars) must match as whole words to avoid false positives
            // e.g. "sk" should not match "Musk" or "Moskovitz"
            term.length <= 3
              ? new RegExp(`\\b${term}\\b`, 'i').test(searchable)
              : searchable.includes(term)
          ) &&
          !chosungMatch &&
          // Deep bio full-text search (career, quotes, childhood, etc.)
          !(deepSearchIndex[person.id]?.includes(q))
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
      if (f.industryExclude && (person.industry ?? '').includes(f.industryExclude)) return false;
      if (f.wealthOrigin && person.wealthOrigin !== f.wealthOrigin) return false;
      if (f.missingOhaeng && !isMissingOhaeng(person, f.missingOhaeng as OHaeng)) return false;
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
      {hasActiveFilter(filters) && (
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) window.history.back();
            else setFilters(defaultFilters);
          }}
          aria-label="뒤로가기"
          className="fixed z-40 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 shadow-md rounded-full transition-colors px-3.5 py-2 text-xs font-medium bottom-6 left-6 lg:top-6 lg:bottom-auto"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          뒤로가기
        </button>
      )}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="lg:sticky lg:top-4">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            availableGyeokguks={getUniqueGyeokguks(enrichedPeople)}
            availableNationalities={getUniqueNationalities(enrichedPeople)}
            availableIndustries={getUniqueIndustries(enrichedPeople)}
            availableIljus={getIljusGroupedByStem(enrichedPeople)}
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
        {/* Show curated magazine view when no filters active, flat grid otherwise */}
        {!filters.ilgan && !filters.ilju && !filters.wolji &&
         !filters.gyeokguk && !filters.search && !filters.nationality &&
         !filters.industry && !filters.industryExclude && !filters.gender &&
         !filters.wealthOrigin && !filters.missingOhaeng ? (
          <CuratedBrowseView
            people={enrichedPeople}
            onApplyFilter={(partial) => setFilters({ ...defaultFilters, ...partial }, true)}
          />
        ) : (
          <div>
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
        )}
      </div>
    </div>
  );
}
