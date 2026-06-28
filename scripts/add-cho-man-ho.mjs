import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const peoplePath = path.join(root, 'public', 'billionaires.json');
const bioPath = path.join(root, 'public', 'deep-bios-v2', '3474.json');
const people = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));

if (people.some((person) => person.name === 'Cho Man-ho' || person.nameKo === '조만호')) {
  throw new Error('Cho Man-ho already exists in billionaires.json');
}
if (people.some((person) => String(person.id) === '3474')) {
  throw new Error('ID 3474 is already in use');
}

const source = [
  'https://www.koreajoongangdaily.com/business/how-musinsas-founder-built-a-fashion-empire/12724269',
  'https://www.mk.co.kr/en/business/10977399',
  'https://www.bloomberg.com/news/articles/2025-08-18/kkr-backed-korea-fashion-retailer-musinsa-considering-ipo',
  'https://www.bondweb.co.kr/_research/downloadPage.asp?number=852026&gn=1',
  'https://www.businessoffashion.com/news/retail/korean-fashion-retailer-musinsa-seeking-68-billion-valuation-with-ipo/',
].join('; ');

const person = {
  id: '3474',
  name: 'Cho Man-ho',
  nameKo: '조만호',
  birthday: '1983-08-31',
  netWorth: 1.3,
  nationality: 'KR',
  industry: 'Fashion & Retail',
  gender: 'M',
  source: 'MUSINSA',
  photoUrl: '/avatars/cho-man-ho.jpg',
  company: 'MUSINSA',
  companyKo: '무신사',
  bio: 'Cho Man-ho founded the sneaker community that became MUSINSA, South Korea’s largest fashion platform. His fortune is primarily tied to his controlling stake in the privately held company.',
  bioKo: '조만호는 운동화 사진 커뮤니티를 국내 최대 패션 플랫폼 무신사로 성장시켰다. 재산의 대부분은 비상장기업 무신사의 지배지분 가치에서 나온다.',
  wealthOrigin: 'self-made',
};

people.push(person);
people.sort((a, b) => Number(a.id) - Number(b.id));
fs.writeFileSync(peoplePath, `${JSON.stringify(people, null, 2)}\n`);

const timeline = [
  [2001, 'Created an online sneaker-photo community', '고등학생 때 온라인 운동화 사진 커뮤니티 ‘무진장 신발 사진이 많은 곳’을 만들었다.'],
  [2003, 'Expanded the community into a fashion webzine', '커뮤니티를 패션 정보와 스트리트 스냅을 다루는 웹진으로 확장했다.'],
  [2009, 'Launched MUSINSA Store', '입점 브랜드 상품을 판매하는 무신사 스토어를 열었다.'],
  [2012, 'Built an emerging-brand distribution platform', '신생 국내 브랜드의 콘텐츠·판매·고객 데이터를 연결하는 유통 플랫폼을 구축했다.'],
  [2017, 'Launched MUSINSA Standard', '자체 패션 브랜드 무신사 스탠다드를 출시했다.'],
  [2018, 'Expanded into women’s fashion with WUSINSA', '여성 패션 플랫폼 우신사를 확대하며 남성 스트리트웨어 밖으로 고객층을 넓혔다.'],
  [2019, 'Raised capital from Sequoia Capital', 'Sequoia Capital 투자 유치로 무신사가 유니콘 기업으로 평가받았다.'],
  [2021, 'Stepped down after a discriminatory coupon controversy', '여성 고객 대상 쿠폰 논란에 책임을 지고 대표직에서 물러났다.'],
  [2021, 'Acquired StyleShare and 29CM', 'StyleShare와 29CM을 인수해 패션 플랫폼 포트폴리오를 확대했다.'],
  [2022, 'Expanded offline and resale operations', '무신사 스탠다드 오프라인 매장과 한정판 거래 플랫폼 솔드아웃 투자를 확대했다.'],
  [2023, 'Raised capital from KKR and Wellington Management', 'KKR과 Wellington Management에서 신규 투자를 유치했다.'],
  [2024, 'Returned as chief executive officer', '해외 진출과 수익성 개선을 직접 이끌기 위해 CEO로 복귀했다.'],
  [2025, 'Prepared MUSINSA for a potential public offering', '글로벌 패션 플랫폼 확대와 기업공개 가능성을 준비했다.'],
];

const age = (year) => year - 1983;
const careerTimeline = timeline.map(([year, event, eventKo]) => ({
  year,
  age: age(year),
  event,
  eventKo,
  whyItMatteredKo: '커뮤니티 이용자와 독립 브랜드를 거래·콘텐츠·데이터로 연결해 무신사의 기업가치와 조만호의 지분가치를 높인 단계였다.',
  whatTheyRiskedKo: '초기 자본, 플랫폼 신뢰, 입점 브랜드 관계와 창업자 평판을 감수했다.',
  whoHelpedKo: '무신사 커뮤니티 이용자, 입점 브랜드, 임직원과 외부 투자자',
  source,
}));

const bio = {
  id: '3474',
  name: 'Cho Man-ho',
  nameKo: '조만호',
  netWorth: '$1.3B',
  nationality: 'KR',
  industry: 'Fashion & Retail',
  childhood: {
    birthPlace: 'Tongyeong, South Gyeongsang Province, South Korea',
    birthPlaceKo: '대한민국 경상남도 통영시',
    familyBackground: 'Public profiles describe a non-chaebol background and an early fascination with sneakers and street fashion.',
    familyBackgroundKo: '재벌가나 유통기업 집안이 아닌 환경에서 성장했고 청소년기부터 운동화와 스트리트 패션에 강한 관심을 보였다.',
    education: 'He attended high school in Korea and built the precursor to MUSINSA while still a student.',
    educationKo: '한국에서 고등학교를 다니던 중 무신사의 전신인 운동화 사진 커뮤니티를 만들었다.',
    earlyLife: 'He photographed sneakers and organized information that was difficult for Korean consumers to find online.',
    earlyLifeKo: '국내에서 찾기 어려웠던 운동화 사진과 발매·착용 정보를 직접 모아 온라인 이용자들과 공유했다.',
    capitalTypeKo: '취미 커뮤니티를 거래 플랫폼으로 전환해 지분가치를 만든 자수성가형',
    source,
  },
  capitalOrigin: {
    typeKo: 'self-made',
    explanationKo: '무신사(MUSINSA) 창업자 지분이 재산의 핵심이다. 2024년 말 공개자료에서 조만호의 지분은 약 53%로 제시됐다. 순자산은 아직 실현되지 않은 비상장 지분가치이므로 2023년 외부 투자 평가액을 기준으로 보수적으로 계산했다.',
    source,
  },
  careerTimeline,
  turningPoints: [
    {
      year: 2009,
      age: age(2009),
      decisionKo: '광고와 커뮤니티 운영에 머물지 않고 입점 브랜드의 상품을 직접 거래하는 무신사 스토어를 열었다.',
      alternativeKo: '패션 웹진과 커뮤니티만 운영하면서 광고수익을 얻을 수 있었다.',
      outcomeKo: '콘텐츠 이용자가 구매자로 전환되면서 거래액과 입점 브랜드가 함께 늘어나는 플랫폼 구조가 만들어졌다.',
      source,
    },
    {
      year: 2017,
      age: age(2017),
      decisionKo: '플랫폼 사업자가 입점 브랜드와 경쟁할 위험을 감수하고 자체 브랜드 무신사 스탠다드를 출시했다.',
      alternativeKo: '수수료 기반 중개사업에만 집중할 수 있었다.',
      outcomeKo: '높은 반복구매와 오프라인 확장이 가능한 자체 상품 매출을 확보했지만 입점업체와의 이해상충 관리가 중요해졌다.',
      source,
    },
    {
      year: 2024,
      age: age(2024),
      decisionKo: '2021년 사임 이후 이사회 역할에 머물지 않고 CEO로 복귀했다.',
      alternativeKo: '전문경영인에게 운영을 맡기고 대주주 역할만 유지할 수 있었다.',
      outcomeKo: '수익성, 해외 진출과 기업공개 준비를 창업자가 다시 직접 책임지는 구조가 됐다.',
      source,
    },
  ],
  moneyMechanics: {
    coreBusinessKo: '패션 콘텐츠와 커뮤니티로 수요를 모은 뒤 입점 수수료·광고·물류·자체 브랜드·오프라인 매장에서 수익을 얻는다.',
    moatKo: '한국 스트리트 패션 커뮤니티의 축적된 브랜드 관계, 검색·구매 데이터, 젊은 고객 인지도와 무신사 스탠다드의 가격 경쟁력이 진입장벽이다.',
    luckVsSkillKo: '스마트폰 쇼핑과 K-패션 성장기는 운이었지만 커뮤니티를 커머스로 전환하고 작은 브랜드의 판매·마케팅 문제를 동시에 해결한 것은 실행력이다.',
    politicalCapitalKo: '재벌 유통망보다 독립 브랜드와 창작자 생태계에서 출발했다. 회사가 커진 뒤에는 공정거래, 노동, 소비자 보호와 입점업체 상생이 중요한 제도적 자본이 됐다.',
    capitalHistoryKo: '개인 비용으로 운영한 운동화 커뮤니티 → 무신사 스토어 거래수익 → 자체 브랜드와 투자유치 → 2024년 말 약 53% 창업자 지분 → 비상장 지분가치 약 10억 달러 이상',
    source,
  },
  failures: [
    {
      year: 2021,
      age: age(2021),
      description: 'A coupon campaign offered a larger discount to women, triggering accusations of discriminatory treatment.',
      descriptionKo: '여성 고객에게 더 큰 할인쿠폰을 제공한 캠페인이 남성 고객 차별 논란으로 번졌다.',
      howTheyOvercameKo: '공개 사과와 함께 대표직에서 물러나고 개인지분 일부를 임직원에게 나누겠다고 밝혔다.',
      lessonKo: '세분화 마케팅도 기존 핵심고객에게 차별로 인식될 수 있으며 플랫폼의 보상정책은 일관성과 설명 가능성이 필요하다.',
      source,
    },
    {
      year: 2022,
      age: age(2022),
      description: 'The Soldout resale business faced delayed settlements, authentication complaints and mounting losses.',
      descriptionKo: '한정판 거래 플랫폼 솔드아웃이 정산 지연, 검수 불만과 누적손실을 겪었다.',
      howTheyOvercameKo: '수수료 정책과 운영 프로세스를 조정하고 검수·정산 역량을 보강하면서 투자속도를 낮췄다.',
      lessonKo: '커뮤니티·패션 역량이 금융에 가까운 양면거래의 정산과 진품보증 역량을 자동으로 만들어 주지는 않는다.',
      source,
    },
    {
      year: 2023,
      age: age(2023),
      description: 'Rapid acquisitions and overseas expansion increased consolidated losses and organizational complexity.',
      descriptionKo: 'StyleShare·29CM·솔드아웃과 해외사업의 빠른 확장으로 연결손실과 조직 복잡성이 커졌다.',
      howTheyOvercameKo: '중복 서비스를 정리하고 수익성이 높은 무신사·29CM·무신사 스탠다드에 자본과 경영인력을 집중했다.',
      lessonKo: '플랫폼 포트폴리오는 사용자 수보다 각 사업의 반복 가능한 단위경제성과 통합비용으로 평가해야 한다.',
      source,
    },
  ],
  wealthHistory: [
    { year: 2019, netWorth: 0.5 },
    { year: 2021, netWorth: 1.1 },
    { year: 2023, netWorth: 1.3 },
    { year: 2026, netWorth: 1.3 },
  ],
  quotes: [],
  books: { authored: [], recommended: [] },
  personalTraits: {
    knownFor: 'Turning a sneaker photo community into MUSINSA, South Korea’s dominant fashion platform.',
    knownForKo: '운동화 사진 커뮤니티를 한국을 대표하는 패션 플랫폼 무신사로 성장시킨 것으로 알려져 있다.',
    philanthropy: 'He has supported emerging fashion brands and announced employee share transfers after stepping down in 2021.',
    philanthropyKo: '신진 패션 브랜드 지원사업을 운영했고 2021년 사임 당시 개인지분 일부를 임직원에게 나누겠다고 발표했다.',
    controversies: 'His tenure included a discriminatory coupon controversy, platform fairness questions and losses at acquired or newly launched businesses.',
    controversiesKo: '성별 할인쿠폰 논란, 입점업체와 자체 브랜드 사이의 공정성, 신규·인수사업의 손실 문제가 제기됐다.',
  },
  characterKo: {
    observedTraitsKo: '유행을 좇기보다 특정 취향 공동체의 불편을 오래 관찰하고 콘텐츠·거래·상품으로 단계적으로 확장하는 성향이 강하다.',
    leadershipStyleKo: '초기에는 제품과 브랜드 감각을 직접 통제했으며 회사가 커진 뒤 전문경영 체제와 창업자 복귀를 모두 경험했다.',
    conflictBehaviorKo: '대외 논란이 커졌을 때 사과와 사임으로 책임을 인정했지만, 사업의 핵심 방향에는 다시 직접 개입하는 방식을 택했다.',
    knownQuirksKo: '고등학생 운동화 마니아가 만든 긴 이름의 사진 커뮤니티가 회사명 ‘무신사’의 기원이 됐다.',
    source,
  },
  sajuConnection: null,
};

fs.writeFileSync(bioPath, `${JSON.stringify(bio, null, 2)}\n`);
console.log('Added 3474 Cho Man-ho and Deep Bio V2');
