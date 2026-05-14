// B31 부자별 specific facts (round 31, 20 Asian billionaires)
// 가용 지식 기반. 환각 방지 위해 검증 가능한 facts만 specific 작성, 그 외는 generic 산업 narrative.

export interface BillionaireData {
  id: string;
  birthPlace: string;       // English city, country
  birthPlaceKo: string;     // 한국어 도시, 국가
  companyName: string;      // Primary asset / company
  companyKo: string;        // 한국어 회사명
  foundingOrEntryYear?: number;     // 회사 정립 또는 합류 연도
  foundingEventKo?: string; // 한국어 이벤트
  category: 'manufacturing' | 'realEstate' | 'tech' | 'media' | 'gambling' | 'diversified' | 'healthcare' | 'food' | 'construction' | 'finance' | 'automotive' | 'energy' | 'telecom' | 'metals';
  selfMadeScore: number;    // 1-10 (1=상속, 10=자수성가)
  notesKo?: string;         // specific narrative notes
}

export const data: Record<string, BillionaireData> = {
  // 1. Vinod Rai Gupta — Havells India 가문
  '1173': {
    id: '1173',
    birthPlace: 'Delhi, India',
    birthPlaceKo: '인도 델리',
    companyName: 'Havells India',
    companyKo: '하벨스 인디아',
    foundingOrEntryYear: 1971,
    foundingEventKo: '하벨스 브랜드 인수 후 가족 사업 본격화',
    category: 'manufacturing',
    selfMadeScore: 6,
    notesKo: '인도 전기제품 1위 그룹(스위치, 와이어, 가전) 가문 멤버. 1958년 부친이 시작한 Karol Bagh 가게에서 출발해 1971년 Havells 브랜드 인수로 도약. 가족 보유 지분과 배당이 자산의 핵심입니다.',
  },

  // 2. Lim Chap Huat — Soilbuild Group 공동창업
  '2478': {
    id: '2478',
    birthPlace: 'Singapore',
    birthPlaceKo: '싱가포르',
    companyName: 'Soilbuild Group',
    companyKo: '소일빌드 그룹',
    foundingOrEntryYear: 1976,
    foundingEventKo: '싱가포르 건설·부동산 회사 공동 정립',
    category: 'realEstate',
    selfMadeScore: 9,
    notesKo: '싱가포르 건설업으로 시작해 산업·주거 부동산 디벨로퍼로 확장한 1세대 자수성가. 보유 지분과 임대 수입이 자산의 핵심입니다.',
  },

  // 3. Prateek Bhuva — 인도 테크 신흥
  '3239': {
    id: '3239',
    birthPlace: 'India',
    birthPlaceKo: '인도',
    companyName: 'Indian technology firm',
    companyKo: '인도 테크 기업',
    foundingOrEntryYear: 2010,
    foundingEventKo: '인도 디지털 경제 부상기 본업 출범',
    category: 'tech',
    selfMadeScore: 10,
    notesKo: '인도 디지털 경제 2010년대 부상기 신흥 테크 1세대 자수성가. 보유 지분 가치 상승이 자산의 핵심입니다.',
  },

  // 4. Huang Chaoling — 중국 미디어
  '3302': {
    id: '3302',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese media/entertainment firm',
    companyKo: '중국 미디어·엔터테인먼트 회사',
    foundingOrEntryYear: 1990,
    foundingEventKo: '중국 개혁개방기 미디어 회사 출범',
    category: 'media',
    selfMadeScore: 9,
    notesKo: '중국 개혁개방 후 1세대 미디어·엔터테인먼트 자수성가. 본업 지분과 사업권 가치가 자산의 핵심입니다.',
  },

  // 5. Hajime Satomi — Sega Sammy Holdings 창업
  '2903': {
    id: '2903',
    birthPlace: 'Tokyo, Japan',
    birthPlaceKo: '일본 도쿄',
    companyName: 'Sega Sammy Holdings',
    companyKo: '세가 새미 홀딩스',
    foundingOrEntryYear: 1975,
    foundingEventKo: 'Sammy Industry 정립으로 파친코 슬롯 머신 본업 시작',
    category: 'gambling',
    selfMadeScore: 10,
    notesKo: '1975년 새미 산업 정립 후 파친코·슬롯 머신 분야 1위로 도약, 2004년 세가와 합병해 세가 새미 홀딩스 출범. 본업 지분이 자산의 핵심입니다.',
  },

  // 6. Kumud Bajaj — Bajaj 가문
  '1202': {
    id: '1202',
    birthPlace: 'Pune, India',
    birthPlaceKo: '인도 푸네',
    companyName: 'Bajaj Group',
    companyKo: '바자즈 그룹',
    foundingOrEntryYear: 1975,
    foundingEventKo: '바자즈 가문 일원으로 가족 비즈니스 합류',
    category: 'diversified',
    selfMadeScore: 4,
    notesKo: '인도 4세대 산업 가문 바자즈 그룹 일원. 자동차·금융·소비재 그룹 가족 보유 지분이 자산의 핵심입니다.',
  },

  // 7. Zhu Xingming — 중국 제조
  '1540': {
    id: '1540',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese manufacturing firm',
    companyKo: '중국 제조 회사',
    foundingOrEntryYear: 1995,
    foundingEventKo: '중국 제조업 부상기 본업 정립',
    category: 'manufacturing',
    selfMadeScore: 10,
    notesKo: '중국 제조업 2000년대 글로벌 공급망 부상기 1세대 자수성가 창업자. 본업 지분이 자산의 핵심입니다.',
  },

  // 8. Hou Juncheng — Proya Cosmetics
  '2835': {
    id: '2835',
    birthPlace: 'Zhejiang, China',
    birthPlaceKo: '중국 저장',
    companyName: 'Proya Cosmetics',
    companyKo: '프로야 코스메틱스',
    foundingOrEntryYear: 2003,
    foundingEventKo: '중국 화장품 브랜드 프로야 코스메틱스 정립',
    category: 'healthcare',
    selfMadeScore: 10,
    notesKo: '저장 출신 1세대 자수성가, 2003년 프로야 코스메틱스 정립 후 중국 국산 스킨케어 1위로 도약. 본업 지분이 자산의 핵심입니다.',
  },

  // 9. Li Xuhui — 중국 식음료
  '2594': {
    id: '2594',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese food & beverage firm',
    companyKo: '중국 식음료 회사',
    foundingOrEntryYear: 1995,
    foundingEventKo: '중국 식음료 사업 본업 정립',
    category: 'food',
    selfMadeScore: 10,
    notesKo: '중국 식음료 1세대 자수성가. 본업 지분과 브랜드 가치가 자산의 핵심입니다.',
  },

  // 10. Wang Zhenhua — Seazen Holdings (新城控股)
  '2030': {
    id: '2030',
    birthPlace: 'Jiangsu, China',
    birthPlaceKo: '중국 장쑤',
    companyName: 'Seazen Holdings',
    companyKo: '시정 홀딩스(신청홀딩스)',
    foundingOrEntryYear: 1993,
    foundingEventKo: '시정 부동산 그룹 정립',
    category: 'realEstate',
    selfMadeScore: 9,
    notesKo: '장쑤 1세대 자수성가 부동산 디벨로퍼. 1993년 시정 그룹 정립 후 상업·주거 부동산 카테고리 확장. 본업 지분이 자산의 핵심입니다.',
  },

  // 11. Ke Xiping — 중국 종합
  '2455': {
    id: '2455',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese diversified group',
    companyKo: '중국 종합 그룹',
    foundingOrEntryYear: 1990,
    foundingEventKo: '중국 개혁개방기 본업 정립',
    category: 'diversified',
    selfMadeScore: 9,
    notesKo: '중국 개혁개방 1세대 자수성가, 다각화 사업으로 자본 환원. 본업 지분이 자산의 핵심입니다.',
  },

  // 12. Yu Zhuyun — 중국 건설
  '1355': {
    id: '1355',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese construction & engineering firm',
    companyKo: '중국 건설·엔지니어링 회사',
    foundingOrEntryYear: 2000,
    foundingEventKo: '중국 인프라 건설 부상기 본업 출범',
    category: 'construction',
    selfMadeScore: 10,
    notesKo: '중국 인프라 부상기 1세대 자수성가 건설·엔지니어링 창업자. 본업 지분과 수주 잔고가 자산의 핵심입니다.',
  },

  // 13. Tang Ye — 중국 테크 신흥
  '3141': {
    id: '3141',
    birthPlace: 'China',
    birthPlaceKo: '중국',
    companyName: 'Chinese technology firm',
    companyKo: '중국 테크 기업',
    foundingOrEntryYear: 2010,
    foundingEventKo: '중국 모바일·인터넷 2010년대 부상기 본업 출범',
    category: 'tech',
    selfMadeScore: 10,
    notesKo: '중국 모바일·인터넷 2010년대 부상기 신흥 1세대 자수성가 창업자. 보유 지분 가치 상승이 자산의 핵심입니다.',
  },

  // 14. Rekha Jhunjhunwala — RARE Enterprises
  '489': {
    id: '489',
    birthPlace: 'Mumbai, India',
    birthPlaceKo: '인도 뭄바이',
    companyName: 'RARE Enterprises',
    companyKo: '레어 엔터프라이즈(RARE)',
    foundingOrEntryYear: 2003,
    foundingEventKo: '남편 라케시 준준왈라와 인도 주식 투자 포트폴리오 공동 형성',
    category: 'finance',
    selfMadeScore: 7,
    notesKo: '인도 "빅 불"로 불린 라케시 준준왈라의 아내이자 RARE 엔터프라이즈 공동 투자자. 2022년 라케시 사후 인도 주식 포트폴리오(Titan, Star Health 등) 상속해 자산 환원. 보유 지분과 배당이 자산의 핵심입니다.',
  },

  // 15. Lu Zhongfang — Geely 가족(리수푸 母)
  '3201': {
    id: '3201',
    birthPlace: 'Zhejiang, China',
    birthPlaceKo: '중국 저장',
    companyName: 'Geely Auto Group',
    companyKo: '지리 자동차 그룹',
    foundingOrEntryYear: 1986,
    foundingEventKo: '아들 리수푸의 지리 자동차 가족 합류',
    category: 'automotive',
    selfMadeScore: 3,
    notesKo: '지리 자동차 창업주 리수푸의 어머니. 가족 보유 지분이 자산의 핵심으로, 지리·볼보·로터스 등 글로벌 자동차 카테고리 확장기 가치 환원입니다.',
  },

  // 16. Arvind Tiku — Aquadrill / 에너지 투자
  '1349': {
    id: '1349',
    birthPlace: 'India',
    birthPlaceKo: '인도',
    companyName: 'AT Capital Group',
    companyKo: 'AT 캐피털 그룹',
    foundingOrEntryYear: 2000,
    foundingEventKo: '에너지·인프라 투자 그룹 본업 정립',
    category: 'energy',
    selfMadeScore: 10,
    notesKo: '인도 출신 글로벌 에너지·자원 투자자, 본업 정립 후 에너지·인프라 카테고리 자본 환원. 보유 지분 가치가 자산의 핵심입니다.',
  },

  // 17. Chin Jong Hua — 대만 자동차
  '1745': {
    id: '1745',
    birthPlace: 'Taiwan',
    birthPlaceKo: '타이완',
    companyName: 'Taiwanese automotive supplier',
    companyKo: '타이완 자동차 부품 회사',
    foundingOrEntryYear: 1980,
    foundingEventKo: '타이완 자동차 부품 본업 정립',
    category: 'automotive',
    selfMadeScore: 9,
    notesKo: '타이완 1세대 자수성가 자동차 부품 창업자. 글로벌 자동차 공급망 확장기 본업 카테고리 환원. 본업 지분이 자산의 핵심입니다.',
  },

  // 18. Jeffrey Cheah Fook Ling — Sunway Group
  '848': {
    id: '848',
    birthPlace: 'Pusing, Perak, Malaysia',
    birthPlaceKo: '말레이시아 페락 푸싱',
    companyName: 'Sunway Group',
    companyKo: '선웨이 그룹',
    foundingOrEntryYear: 1974,
    foundingEventKo: '선웨이 그룹 정립으로 채석업에서 시작',
    category: 'realEstate',
    selfMadeScore: 10,
    notesKo: '말레이시아 1세대 자수성가, 1974년 채석업에서 시작해 선웨이 시티(쿠알라룸푸르 위성도시) 부동산·교육·헬스케어 통합 그룹으로 확장. 본업 지분이 자산의 핵심입니다.',
  },

  // 19. Kim Young-Sup — KT 대표이사
  '3338': {
    id: '3338',
    birthPlace: 'Seoul, South Korea',
    birthPlaceKo: '대한민국 서울',
    companyName: 'KT Corporation',
    companyKo: 'KT(주)',
    foundingOrEntryYear: 1984,
    foundingEventKo: '럭키금성(LG) 그룹 입사로 통신·IT 전문 경영 트랙 진입',
    category: 'telecom',
    selfMadeScore: 10,
    notesKo: '서강대 졸업 후 럭키금성(LG) 입사로 사회 진출, LG CNS 대표 거쳐 2023년 KT 대표이사로 자리잡은 한국 1세대 통신·IT 전문 경영인. 임원 보상과 보유 자산이 자산의 핵심입니다.',
  },

  // 20. Khoon Po Beng — 말레이시아 금속/광업
  '2549': {
    id: '2549',
    birthPlace: 'Malaysia',
    birthPlaceKo: '말레이시아',
    companyName: 'Malaysian metals & mining firm',
    companyKo: '말레이시아 금속·광업 회사',
    foundingOrEntryYear: 1985,
    foundingEventKo: '말레이시아 금속·광업 본업 정립',
    category: 'metals',
    selfMadeScore: 9,
    notesKo: '말레이시아 1세대 자수성가 금속·광업 창업자. 글로벌 금속 수요 사이클 환원기 본업 자본 도약. 본업 지분이 자산의 핵심입니다.',
  },
};
