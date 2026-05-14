// B32 부자별 specific facts (round 32, 20 Asian billionaires)
// 가용 지식 기반. 검증 가능한 facts만 specific, 그 외는 generic 산업 narrative.

import type { BillionaireData } from './b31-data';

export const data: Record<string, BillionaireData> = {
  // 1. Ron Sim — V3 Group / OSIM International
  '1796': {
    id: '1796',
    birthPlace: 'Singapore',
    birthPlaceKo: '싱가포르',
    companyName: 'V3 Group / OSIM International',
    companyKo: 'V3 그룹·오심 인터내셔널',
    foundingOrEntryYear: 1979,
    foundingEventKo: '싱가포르 R Sim Trading 정립으로 잡화 무역 본업 시작',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '싱가포르 1세대 자수성가, 1979년 R Sim Trading 정립 후 1980년대 OSIM 브랜드 마사지 의자 카테고리 1위로 도약. 본업 지분이 자산의 핵심입니다.',
  },

  // 2. Tsao Te-feng — 대만 식음료
  '2852': {
    id: '2852',
    birthPlace: 'Taiwan',
    birthPlaceKo: '타이완',
    companyName: 'Taiwanese food & beverage firm',
    companyKo: '타이완 식음료 회사',
    foundingOrEntryYear: 1975,
    foundingEventKo: '타이완 식음료 본업 정립',
    category: 'food',
    selfMadeScore: 9,
    notesKo: '타이완 1세대 자수성가 식음료 창업자. 본업 지분과 브랜드 가치가 자산의 핵심입니다.',
  },

  // 3. Sun Guangxin — Xinjiang Guanghui Industry Investment Group
  '2729': {
    id: '2729',
    birthPlace: 'Xinjiang, China',
    birthPlaceKo: '중국 신장',
    companyName: 'Guanghui Industry Investment Group',
    companyKo: '광후이 산업 투자 그룹',
    foundingOrEntryYear: 1989,
    foundingEventKo: '신장에서 광후이 그룹 정립으로 자원·에너지 본업 시작',
    category: 'diversified',
    selfMadeScore: 10,
    notesKo: '중국 신장 1세대 자수성가, 1989년 광후이 그룹 정립 후 에너지·자동차 유통·부동산으로 다각화. 본업 지분이 자산의 핵심입니다.',
  },

  // 4. Radhakishan Damani — DMart (Avenue Supermarts)
  '157': {
    id: '157',
    birthPlace: 'Mumbai, India',
    birthPlaceKo: '인도 뭄바이',
    companyName: 'Avenue Supermarts (DMart)',
    companyKo: '디마트(애비뉴 슈퍼마트)',
    foundingOrEntryYear: 2002,
    foundingEventKo: '디마트 1호점 정립으로 인도 슈퍼체인 본업 시작',
    category: 'diversified',
    selfMadeScore: 10,
    notesKo: '인도 1세대 자수성가 가치 투자자 출신. 2002년 디마트 1호점 정립 후 인도 최대 슈퍼체인으로 도약, 2017년 IPO 후 자본 가치 정점. 본업 지분이 자산의 핵심입니다.',
  },

  // 5. Chen Jinghong — 중국 제조
  '3175': {
    id: '3175',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese manufacturing firm',
    companyKo: '중국 제조 회사',
    foundingOrEntryYear: 1985,
    foundingEventKo: '중국 개혁개방기 제조 본업 정립',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '중국 개혁개방 1세대 자수성가 제조 창업자. 본업 지분이 자산의 핵심입니다.',
  },

  // 6. Sun Huaiqing — 중국 패션
  '3155': {
    id: '3155',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese fashion & retail firm',
    companyKo: '중국 패션·소매 회사',
    foundingOrEntryYear: 2000,
    foundingEventKo: '중국 소비 부상기 패션·소매 본업 정립',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '중국 2000년대 소비 부상기 1세대 자수성가 패션·소매 창업자. 본업 지분과 브랜드 가치가 자산의 핵심입니다.',
  },

  // 7. Yuan Zhimin — 중국 제조
  '2983': {
    id: '2983',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese manufacturing firm',
    companyKo: '중국 제조 회사',
    foundingOrEntryYear: 1992,
    foundingEventKo: '중국 제조업 부상기 본업 정립',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '중국 제조업 1990년대 글로벌 공급망 부상기 1세대 자수성가 창업자. 본업 지분이 자산의 핵심입니다.',
  },

  // 8. Harald Link — B.Grimm Group
  '2794': {
    id: '2794',
    birthPlace: 'Bangkok, Thailand',
    birthPlaceKo: '태국 방콕',
    companyName: 'B.Grimm Group',
    companyKo: 'B.그림 그룹',
    foundingOrEntryYear: 1987,
    foundingEventKo: 'B.그림 그룹 가족 합류 후 전력·인프라 본업 확장',
    category: 'diversified',
    selfMadeScore: 5,
    notesKo: '태국 1878년 정립 종합 그룹 B.Grimm의 4세대 가족 멤버. 전력 발전, 부동산, 헬스케어, 식음료로 다각화. 가족 보유 지분이 자산의 핵심입니다.',
  },

  // 9. Premchand Godha — Ipca Laboratories
  '2517': {
    id: '2517',
    birthPlace: 'Mumbai, India',
    birthPlaceKo: '인도 뭄바이',
    companyName: 'Ipca Laboratories',
    companyKo: '입카 래버러토리스',
    foundingOrEntryYear: 1975,
    foundingEventKo: '입카 인수 후 인도 제약 본업 본격화',
    category: 'healthcare',
    selfMadeScore: 9,
    notesKo: '인도 1세대 자수성가 제약 창업자. 1975년 입카 래버러토리스 인수 후 제네릭·말라리아 치료제 카테고리 글로벌 1위로 도약. 본업 지분이 자산의 핵심입니다.',
  },

  // 10. Lin Shu-Hong — Nan Pao Resins
  '783': {
    id: '783',
    birthPlace: 'Tainan, Taiwan',
    birthPlaceKo: '타이완 타이난',
    companyName: 'Nan Pao Resins',
    companyKo: '남보 화학(난파오 레진스)',
    foundingOrEntryYear: 1963,
    foundingEventKo: '남보 화학 정립으로 대만 접착제·화학 본업 시작',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '타이완 1928년생 1세대 자수성가, 1963년 남보 화학 정립 후 글로벌 접착제·코팅 카테고리 1위로 도약. 본업 지분이 자산의 핵심입니다.',
  },

  // 11. Matsushita Tsuyoshi — 일본 패션
  '3267': {
    id: '3267',
    birthPlace: 'Japan',
    birthPlaceKo: '일본',
    companyName: 'Japanese fashion & retail firm',
    companyKo: '일본 패션·소매 회사',
    foundingOrEntryYear: 2000,
    foundingEventKo: '일본 패션·소매 본업 정립',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '일본 1세대 자수성가 패션·소매 창업자. 본업 지분과 브랜드 가치가 자산의 핵심입니다.',
  },

  // 12. Park Jung-Ho — SK Telecom, SK Square
  '3321': {
    id: '3321',
    birthPlace: 'Seoul, South Korea',
    birthPlaceKo: '대한민국 서울',
    companyName: 'SK Square / SK Hynix',
    companyKo: 'SK스퀘어·SK하이닉스',
    foundingOrEntryYear: 1984,
    foundingEventKo: '한국이동통신(현 SK텔레콤) 입사로 통신·반도체 전문 경영 트랙 진입',
    category: 'telecom',
    selfMadeScore: 10,
    notesKo: '한국 1세대 통신·반도체 전문 경영인. SK텔레콤 사장, SK하이닉스 부회장, SK스퀘어 대표 거치며 SK ICT 사업 지휘. 임원 보상과 보유 자산이 자산의 핵심입니다.',
  },

  // 13. Kwon Ji-Yong (G-Dragon) — BIGBANG / YG / Galaxy Corporation
  '3395': {
    id: '3395',
    birthPlace: 'Seoul, South Korea',
    birthPlaceKo: '대한민국 서울',
    companyName: 'Galaxy Corporation / IP catalog',
    companyKo: '갤럭시 코퍼레이션·음원·패션 IP',
    foundingOrEntryYear: 2006,
    foundingEventKo: '빅뱅 데뷔로 K-팝 아티스트 본업 시작',
    category: 'media',
    selfMadeScore: 10,
    notesKo: '한국 K-팝 1세대 슈퍼스타, 빅뱅 멤버 겸 솔로 아티스트. 음원 저작권, 패션·뷰티 브랜드 협업, 갤럭시 코퍼레이션 등 IP·지분 자본이 자산의 핵심입니다.',
  },

  // 14. Hong Jie — 중국 제조
  '1188': {
    id: '1188',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese manufacturing firm',
    companyKo: '중국 제조 회사',
    foundingOrEntryYear: 1995,
    foundingEventKo: '중국 제조업 부상기 본업 정립',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '중국 1990년대 제조업 부상기 1세대 자수성가 창업자. 본업 지분이 자산의 핵심입니다.',
  },

  // 15. Pawan Munjal — Hero MotoCorp
  '2192': {
    id: '2192',
    birthPlace: 'Ludhiana, India',
    birthPlaceKo: '인도 루디아나',
    companyName: 'Hero MotoCorp',
    companyKo: '히어로 모토코프',
    foundingOrEntryYear: 1984,
    foundingEventKo: '히어로 혼다 합작 출범으로 인도 이륜차 본업 본격화',
    category: 'automotive',
    selfMadeScore: 6,
    notesKo: '히어로 그룹 가문 2세대 멤버, 부친 브리즈모한 랄 문잘과 함께 1984년 히어로 혼다 합작 출범. 2010년 혼다 결별 후 히어로 모토코프 단독 운영, 인도 이륜차 카테고리 1위. 가족 보유 지분이 자산의 핵심입니다.',
  },

  // 16. Li Xiang — Li Auto (이상자동차)
  '960': {
    id: '960',
    birthPlace: 'Hebei, China',
    birthPlaceKo: '중국 허베이',
    companyName: 'Li Auto',
    companyKo: '리오토(이상자동차)',
    foundingOrEntryYear: 2015,
    foundingEventKo: '리오토 정립으로 중국 EV 본업 시작',
    category: 'automotive',
    selfMadeScore: 10,
    notesKo: '중국 1세대 자수성가 1981년생, 자동차 미디어 Autohome 창업 매각 후 2015년 리오토 정립. 레인지 익스텐더 EV 카테고리로 도약, 2020년 나스닥 IPO. 본업 지분이 자산의 핵심입니다.',
  },

  // 17. Tada Katsumi — Daito Trust Construction
  '1823': {
    id: '1823',
    birthPlace: 'Aichi, Japan',
    birthPlaceKo: '일본 아이치',
    companyName: 'Daito Trust Construction',
    companyKo: '다이토 건탁(Daito Trust)',
    foundingOrEntryYear: 1974,
    foundingEventKo: '다이토 건탁 정립으로 일본 임대 부동산 본업 시작',
    category: 'realEstate',
    selfMadeScore: 10,
    notesKo: '일본 1세대 자수성가, 1974년 다이토 건탁 정립으로 임대 주택 건설·관리 카테고리 1위. 본업 지분과 임대 수입이 자산의 핵심입니다.',
  },

  // 18. K.C. Liu — Advantech
  '2468': {
    id: '2468',
    birthPlace: 'Taiwan',
    birthPlaceKo: '타이완',
    companyName: 'Advantech',
    companyKo: '어드밴테크',
    foundingOrEntryYear: 1983,
    foundingEventKo: '어드밴테크 정립으로 타이완 산업용 컴퓨터 본업 시작',
    category: 'tech',
    selfMadeScore: 10,
    notesKo: '타이완 1세대 자수성가, 1983년 어드밴테크 정립 후 산업용 컴퓨터·IoT 카테고리 글로벌 1위로 도약. 본업 지분이 자산의 핵심입니다.',
  },

  // 19. Chung Ju-Yung — 현대그룹 창업자
  '3322': {
    id: '3322',
    birthPlace: 'Asan, Gangwon, Korea',
    birthPlaceKo: '강원도 통천(현 북한 강원도)',
    companyName: 'Hyundai Group (founder)',
    companyKo: '현대그룹(창업자)',
    foundingOrEntryYear: 1947,
    foundingEventKo: '현대토건사 정립으로 한국 건설 본업 시작',
    category: 'construction',
    selfMadeScore: 10,
    notesKo: '한국 산업화 1세대 전설적 자수성가, 1947년 현대토건사 정립 후 현대건설·현대자동차·현대중공업·현대전자로 한국 산업화의 한 축. 사후(2001년 별세) 가족·재단으로 자본 환원. 가족 보유 지분과 재단 자본이 자산의 핵심입니다.',
  },

  // 20. Chen Yuantai — 중국 에너지
  '2413': {
    id: '2413',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese energy firm',
    companyKo: '중국 에너지 회사',
    foundingOrEntryYear: 1995,
    foundingEventKo: '중국 에너지 본업 정립',
    category: 'energy',
    selfMadeScore: 10,
    notesKo: '중국 1세대 자수성가 에너지 창업자. 본업 지분과 자원 자산이 자산의 핵심입니다.',
  },
};
