'use client';

import { useMemo } from 'react';
import { CheonGan, JiJi, GyeokGuk, Gender } from '@/lib/saju/types';
import { CHEON_GAN, JI_JI, STEM_TO_OHAENG, GABIA_60 } from '@/lib/saju/constants';
import { useLanguage } from '@/lib/i18n';

// Pinned to the top of the nationality dropdown in Korean mode (in this order).
const PINNED_NATIONALITIES = ['KR', 'US', 'JP', 'CN'];

export type SortOption = 'netWorth_desc' | 'netWorth_asc' | 'name_asc';

export interface Filters {
  ilgan: string;    // 일간 (day stem)
  ilju: string;     // 일주 (exact 60갑자, e.g. 갑술)
  wolji: string;    // 월지 (month branch)
  gyeokguk: string; // 격국
  search: string;   // name search
  nationality: string;
  industry: string;
  gender: string;   // 'M', 'F', or ''
  sort: SortOption;
}

interface FilterPanelProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  availableGyeokguks: string[];
  availableNationalities: string[];
  availableIndustries: string[];
  availableIljus: string[];
  totalCount: number;
  filteredCount: number;
}

const GYEOKGUK_LIST: GyeokGuk[] = [
  '식신격', '상관격', '편재격', '정재격', '편관격',
  '정관격', '편인격', '정인격', '건록격', '양인격',
];

const OHAENG_EMOJI: Record<string, string> = {
  '목': '🌳', '화': '🔥', '토': '🏔️', '금': '⚔️', '수': '💧',
};

// Per-stem emoji overrides. Falls back to OHAENG_EMOJI when not set.
const STEM_EMOJI: Record<string, string> = {
  '을': '🌷',
  '병': '🌅',
  '기': '🖼️',
  '신': '💎',
  '임': '🌊',
};

// ISO country code → Korean display name. Covers every code present in the
// billionaires dataset; unknown codes fall back to the raw code.
export const COUNTRY_KO: Record<string, string> = {
  AE: '아랍에미리트', AF: '아프가니스탄', AL: '알바니아', AR: '아르헨티나',
  AT: '오스트리아', AU: '호주', BB: '바베이도스', BE: '벨기에',
  BG: '불가리아', BR: '브라질', BZ: '벨리즈', CA: '캐나다',
  CH: '스위스', CL: '칠레', CN: '중국', CO: '콜롬비아',
  CR: '코스타리카', CY: '키프로스', CZ: '체코', DE: '독일',
  DK: '덴마크', DZ: '알제리', EE: '에스토니아', EG: '이집트',
  ES: '스페인', FI: '핀란드', FR: '프랑스', GB: '영국',
  GE: '조지아', GG: '건지섬', GR: '그리스', HK: '홍콩',
  HU: '헝가리', ID: '인도네시아', IE: '아일랜드', IL: '이스라엘',
  IN: '인도', IS: '아이슬란드', IT: '이탈리아', JP: '일본',
  KR: '대한민국', KZ: '카자흐스탄', LB: '레바논', LI: '리히텐슈타인',
  LU: '룩셈부르크', MA: '모로코', MC: '모나코', MX: '멕시코',
  MY: '말레이시아', NG: '나이지리아', NL: '네덜란드', NO: '노르웨이',
  NP: '네팔', NZ: '뉴질랜드', OM: '오만', PE: '페루',
  PH: '필리핀', PK: '파키스탄', PL: '폴란드', PT: '포르투갈',
  QA: '카타르', RO: '루마니아', RU: '러시아', SA: '사우디아라비아',
  SE: '스웨덴', SG: '싱가포르', SK: '슬로바키아', ST: '상투메프린시페',
  TH: '태국', TR: '튀르키예', TW: '대만', TZ: '탄자니아',
  UA: '우크라이나', US: '미국', VE: '베네수엘라', VN: '베트남',
  ZA: '남아프리카공화국', ZW: '짐바브웨',
};

// Render a nationality field (possibly compound, e.g. "US/ZA") in Korean.
export function nationalityToKorean(code: string): string {
  return code
    .split('/')
    .map((c) => COUNTRY_KO[c] || c)
    .join(' / ');
}

// Industry → Korean. Keys must match the raw English values used in
// billionaires.ts. Unknown industries fall back to the English name.
const INDUSTRY_KO: Record<string, string> = {
  'Automotive': '자동차',
  'Construction & Engineering': '건설·엔지니어링',
  'Diversified': '복합기업',
  'Energy': '에너지',
  'Fashion & Retail': '패션·유통',
  'Finance & Investments': '금융·투자',
  'Food & Beverage': '식음료',
  'Gambling & Casinos': '도박·카지노',
  'Healthcare': '헬스케어',
  'Logistics': '물류',
  'Manufacturing': '제조',
  'Media & Entertainment': '미디어·엔터테인먼트',
  'Metals & Mining': '금속·광업',
  'Real Estate': '부동산',
  'Service': '서비스',
  'Sports': '스포츠',
  'Technology': '기술',
  'Telecom': '통신',
};

export function industryToKorean(name: string): string {
  return INDUSTRY_KO[name] || name;
}

export default function FilterPanel({
  filters,
  onChange,
  availableNationalities,
  availableIndustries,
  availableIljus,
  totalCount,
  filteredCount,
}: FilterPanelProps) {
  const { t, lang } = useLanguage();

  // In Korean mode: pin KR / US / JP / CN at top, then sort the rest by Korean
  // display name in 가나다 order (locale-aware). In English mode: keep the
  // upstream order (alphabetical by ISO code).
  const sortedNationalities = useMemo(() => {
    if (lang !== 'ko') return availableNationalities;
    const present = new Set(availableNationalities);
    const pinned = PINNED_NATIONALITIES.filter((c) => present.has(c));
    const rest = availableNationalities
      .filter((c) => !PINNED_NATIONALITIES.includes(c))
      .sort((a, b) =>
        nationalityToKorean(a).localeCompare(nationalityToKorean(b), 'ko')
      );
    return [...pinned, ...rest];
  }, [availableNationalities, lang]);

  // Industries sorted by Korean name in 가나다 order when in Korean mode.
  const sortedIndustries = useMemo(() => {
    if (lang !== 'ko') return availableIndustries;
    return [...availableIndustries].sort((a, b) =>
      industryToKorean(a).localeCompare(industryToKorean(b), 'ko')
    );
  }, [availableIndustries, lang]);
  const update = (key: keyof Filters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    // If setting ilju, clear ilgan (they're related)
    if (key === 'ilju' && value) {
      newFilters.ilgan = '';
    }
    // If setting ilgan, clear ilju
    if (key === 'ilgan' && value) {
      newFilters.ilju = '';
    }
    onChange(newFilters);
  };

  const clearAll = () => {
    onChange({ ilgan: '', ilju: '', wolji: '', gyeokguk: '', search: '', nationality: '', industry: '', gender: '', sort: 'netWorth_desc' });
  };

  // "Has filters" = anything narrowing the set is active. Sort always has
  // a value (default 'netWorth_desc') so it doesn't count as a filter.
  const hasFilters =
    !!filters.ilgan ||
    !!filters.ilju ||
    !!filters.wolji ||
    !!filters.gyeokguk ||
    !!filters.search ||
    !!filters.nationality ||
    !!filters.industry ||
    !!filters.gender;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* Top row: filtered count + clear button (also exists at the bottom
          of the panel; putting it here makes it reachable without scrolling
          past 8 filter sections). */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          <strong className="text-gray-900">{filteredCount.toLocaleString()}</strong>{' '}
          {t.resultsOf(totalCount)}
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Gender Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.gender}</label>
        <div className="flex gap-1">
          {[
            { value: '', label: t.all },
            { value: 'M', label: t.male },
            { value: 'F', label: t.female },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => update('gender', filters.gender === opt.value ? '' : opt.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                filters.gender === opt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 일주 (Exact 60갑자) Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.dayPillar}</label>
        <select
          value={filters.ilju}
          onChange={(e) => update('ilju', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t.allDayPillars}</option>
          {availableIljus.map((ilju) => (
            <option key={ilju} value={ilju}>{ilju}</option>
          ))}
        </select>
      </div>

      {/* 일간 (Day Stem) Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.dayMaster}</label>
        <div className="flex flex-wrap gap-1">
          {CHEON_GAN.map((stem) => {
            const ohaeng = STEM_TO_OHAENG[stem];
            const isActive = filters.ilgan === stem;
            return (
              <button
                key={stem}
                onClick={() => update('ilgan', isActive ? '' : stem)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {STEM_EMOJI[stem] || OHAENG_EMOJI[ohaeng]} {stem}
              </button>
            );
          })}
        </div>
      </div>

      {/* 월지 (Month Branch) Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.monthBranch}</label>
        <div className="flex flex-wrap gap-1">
          {JI_JI.map((branch) => {
            const isActive = filters.wolji === branch;
            return (
              <button
                key={branch}
                onClick={() => update('wolji', isActive ? '' : branch)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {branch}
              </button>
            );
          })}
        </div>
      </div>

      {/* 격국 Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.pattern}</label>
        <div className="flex flex-wrap gap-1">
          {GYEOKGUK_LIST.map((guk) => {
            const isActive = filters.gyeokguk === guk;
            return (
              <button
                key={guk}
                onClick={() => update('gyeokguk', isActive ? '' : guk)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {guk}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nationality & Industry dropdowns */}
      <div className="flex gap-2">
        <select
          value={filters.nationality}
          onChange={(e) => update('nationality', e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t.allNationalities}</option>
          {sortedNationalities.map((n) => (
            <option key={n} value={n}>
              {lang === 'ko' ? nationalityToKorean(n) : n}
            </option>
          ))}
        </select>
        <select
          value={filters.industry}
          onChange={(e) => update('industry', e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t.allIndustries}</option>
          {sortedIndustries.map((i) => (
            <option key={i} value={i}>
              {lang === 'ko' ? industryToKorean(i) : i}
            </option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">{t.sort}</label>
        <select
          value={filters.sort}
          onChange={(e) => update('sort', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="netWorth_desc">{t.sortNetWorthDesc}</option>
          <option value="netWorth_asc">{t.sortNetWorthAsc}</option>
          <option value="name_asc">{t.sortNameAsc}</option>
        </select>
      </div>

      {/* Results count & clear */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          <strong className="text-gray-900">{filteredCount}</strong> {t.resultsOf(totalCount)}
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      {/* Data sources */}
      <div className="text-[10px] text-gray-400 leading-relaxed">
        Sources: Forbes Real-Time Billionaires 2026, Wikipedia, Wikidata, DuckDuckGo
      </div>
    </div>
  );
}
