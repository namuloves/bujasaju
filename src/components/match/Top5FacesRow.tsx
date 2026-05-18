'use client';

/**
 * Top5FacesRow — 결과 화면 상단의 비슷한 사주 부자 5명 얼굴 줄.
 *
 * 디자인:
 *   - 동그란 얼굴 5개 가로 그리드
 *   - 각 얼굴 위 오른쪽에 순위 배지 (1: 금색, 2: 은색, 3: 동색, 4-5: 파란색)
 *   - 사진 아래에 이름·국가·산업·재산
 *   - 클릭하면 onSelect 호출 (부모가 featured 변경)
 */

import type { EnrichedPerson } from '@/lib/saju/types';
import { useLanguage } from '@/lib/i18n';
import { industryToKorean } from '@/components/FilterPanel';

const USD_TO_KRW = 1480.71;
function formatWorthKo(netWorthB: number): string {
  const eok = netWorthB * 10 * USD_TO_KRW;
  const jo = eok / 10000;
  if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
  return `${Math.round(eok).toLocaleString('ko-KR')}억`;
}

const NATIONALITY_KO: Record<string, string> = {
  US: '미국', KR: '한국', CN: '중국', JP: '일본', IN: '인도', FR: '프랑스',
  DE: '독일', GB: '영국', RU: '러시아', BR: '브라질', CA: '캐나다',
  AE: 'UAE', SA: '사우디', SE: '스웨덴', AU: '호주', IT: '이탈리아',
  ES: '스페인', NL: '네덜란드', CH: '스위스', SG: '싱가포르', HK: '홍콩',
  TW: '대만', TH: '태국', MX: '멕시코', AR: '아르헨티나', NO: '노르웨이',
  ID: '인도네시아', PH: '필리핀', MY: '말레이시아', VN: '베트남',
  CZ: '체코', PL: '폴란드', AT: '오스트리아', BE: '벨기에', DK: '덴마크',
  FI: '핀란드', GR: '그리스', IE: '아일랜드', PT: '포르투갈', TR: '터키',
  ZA: '남아공', NG: '나이지리아', EG: '이집트', IL: '이스라엘',
  CL: '칠레', CO: '콜롬비아', PE: '페루', VE: '베네수엘라',
};

function nationalityKo(code: string | undefined, lang: string): string {
  if (!code) return '';
  if (lang !== 'ko') return code;
  return NATIONALITY_KO[code] || code;
}

function normalizePhoto(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&bold=true`;
  }
  let normalized = url;
  if (normalized.startsWith('//')) normalized = `https:${normalized}`;
  if (normalized.startsWith('http://')) normalized = normalized.replace(/^http:/, 'https:');
  if (normalized.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

interface Props {
  people: EnrichedPerson[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function Top5FacesRow({ people, selectedId, onSelect }: Props) {
  const { lang } = useLanguage();
  const top5 = people.slice(0, 5);

  if (top5.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 sm:gap-2 max-w-[640px] mx-auto">
      {top5.map((person, i) => {
        const isActive = person.id === selectedId;
        const rank = i + 1;
        const badgeColor =
          rank === 1 ? 'bg-amber-500'
          : rank === 2 ? 'bg-slate-400'
          : rank === 3 ? 'bg-amber-700'
          : 'bg-indigo-600';
        const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;
        const country = nationalityKo(person.nationality, lang);
        // Prefer the actual company name (bio-extracted) over the industry tag.
        // Fall back to the industry label so the slot is never blank.
        const companyOrIndustry =
          person.company
          || (lang === 'ko' ? industryToKorean(person.industry) : person.industry);

        // Mobile shows top 3 only; ranks 4 & 5 still render on sm+ screens
        // where the grid widens to 5 columns. Keeps the data path intact
        // so the user's "selected" state stays valid across breakpoints.
        const hiddenOnMobile = i >= 3 ? 'hidden sm:block' : '';

        return (
          <button
            key={person.id}
            type="button"
            onClick={() => onSelect(person.id)}
            className={`text-center px-1 py-2 rounded-xl transition-colors ${hiddenOnMobile} ${
              isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
            }`}
            aria-pressed={isActive}
          >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2">
              <span
                className={`absolute -top-1 -right-1 z-10 inline-flex items-center justify-center w-5 h-5 sm:w-[22px] sm:h-[22px] rounded-full text-[10px] sm:text-[11px] font-bold text-white border-2 border-white shadow-sm ${badgeColor}`}
              >
                {rank}
              </span>
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border-[3px] border-white shadow">
                <img
                  src={normalizePhoto(person.photoUrl, person.name)}
                  alt={person.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=200&background=random&bold=true`;
                  }}
                />
              </div>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-900 leading-tight truncate">
              {displayName}
            </p>
            {country && (
              <p className="text-[10px] text-gray-500 truncate">{country}</p>
            )}
            <p className="text-[10px] text-gray-500 truncate">{companyOrIndustry}</p>
            <p className="text-[11px] sm:text-xs font-bold text-indigo-600 mt-0.5">
              {formatWorthKo(person.netWorth)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
