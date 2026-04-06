'use client';

import { CheonGan, JiJi, GyeokGuk, Gender } from '@/lib/saju/types';
import { CHEON_GAN, JI_JI, STEM_TO_OHAENG, GABIA_60 } from '@/lib/saju/constants';

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

export default function FilterPanel({
  filters,
  onChange,
  availableNationalities,
  availableIndustries,
  availableIljus,
  totalCount,
  filteredCount,
}: FilterPanelProps) {
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

  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="이름으로 검색..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Gender Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">성별 (Gender)</label>
        <div className="flex gap-1">
          {[
            { value: '', label: '전체' },
            { value: 'M', label: '남성 ♂' },
            { value: 'F', label: '여성 ♀' },
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
        <label className="block text-xs font-medium text-gray-500 mb-1.5">일주 (Day Pillar - 六十甲子)</label>
        <select
          value={filters.ilju}
          onChange={(e) => update('ilju', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">전체 일주</option>
          {availableIljus.map((ilju) => (
            <option key={ilju} value={ilju}>{ilju}</option>
          ))}
        </select>
      </div>

      {/* 일간 (Day Stem) Filter */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">일간 (Day Master)</label>
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
        <label className="block text-xs font-medium text-gray-500 mb-1.5">월지 (Month Branch)</label>
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
        <label className="block text-xs font-medium text-gray-500 mb-1.5">격국 (Pattern)</label>
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
          <option value="">모든 국적</option>
          {availableNationalities.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <select
          value={filters.industry}
          onChange={(e) => update('industry', e.target.value)}
          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">모든 업종</option>
          {availableIndustries.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">정렬 (Sort)</label>
        <select
          value={filters.sort}
          onChange={(e) => update('sort', e.target.value)}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="netWorth_desc">자산 높은순</option>
          <option value="netWorth_asc">자산 낮은순</option>
          <option value="name_asc">이름순</option>
        </select>
      </div>

      {/* Results count & clear */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          <strong className="text-gray-900">{filteredCount}</strong> / {totalCount}명
        </span>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            필터 초기화
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
