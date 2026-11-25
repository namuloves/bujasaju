/**
 * Korean business families, for the /family pages that compare their
 * members' saju side by side.
 *
 * WHY: Google searches that actually bring clicks are "[재벌가 인물] 사주",
 * and they cluster by family (홍라희·이부진·이서현, 정유경·이명희·정용진,
 * 김승연·김동관). One page per family answers the next question those
 * searchers have — how do the others in the family compare — and links
 * each member's profile.
 *
 * Only people visible in the dataset are listed (ids from
 * private-data/enriched-billionaires.json). `relation` avoids job titles
 * that change often; where a title is used it is the long-standing one.
 *
 * Plain data, no fs: the profile page (a client component) imports it to
 * show the "가문 사주 비교" link.
 */

export interface FamilyMember {
  /** Profile id in the enriched dataset. */
  id: string;
  /** Relation and company, e.g. "이건희의 장녀 · 호텔신라 사장". */
  relation: string;
}

export interface Family {
  slug: string;
  /** Group name without 家/가: "삼성". UI shows "삼성家", titles "삼성가". */
  name: string;
  /** One or two sentences shown under the heading and used in the meta description. */
  intro: string;
  /** The names searchers know best, for the <title>. */
  titleNames: string[];
  /** Ordered by generation, founder first. */
  members: FamilyMember[];
  /** Slugs of related families (e.g. 신세계 branched off 삼성). */
  related?: string[];
}

export const FAMILIES: Family[] = [
  {
    slug: 'samsung',
    name: '삼성',
    intro:
      '이병철 창업주에서 이건희 선대회장, 이재용 회장으로 이어진 삼성 일가 6명의 사주를 한눈에 비교해요.',
    titleNames: ['이재용', '이부진', '이서현', '홍라희'],
    members: [
      { id: '3317', relation: '삼성 창업주' },
      { id: '3318', relation: '이병철의 3남 · 삼성 선대회장' },
      { id: '480', relation: '이건희의 부인 · 전 리움미술관 관장' },
      { id: '111', relation: '이건희의 장남 · 삼성전자 회장' },
      { id: '417', relation: '이건희의 장녀 · 호텔신라 사장' },
      { id: '455', relation: '이건희의 차녀 · 삼성물산' },
    ],
    related: ['shinsegae'],
  },
  {
    slug: 'hyundai',
    name: '범현대',
    intro:
      '정주영 창업주와 아들들, 손자들, 그리고 동생들의 아들까지 — 범현대가 11명의 사주를 비교해요.',
    titleNames: ['정주영', '정몽구', '정의선', '정지선'],
    members: [
      { id: '3322', relation: '현대그룹 창업주' },
      { id: '550', relation: '정주영의 차남 · 현대자동차그룹 명예회장' },
      { id: '3439', relation: '정주영의 3남 · 현대백화점그룹 명예회장' },
      { id: '1510', relation: '정주영의 6남 · HD현대 최대주주' },
      { id: '3375', relation: '정주영의 7남 · 현대해상 회장' },
      { id: '675', relation: '정몽구의 장남 · 현대자동차그룹 회장' },
      { id: '3434', relation: '정몽근의 장남 · 현대백화점그룹 회장' },
      { id: '3332', relation: '정몽준의 장남 · HD현대' },
      { id: '3373', relation: '정주영의 조카(정세영의 장남) · HDC 회장' },
      { id: '3340', relation: '정주영의 조카(정인영의 차남) · HL그룹 회장' },
      { id: '3370', relation: '정주영의 조카(정상영의 장남) · KCC 회장' },
    ],
  },
  {
    slug: 'lg',
    name: 'LG',
    intro:
      '구인회 창업주부터 구광모 회장까지, LG 일가와 희성·LX·LT로 갈라진 형제들의 사주를 비교해요.',
    titleNames: ['구광모', '구본능', '구본준', '구본식'],
    members: [
      { id: '3333', relation: 'LG 창업주' },
      { id: '1861', relation: '구자경의 차남 · 희성그룹 회장 · 구광모의 친부' },
      { id: '3410', relation: '구자경의 3남 · LX그룹 회장' },
      { id: '2200', relation: '구자경의 4남 · LT그룹 회장' },
      { id: '2156', relation: '구인회의 증손자 · LG그룹 회장' },
    ],
  },
  {
    slug: 'shinsegae',
    name: '신세계',
    intro:
      '이병철 창업주의 막내딸 이명희 총괄회장과 정용진·정유경 남매, 신세계 일가 3명의 사주를 비교해요.',
    titleNames: ['정용진', '정유경', '이명희'],
    members: [
      { id: '3435', relation: '이병철의 막내딸 · 신세계그룹 총괄회장' },
      { id: '1918', relation: '이명희의 장남 · 신세계그룹 회장' },
      { id: '3394', relation: '이명희의 장녀 · 신세계 회장' },
    ],
    related: ['samsung'],
  },
  {
    slug: 'hanwha',
    name: '한화',
    intro: '김승연 회장과 장남 김동관 부회장, 한화 부자(父子)의 사주를 비교해요.',
    titleNames: ['김승연', '김동관'],
    members: [
      { id: '3325', relation: '한화그룹 회장' },
      { id: '3016', relation: '김승연의 장남 · 한화그룹 부회장' },
    ],
  },
  {
    slug: 'sk',
    name: 'SK',
    intro: '최태원 회장과 여동생 최기원 이사장, SK 남매의 사주를 비교해요.',
    titleNames: ['최태원', '최기원'],
    members: [
      { id: '1518', relation: 'SK그룹 회장' },
      { id: '3077', relation: '최태원의 여동생 · SK행복나눔재단 이사장' },
    ],
  },
  {
    slug: 'kumho',
    name: '금호',
    intro: '박인천 창업주와 박삼구·박찬구 형제, 금호 일가 3명의 사주를 비교해요.',
    titleNames: ['박인천', '박삼구', '박찬구'],
    members: [
      { id: '3341', relation: '금호그룹 창업주' },
      { id: '3383', relation: '박인천의 3남 · 전 금호아시아나그룹 회장' },
      { id: '3342', relation: '박인천의 4남 · 금호석유화학그룹' },
    ],
  },
  {
    slug: 'hyosung',
    name: '효성',
    intro: '조석래 명예회장의 장남 조현준 회장과 3남 조현상 부회장, 효성 형제의 사주를 비교해요.',
    titleNames: ['조현준', '조현상'],
    members: [
      { id: '1437', relation: '조석래의 장남 · 효성그룹 회장' },
      { id: '3360', relation: '조석래의 3남 · HS효성 부회장' },
    ],
  },
  {
    slug: 'seah',
    name: '세아',
    intro: '이순형 회장과 조카 이태성, 아들 이주성 — 세아 일가 3명의 사주를 비교해요.',
    titleNames: ['이순형', '이태성', '이주성'],
    members: [
      { id: '3381', relation: '세아그룹 회장' },
      { id: '3431', relation: '고 이운형 회장의 장남 · 세아홀딩스' },
      { id: '3432', relation: '이순형의 장남 · 세아제강지주' },
    ],
  },
  {
    slug: 'doosan',
    name: '두산',
    intro: '두산그룹 초대 회장 박두병과 손자 박정원 회장의 사주를 비교해요.',
    titleNames: ['박두병', '박정원'],
    members: [
      { id: '3326', relation: '두산그룹 초대 회장' },
      { id: '3327', relation: '박두병의 손자 · 두산그룹 회장' },
    ],
  },
  {
    slug: 'dongwon',
    name: '동원',
    intro: '김재철 창업주와 차남 김남정 회장, 동원 부자(父子)의 사주를 비교해요.',
    titleNames: ['김재철', '김남정'],
    members: [
      { id: '3372', relation: '동원그룹 창업주' },
      { id: '3365', relation: '김재철의 차남 · 동원그룹 회장' },
    ],
  },
];

export function getFamily(slug: string): Family | undefined {
  return FAMILIES.find((f) => f.slug === slug);
}

/** Families a profile belongs to (usually one). */
export function familiesForPerson(id: string): Family[] {
  return FAMILIES.filter((f) => f.members.some((m) => m.id === id));
}
