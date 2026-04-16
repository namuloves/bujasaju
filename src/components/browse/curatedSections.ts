import type { EnrichedPerson } from '@/lib/saju/types';
import type { Filters } from '@/components/FilterPanel';

export interface CuratedSectionConfig {
  id: string;
  labelKo: string;
  labelEn: string;
  descriptionKo: string;
  descriptionEn: string;
  filter: (person: EnrichedPerson) => boolean;
  /** Filter to apply when "더 보기" is clicked. null = no button. */
  applyFilter: Partial<Filters> | null;
}

/** Entertainment sources that indicate a celebrity, not a tech/game CEO */
const CELEB_SOURCES = new Set([
  'JYP Entertainment', 'SM Entertainment', 'YG Entertainment',
  'BTS / HYBE', 'Acting', 'Music', 'Music & Acting', 'TV hosting',
  'Entertainment', 'Entertainment ',
  '배우', '가수', '가수/배우', '가수/P NATION', '방송인',
]);

function isKrCeleb(p: EnrichedPerson): boolean {
  if (!p.nationality.includes('KR')) return false;
  if (CELEB_SOURCES.has(p.source ?? '')) return true;
  if (p.industry === 'Entertainment') return true;
  return false;
}

function isKrChaebol(p: EnrichedPerson): boolean {
  return p.nationality.includes('KR') && p.wealthOrigin === 'inherited' && !isKrCeleb(p);
}

function isKrNewRich(p: EnrichedPerson): boolean {
  return p.nationality.includes('KR') && !isKrChaebol(p) && !isKrCeleb(p);
}

const CURATED_SECTIONS: CuratedSectionConfig[] = [
  {
    id: 'kr-chaebol',
    labelKo: '대기업 오너',
    labelEn: 'Korean Chaebol',
    descriptionKo: '한국 대기업 오너 가문',
    descriptionEn: 'Korean conglomerate owners',
    filter: isKrChaebol,
    applyFilter: null,
  },
  {
    id: 'kr-newrich',
    labelKo: '한국 신흥부자',
    labelEn: 'Korean Self-Made',
    descriptionKo: '자수성가로 부를 일군 한국의 부자들',
    descriptionEn: 'Self-made Korean billionaires',
    filter: isKrNewRich,
    applyFilter: null,
  },
  {
    id: 'tech',
    labelKo: '테크 부자',
    labelEn: 'Tech Billionaires',
    descriptionKo: '기술로 세상을 바꾼 사람들',
    descriptionEn: 'People who changed the world with technology',
    filter: (p) => p.industry === 'Technology',
    applyFilter: { industry: 'Technology' },
  },
  {
    id: 'jp',
    labelKo: '일본의 부자',
    labelEn: 'Japanese Billionaires',
    descriptionKo: '일본의 억만장자',
    descriptionEn: 'Billionaires from Japan',
    filter: (p) => p.nationality.includes('JP'),
    applyFilter: { nationality: 'JP' },
  },
  {
    id: 'kr-celeb',
    labelKo: '한국 연예인',
    labelEn: 'Korean Celebrities',
    descriptionKo: '엔터테인먼트 업계의 한국 부자들',
    descriptionEn: 'Korean entertainment billionaires',
    filter: isKrCeleb,
    applyFilter: null,
  },
  {
    id: 'cn',
    labelKo: '중국의 부자',
    labelEn: 'Chinese Billionaires',
    descriptionKo: '중국·홍콩의 억만장자',
    descriptionEn: 'Billionaires from China & Hong Kong',
    filter: (p) => p.nationality.includes('CN') || p.nationality.includes('HK'),
    applyFilter: { nationality: 'CN' },
  },
  {
    id: 'selfmade',
    labelKo: '자수성가 부자',
    labelEn: 'Self-Made Billionaires',
    descriptionKo: '맨손으로 부를 일군 사람들',
    descriptionEn: 'Built their wealth from scratch',
    filter: (p) => p.wealthOrigin === 'self-made',
    applyFilter: null,
  },
  {
    id: 'women',
    labelKo: '여성 부자',
    labelEn: 'Women Billionaires',
    descriptionKo: '세계에서 가장 부유한 여성들',
    descriptionEn: "The world's wealthiest women",
    filter: (p) => p.gender === 'F',
    applyFilter: { gender: 'F' },
  },
  {
    id: 'us',
    labelKo: '미국의 부자',
    labelEn: 'American Billionaires',
    descriptionKo: '미국의 억만장자',
    descriptionEn: 'Billionaires from the United States',
    filter: (p) => p.nationality.includes('US'),
    applyFilter: { nationality: 'US' },
  },
];

export default CURATED_SECTIONS;
