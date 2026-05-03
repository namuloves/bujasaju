import type { EnrichedPerson, OHaeng } from '@/lib/saju/types';
import type { Filters } from '@/components/FilterPanel';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG } from '@/lib/saju/constants';

/**
 * True when `person` has zero occurrences of `target` across year/month/day
 * pillars (6 characters: 3 stems + 3 branches). Hour is excluded because
 * billionaire hour pillars are almost always unknown — counting a null hour
 * as "missing" would inflate every element.
 */
export function isMissingOhaeng(person: EnrichedPerson, target: OHaeng): boolean {
  const { year, month, day } = person.saju.saju;
  const elements: OHaeng[] = [
    STEM_TO_OHAENG[year.stem], BRANCH_TO_OHAENG[year.branch],
    STEM_TO_OHAENG[month.stem], BRANCH_TO_OHAENG[month.branch],
    STEM_TO_OHAENG[day.stem], BRANCH_TO_OHAENG[day.branch],
  ];
  return !elements.includes(target);
}

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
    applyFilter: { nationality: 'KR', wealthOrigin: 'inherited' },
  },
  {
    id: 'kr-newrich',
    labelKo: '한국 신흥부자',
    labelEn: 'Korean Self-Made',
    descriptionKo: '자수성가로 부를 일군 한국의 부자들',
    descriptionEn: 'Self-made Korean billionaires',
    filter: isKrNewRich,
    applyFilter: { nationality: 'KR', wealthOrigin: 'self-made', industryExclude: 'Entertainment' },
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
    applyFilter: { wealthOrigin: 'self-made' },
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
  {
    id: 'in',
    labelKo: '인도의 부자',
    labelEn: 'Indian Billionaires',
    descriptionKo: '인도의 억만장자',
    descriptionEn: 'Billionaires from India',
    filter: (p) => p.nationality.includes('IN'),
    applyFilter: { nationality: 'IN' },
  },
  {
    id: 'de',
    labelKo: '독일의 부자',
    labelEn: 'German Billionaires',
    descriptionKo: '독일의 억만장자',
    descriptionEn: 'Billionaires from Germany',
    filter: (p) => p.nationality.includes('DE'),
    applyFilter: { nationality: 'DE' },
  },
  {
    id: 'gb',
    labelKo: '영국의 부자',
    labelEn: 'British Billionaires',
    descriptionKo: '영국의 억만장자',
    descriptionEn: 'Billionaires from the United Kingdom',
    filter: (p) => p.nationality.includes('GB'),
    applyFilter: { nationality: 'GB' },
  },
  {
    id: 'fr',
    labelKo: '프랑스의 부자',
    labelEn: 'French Billionaires',
    descriptionKo: '프랑스의 억만장자',
    descriptionEn: 'Billionaires from France',
    filter: (p) => p.nationality.includes('FR'),
    applyFilter: { nationality: 'FR' },
  },
  {
    id: 'finance',
    labelKo: '월가의 거물',
    labelEn: 'Finance Moguls',
    descriptionKo: '금융과 투자로 일군 부',
    descriptionEn: 'Wealth built in finance and investing',
    filter: (p) => p.industry === 'Finance & Investments',
    applyFilter: { industry: 'Finance & Investments' },
  },
  {
    id: 'fashion',
    labelKo: '패션 제국',
    labelEn: 'Fashion Empires',
    descriptionKo: 'LVMH, 자라, 나이키 — 패션과 리테일의 왕국',
    descriptionEn: 'LVMH, Zara, Nike — kingdoms of fashion and retail',
    filter: (p) => p.industry === 'Fashion & Retail',
    applyFilter: { industry: 'Fashion & Retail' },
  },
  {
    id: 'realestate',
    labelKo: '부동산 재벌',
    labelEn: 'Real Estate Tycoons',
    descriptionKo: '땅과 건물로 일군 부',
    descriptionEn: 'Wealth built on land and buildings',
    filter: (p) => p.industry === 'Real Estate',
    applyFilter: { industry: 'Real Estate' },
  },
  {
    id: 'food',
    labelKo: '음식료 부자',
    labelEn: 'Food & Beverage Billionaires',
    descriptionKo: '먹고 마시는 것으로 일군 부',
    descriptionEn: 'Wealth built on food and drink',
    filter: (p) => p.industry === 'Food & Beverage',
    applyFilter: { industry: 'Food & Beverage' },
  },
  {
    id: 'healthcare',
    labelKo: '의료·제약 부자',
    labelEn: 'Healthcare Billionaires',
    descriptionKo: '의료와 제약으로 일군 부',
    descriptionEn: 'Wealth built in healthcare and pharma',
    filter: (p) => p.industry === 'Healthcare',
    applyFilter: { industry: 'Healthcare' },
  },
  {
    id: 'energy',
    labelKo: '에너지 부자',
    labelEn: 'Energy Billionaires',
    descriptionKo: '석유·가스·신재생으로 일군 부',
    descriptionEn: 'Wealth built in oil, gas and renewables',
    filter: (p) => p.industry === 'Energy',
    applyFilter: { industry: 'Energy' },
  },
  {
    id: 'sports',
    labelKo: '스포츠 부자',
    labelEn: 'Sports Billionaires',
    descriptionKo: '스포츠 구단과 산업으로 일군 부',
    descriptionEn: 'Wealth built in sports teams and industries',
    filter: (p) => p.industry === 'Sports',
    applyFilter: { industry: 'Sports' },
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
  // 일간(日干) 기반 테마 — 같은 일간을 가진 부자들
  {
    id: 'ilgan-gap',
    labelKo: '갑목 (甲) 부자',
    labelEn: 'Gap Billionaires',
    descriptionKo: '리더십과 야망의 갑목 일간 부자들',
    descriptionEn: 'Leaders and visionaries with Gap day stem',
    filter: (p) => p.saju.saju.day.stem === '갑',
    applyFilter: { ilgan: '갑' },
  },
  {
    id: 'ilgan-byeong',
    labelKo: '병화 (丙) 부자',
    labelEn: 'Byeong Billionaires',
    descriptionKo: '열정과 표현력의 병화 일간 부자들',
    descriptionEn: 'Passionate and expressive Byeong day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '병',
    applyFilter: { ilgan: '병' },
  },
  {
    id: 'ilgan-mu',
    labelKo: '무토 (戊) 부자',
    labelEn: 'Mu Billionaires',
    descriptionKo: '안정과 신뢰의 무토 일간 부자들',
    descriptionEn: 'Stable and dependable Mu day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '무',
    applyFilter: { ilgan: '무' },
  },
  {
    id: 'ilgan-gyeong',
    labelKo: '경금 (庚) 부자',
    labelEn: 'Gyeong Billionaires',
    descriptionKo: '결단력과 추진력의 경금 일간 부자들',
    descriptionEn: 'Decisive Gyeong day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '경',
    applyFilter: { ilgan: '경' },
  },
  {
    id: 'ilgan-im',
    labelKo: '임수 (壬) 부자',
    labelEn: 'Im Billionaires',
    descriptionKo: '지혜와 통찰의 임수 일간 부자들',
    descriptionEn: 'Wise Im day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '임',
    applyFilter: { ilgan: '임' },
  },
  {
    id: 'ilgan-eul',
    labelKo: '을목 (乙) 부자',
    labelEn: 'Eul Billionaires',
    descriptionKo: '유연함과 끈기의 을목 일간 부자들',
    descriptionEn: 'Flexible Eul day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '을',
    applyFilter: { ilgan: '을' },
  },
  {
    id: 'ilgan-jeong',
    labelKo: '정화 (丁) 부자',
    labelEn: 'Jeong Billionaires',
    descriptionKo: '섬세함과 따뜻함의 정화 일간 부자들',
    descriptionEn: 'Gentle Jeong day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '정',
    applyFilter: { ilgan: '정' },
  },
  {
    id: 'ilgan-gi',
    labelKo: '기토 (己) 부자',
    labelEn: 'Gi Billionaires',
    descriptionKo: '포용과 실리의 기토 일간 부자들',
    descriptionEn: 'Pragmatic Gi day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '기',
    applyFilter: { ilgan: '기' },
  },
  {
    id: 'ilgan-sin',
    labelKo: '신금 (辛) 부자',
    labelEn: 'Sin Billionaires',
    descriptionKo: '정교함과 품격의 신금 일간 부자들',
    descriptionEn: 'Refined Sin day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '신',
    applyFilter: { ilgan: '신' },
  },
  {
    id: 'ilgan-gye',
    labelKo: '계수 (癸) 부자',
    labelEn: 'Gye Billionaires',
    descriptionKo: '세심함과 직관의 계수 일간 부자들',
    descriptionEn: 'Intuitive Gye day stem billionaires',
    filter: (p) => p.saju.saju.day.stem === '계',
    applyFilter: { ilgan: '계' },
  },
  // 오행 결핍 테마 — 연/월/일주에서 해당 오행이 0개인 부자들 (시주는 대부분 미상이라 제외)
  {
    id: 'missing-mok',
    labelKo: '목이 없는 부자들',
    labelEn: 'Billionaires Without Wood',
    descriptionKo: '',
    descriptionEn: '',
    filter: (p) => isMissingOhaeng(p, '목'),
    applyFilter: { missingOhaeng: '목' },
  },
  {
    id: 'missing-hwa',
    labelKo: '화가 없는 부자들',
    labelEn: 'Billionaires Without Fire',
    descriptionKo: '',
    descriptionEn: '',
    filter: (p) => isMissingOhaeng(p, '화'),
    applyFilter: { missingOhaeng: '화' },
  },
  {
    id: 'missing-to',
    labelKo: '토가 없는 부자들',
    labelEn: 'Billionaires Without Earth',
    descriptionKo: '',
    descriptionEn: '',
    filter: (p) => isMissingOhaeng(p, '토'),
    applyFilter: { missingOhaeng: '토' },
  },
  {
    id: 'missing-geum',
    labelKo: '금이 없는 부자들',
    labelEn: 'Billionaires Without Metal',
    descriptionKo: '',
    descriptionEn: '',
    filter: (p) => isMissingOhaeng(p, '금'),
    applyFilter: { missingOhaeng: '금' },
  },
  {
    id: 'missing-su',
    labelKo: '수가 없는 부자들',
    labelEn: 'Billionaires Without Water',
    descriptionKo: '',
    descriptionEn: '',
    filter: (p) => isMissingOhaeng(p, '수'),
    applyFilter: { missingOhaeng: '수' },
  },
];

export default CURATED_SECTIONS;
