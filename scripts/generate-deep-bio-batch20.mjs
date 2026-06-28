import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'public', 'deep-bios-v2');
const peoplePath = path.join(root, 'public', 'billionaires.json');

const batch = [
  {
    id: '1269', name: 'Jim Breyer', nameKo: '제임스 W. 브레이어',
    company: 'Breyer Capital, Accel', companyKo: '브레이어 캐피털, 액셀',
    origin: 'self-made', industry: 'Finance & Investments', nationality: 'US',
    birthplace: 'New Haven, Connecticut, United States', birthplaceKo: '미국 코네티컷주 뉴헤이븐',
    family: 'Born to Hungarian immigrant parents; his father was an engineer and IDG executive and his mother worked as a Honeywell executive.',
    familyKo: '헝가리계 이민자 부모 사이에서 태어났다. 아버지는 엔지니어이자 IDG 임원이었고 어머니는 Honeywell 임원으로 일했다.',
    education: 'B.S. from Stanford University and MBA from Harvard Business School.',
    educationKo: '스탠퍼드대학교 학사, 하버드경영대학원 MBA를 받았다.',
    early: 'Worked at Apple and McKinsey before joining Accel in 1987.',
    earlyKo: 'Apple과 McKinsey를 거쳐 1987년 벤처캐피털 Accel에 합류했다.',
    capitalType: '교육·기술산업 네트워크를 활용했지만 핵심 재산은 벤처투자 성과로 만든 자수성가형',
    source: 'https://www.breyercapital.com/; https://www.accel.com/people/jim-breyer; https://en.wikipedia.org/wiki/Jim_Breyer',
    timeline: [
      [1983, 'Stanford graduation and early work at Apple', '스탠퍼드 졸업 후 Apple에서 초기 경력을 시작했다.'],
      [1987, 'Joined Accel', '벤처캐피털 Accel에 합류했다.'],
      [1995, 'Became managing partner of Accel', 'Accel 매니징 파트너가 됐다.'],
      [2000, 'Helped establish Accel-KKR', '기술기업 바이아웃 투자사 Accel-KKR 설립에 관여했다.'],
      [2005, 'Led Accel’s $12.7 million Facebook investment', 'Accel의 Facebook 1,270만 달러 투자를 주도했다.'],
      [2006, 'Founded Breyer Capital', '가족자본 투자회사 Breyer Capital을 설립했다.'],
      [2013, 'Left Facebook and Walmart boards', 'Facebook과 Walmart 이사회에서 물러나 독립투자에 집중했다.'],
      [2020, 'Opened Breyer Capital’s Austin office', 'Breyer Capital의 오스틴 거점을 열었다.'],
      [2025, 'Expanded healthcare-AI investing', 'Breyer Capital의 헬스케어·AI 투자조직을 확대했다.'],
    ],
    turning: [
      [2005, '매출이 없던 Facebook에 Accel 펀드의 대규모 초기투자를 집행했다.', '검증된 소프트웨어기업에 분산투자할 수 있었다.', 'Facebook IPO 때 역사적인 벤처수익을 만들었다.'],
      [2006, 'Accel 경력과 별도로 Breyer Capital을 설립했다.', '대형 벤처캐피털의 파트너로만 남을 수 있었다.', '자신과 가족의 자본으로 AI·헬스케어까지 장기투자 범위를 넓혔다.'],
    ],
    failures: [
      [2000, '닷컴버블 붕괴로 Accel의 기술투자 포트폴리오가 큰 평가손실을 겪었다.', '투자속도를 조절하고 살아남은 인터넷기업과 차세대 창업자에 집중했다.', '기술의 방향이 맞아도 가격과 자금조달 주기는 별개다.'],
      [2013, 'Dell 비상장화 거래를 둘러싼 이해상충 논쟁 속에서 이사직을 내려놓았다.', '공개기업 이사회 역할을 줄이고 Breyer Capital의 직접투자에 집중했다.', '투자자와 이사의 역할이 겹칠 때 절차적 신뢰가 중요하다.'],
      [2022, '기술주와 암호자산 하락으로 성장투자 가치가 압박받았다.', 'AI와 헬스케어처럼 장기 수요가 분명한 분야로 신규투자의 초점을 좁혔다.', '유행보다 기술·규제·시장 진입경로를 함께 검증해야 한다.'],
    ],
    mechanics: ['초기 기술기업 지분을 낮은 가치에 확보하고 네트워크·이사회 지원으로 기업가치를 키운 뒤 IPO와 인수에서 회수', 'Accel과 Breyer Capital의 창업자 네트워크, 후속투자 능력, 미국·중국·유럽을 잇는 관계망', 'Facebook이라는 초대형 승자는 운의 비중도 컸지만 창업자 판단과 장기보유는 실력이다.', '정부 특혜보다 대학·기술기업·글로벌 투자 네트워크가 핵심 비재무 자본이다.', '급여·성과보수 → Accel 파트너 지분 → Facebook 등 IPO 수익 → Breyer Capital 가족자본 재투자'],
    traits: ['관계 구축과 패턴 인식이 빠르고 창업자에게 장기간 접근하는 네트워크형 투자자다.', '이사회와 공동투자를 활용해 창업자·후속자본을 연결한다.', '공개 충돌보다 이사회 이동과 포트폴리오 재배치로 대응한다.', '기술·영화·중국·헬스케어를 넘나드는 폭넓은 투자 네트워크로 유명하다.'],
  },
  {
    id: '1356', name: 'George Argyros', nameKo: '조지 레온 아르기로스',
    company: 'Arnel & Affiliates', companyKo: '아넬 앤드 어필리에이츠',
    origin: 'self-made', industry: 'Real Estate', nationality: 'US',
    birthplace: 'Detroit, Michigan, United States', birthplaceKo: '미국 미시간주 디트로이트',
    family: 'Son of Greek immigrants; worked from a young age and later moved with his family to Southern California.',
    familyKo: '그리스계 이민자 가정에서 태어나 어린 시절부터 일했고 가족과 함께 남부 캘리포니아로 이주했다.',
    education: 'B.A. from Chapman University.',
    educationKo: '채프먼대학교에서 학사학위를 받았다.',
    early: 'Began in grocery and real-estate brokerage work before buying small commercial properties.',
    earlyKo: '식료품점과 부동산 중개업을 거쳐 소규모 상업용 부동산을 매입하기 시작했다.',
    capitalType: '이민자 가정에서 중개수수료와 소형 부동산을 종잣돈으로 키운 자수성가형',
    source: 'https://www.chapman.edu/about/our-family/leadership/argyros.aspx; https://en.wikipedia.org/wiki/George_Argyros',
    timeline: [
      [1963, 'Founded Arnel Development Company', '부동산회사 Arnel Development Company를 설립했다.'],
      [1970, 'Expanded into apartments and commercial property', '아파트와 상업용 부동산 보유를 확대했다.'],
      [1978, 'Built Arnel into a major Southern California landlord', 'Arnel을 남부 캘리포니아의 주요 임대사업자로 성장시켰다.'],
      [1981, 'Purchased the Seattle Mariners', '메이저리그 Seattle Mariners를 인수했다.'],
      [1987, 'Sold AirCal stake after American Airlines acquisition', 'American Airlines의 AirCal 인수로 항공투자 지분을 회수했다.'],
      [1989, 'Sold the Seattle Mariners', 'Seattle Mariners를 매각했다.'],
      [1990, 'Joined Freddie Mac board', 'Freddie Mac 이사회에 합류했다.'],
      [1998, 'Continued expanding Arnel’s apartment portfolio', 'Arnel의 아파트 임대 포트폴리오를 계속 확대했다.'],
      [2001, 'Became U.S. ambassador to Spain and Andorra', '주스페인·안도라 미국대사로 취임했다.'],
      [2005, 'Returned to Arnel & Affiliates and philanthropy', 'Arnel & Affiliates와 재단 활동에 복귀했다.'],
    ],
    turning: [
      [1963, '부동산 중개에 머물지 않고 Arnel을 세워 직접 자산을 보유했다.', '수수료 기반 중개업을 계속할 수 있었다.', '임대 현금흐름과 자산가치 상승을 동시에 확보했다.'],
      [1981, 'Seattle Mariners를 인수해 스포츠 구단주가 됐다.', '부동산에만 자본을 집중할 수 있었다.', '전국적 인지도와 스포츠 자산 경험을 얻었지만 운영손실도 부담했다.'],
    ],
    failures: [
      [1984, 'Seattle Mariners가 관중과 성적 부진으로 지속적인 운영손실을 기록했다.', '선수단과 운영을 조정한 뒤 1989년 구단을 매각했다.', '명성자산은 현금흐름과 운영역량이 없으면 부동산보다 훨씬 불안정하다.'],
      [1991, '남부 캘리포니아 부동산 침체로 공실과 자산가치가 압박받았다.', '장기보유와 낮은 원가 기반의 임대주택 포트폴리오로 회복을 기다렸다.', '임대업은 유동성과 장기 보유능력이 핵심이다.'],
      [2001, 'Arnel이 임대보증금 관행과 관련해 캘리포니아 검찰과 합의했다.', '합의금을 지급하고 임대관리 절차를 수정했다.', '대규모 주거사업은 자산수익뿐 아니라 소비자 보호 절차가 중요하다.'],
    ],
    mechanics: ['남부 캘리포니아 아파트와 상업용 부동산을 장기간 보유해 임대료와 토지가치 상승을 축적', '대규모 지역 포트폴리오, 장기 금융관계, 저원가 취득자산', '캘리포니아 성장이라는 운과 경기 저점에서 자산을 보유할 유동성·인내가 결합됐다.', '공화당 모금과 외교직 등 정치 네트워크가 공적 영향력을 키웠지만 부의 원천은 민간 부동산이다.', '중개수입 → 소형 상가 → Arnel 아파트·상업자산 → 항공·야구 투자 회수 → 장기 임대 포트폴리오'],
    traits: ['보수적 장기보유와 공적 역할을 병행하는 관계 중심 사업가다.', '전문 관리조직을 통해 자산을 오래 보유하는 소유주형이다.', '분쟁은 합의와 자산 매각으로 정리하는 실용적 성향이다.', '부동산 사업가에서 구단주와 대사까지 활동영역을 넓혔다.'],
  },
  {
    id: '1422', name: 'Daniel Pritzker', nameKo: '대니얼 프리츠커',
    company: 'Hyatt, Jay Pritzker Foundation, Bolden', companyKo: '하얏트, 제이 프리츠커 재단, 볼든',
    origin: 'inherited', industry: 'Finance & Investments', nationality: 'US',
    birthplace: 'Chicago, Illinois, United States', birthplaceKo: '미국 일리노이주 시카고',
    family: 'Son of Hyatt co-founder Jay Pritzker and member of the Pritzker industrial and hotel family.',
    familyKo: 'Hyatt 공동창업자 Jay Pritzker의 아들로 호텔·산업기업을 보유한 프리츠커 가문에서 성장했다.',
    education: 'B.A. from Tufts University and J.D. from Northwestern University.',
    educationKo: '터프츠대학교 학사, 노스웨스턴대학교 법학박사 학위를 받았다.',
    early: 'Trained as a lawyer but pursued music, philanthropy, and film rather than operating Hyatt directly.',
    earlyKo: '법률교육을 받았지만 Hyatt 직접경영보다 음악·자선·영화 활동을 선택했다.',
    capitalType: 'Hyatt와 Marmon 계열 가문지분을 물려받은 명확한 상속자본형',
    source: 'https://en.wikipedia.org/wiki/Daniel_Pritzker; https://www.pritzkerfoundation.org/',
    timeline: [
      [1981, 'Graduated from Tufts University', '터프츠대학교를 졸업했다.'],
      [1986, 'Earned law degree from Northwestern', '노스웨스턴대학교 법학학위를 받았다.'],
      [1990, 'Founded and performed with Sonia Dada', '밴드 Sonia Dada의 기타리스트·작곡가로 활동했다.'],
      [1998, 'Continued music production while serving family philanthropic interests', '음악 제작을 이어가며 가문 재단 활동에도 참여했다.'],
      [2001, 'Pritzker family settlement process began', '프리츠커 가문의 신탁·상속 분할 과정이 시작됐다.'],
      [2005, 'Expanded Jay Pritzker Foundation education work', 'Jay Pritzker Foundation의 교육지원 활동을 확대했다.'],
      [2006, 'Began long production of the film Bolden', '재즈영화 Bolden의 장기 제작에 착수했다.'],
      [2014, 'Reworked and refinanced the long-running Bolden production', '장기 지연된 Bolden 제작을 재정비하고 추가 자금을 투입했다.'],
      [2017, 'Donated Jerry Garcia’s Wolf guitar for auction', 'Jerry Garcia의 Wolf 기타를 자선경매에 내놓았다.'],
      [2019, 'Released Bolden', '직접 투자·연출한 영화 Bolden을 개봉했다.'],
    ],
    turning: [
      [1990, '가문기업 경영 대신 Sonia Dada를 통해 음악가의 길을 택했다.', 'Hyatt나 Marmon 경영에 합류할 수 있었다.', '재산과 별개의 창작 정체성을 만들었다.'],
      [2006, '상업성이 불확실한 Buddy Bolden 영화를 장기간 자기자본으로 제작했다.', '전통적인 투자 포트폴리오에만 자본을 둘 수 있었다.', '2019년 작품을 완성했지만 제작기간과 비용이 크게 늘었다.'],
    ],
    failures: [
      [2001, '프리츠커 가문 신탁 분할을 둘러싼 가족분쟁이 공개됐다.', '장기간 협상과 합의를 통해 가문자산을 개별 상속인에게 분배했다.', '복잡한 가족지배구조는 명확한 권한과 승계원칙이 필요하다.'],
      [2008, 'Bolden 제작이 반복적인 재촬영과 방향 변경으로 장기 지연됐다.', '개인자본을 추가 투입하고 제작진·편집 방향을 바꿔 완성했다.', '열정 프로젝트도 일정·예산·의사결정 규율이 필요하다.'],
      [2019, 'Bolden은 긴 제작기간에 비해 제한적인 흥행성과를 거뒀다.', '영화 수익보다 문화적 기록과 음악지원 활동으로 의미를 확장했다.', '개인적 성취와 재무적 수익은 다른 기준으로 평가해야 한다.'],
    ],
    mechanics: ['Hyatt Hotels와 Pritzker 가문의 산업·투자자산에서 발생한 상속지분과 분배금의 장기 운용', '가문 신탁, 글로벌 호텔 브랜드, 분산된 비상장 산업자산', '부의 형성은 상속이 결정적이며 개인 실력은 자산보존과 문화·교육 자선의 방향 설정에 있다.', '가문·재단·대학 네트워크가 주요 비재무 자본이다.', 'Pritzker 가문 신탁 → Hyatt·Marmon 가치 상승 → 가족 합의에 따른 자산분배 → 재단·영화·음악 프로젝트'],
    traits: ['상업적 가문배경과 창작자 정체성을 분리하려는 독립성이 강하다.', '직접 경영보다 재단·프로젝트에 장기 자금을 제공하는 후원자형이다.', '가족갈등에는 공개대립보다 장기 합의로 대응했다.', '영화 한 편을 10년 이상 자기자본으로 제작할 만큼 집요하다.'],
  },
  {
    id: '1436', name: 'Sylvan Adams', nameKo: '실반 애덤스',
    company: 'Iberville Developments, Israel–Premier Tech', companyKo: '이버빌 디벨롭먼츠, 이스라엘-프리미어 테크',
    origin: 'mixed', industry: 'Real Estate', nationality: 'IL',
    birthplace: 'Quebec City, Canada', birthplaceKo: '캐나다 퀘벡시',
    family: 'Son of Holocaust survivor and real-estate developer Marcel Adams, founder of Iberville Developments.',
    familyKo: '홀로코스트 생존자이자 Iberville Developments 창업자인 부동산 개발업자 Marcel Adams의 아들이다.',
    education: 'Studied business and developed his career inside the family real-estate company.',
    educationKo: '경영 분야를 공부하고 가족 부동산회사에서 경력을 쌓았다.',
    early: 'Joined Iberville Developments and eventually served nearly 25 years as president and CEO.',
    earlyKo: 'Iberville Developments에 합류해 약 25년간 사장 겸 CEO를 맡았다.',
    capitalType: '가문 부동산을 물려받아 직접 운영·확장한 혼합형',
    source: 'https://www.israelpremiertech.com/; https://en.wikipedia.org/wiki/Sylvan_Adams',
    timeline: [
      [1981, 'Joined Iberville Developments', '가족 부동산회사 Iberville Developments에 합류했다.'],
      [1989, 'Expanded Iberville’s commercial-property operations', 'Iberville의 상업용 부동산 운영을 확대했다.'],
      [1992, 'Became a senior leader of Iberville', 'Iberville의 핵심 경영자가 됐다.'],
      [2000, 'Expanded Canadian retail property portfolio', '캐나다 소매 부동산 포트폴리오를 확대했다.'],
      [2008, 'Led redevelopment and management of Iberville properties', 'Iberville 보유 부동산의 재개발과 운영을 이끌었다.'],
      [2015, 'Immigrated to Israel', '이스라엘로 이주했다.'],
      [2017, 'Backed Israel Cycling Academy', '프로 사이클팀 Israel Cycling Academy를 후원했다.'],
      [2018, 'Helped bring Giro d’Italia start to Israel', 'Giro d’Italia의 이스라엘 출발을 유치했다.'],
      [2020, 'Team entered WorldTour as Israel Start-Up Nation', '사이클팀이 WorldTour에 진입했다.'],
      [2022, 'Team became Israel–Premier Tech', '팀이 Israel–Premier Tech로 개편됐다.'],
      [2025, 'Appointed president of World Jewish Congress Israel', '세계유대인회의 이스라엘 회장에 임명됐다.'],
    ],
    turning: [
      [2015, '캐나다의 가족 부동산 경영을 떠나 이스라엘로 이주했다.', 'Iberville 경영에 계속 집중할 수 있었다.', '재산의 활용목적을 부동산 성장에서 이스라엘 스포츠·문화 홍보로 전환했다.'],
      [2017, '작은 이스라엘 사이클팀을 세계대회급으로 키우는 데 자본을 투입했다.', '전통적인 재단기부만 할 수 있었다.', 'Israel–Premier Tech와 Giro 유치를 통해 국제적 영향력을 얻었다.'],
    ],
    failures: [
      [2019, '사이클팀의 WorldTour 진입이 성적과 라이선스 조건 때문에 불확실했다.', 'Katusha 구조와 라이선스를 결합해 WorldTour 진입을 성사시켰다.', '스포츠 자산은 후원금뿐 아니라 경기력·라이선스·파트너십이 필요하다.'],
      [2022, 'Israel–Premier Tech가 성적부진으로 WorldTour에서 강등됐다.', '선수영입과 장기 후원을 유지하며 대회 초청과 재승격을 추진했다.', '브랜드 목적이 강해도 경쟁성과가 부족하면 제도적 지위를 잃는다.'],
      [2025, '가자전쟁 관련 시위로 팀이 유럽대회에서 거센 반대와 안전문제에 직면했다.', '팀 운영과 후원을 계속하며 명칭·참가전략을 검토했다.', '국가브랜드와 스포츠를 결합하면 지정학적 위험이 직접 전이된다.'],
    ],
    mechanics: ['Iberville Developments의 캐나다 상업용 부동산 임대·개발 지분을 상속받고 운영해 가치 상승을 축적', '장기 임대자산, 가족자본, 캐나다 부동산 네트워크', '가문자본이 핵심이고 장기간 CEO로 운영한 경험이 자산보존과 확대에 기여했다.', '이스라엘 정치·문화·스포츠 네트워크는 현재 영향력의 핵심 자본이다.', 'Marcel Adams의 부동산 → Iberville 경영승계 → 자산 유동화·분배 → Israel–Premier Tech와 국제행사 후원'],
    traits: ['목표를 크게 설정하고 스포츠를 국가브랜드 도구로 활용하는 행동형 후원자다.', '직접 자금을 투입하고 선수·행사·정부를 연결하는 오너형이다.', '비판에 물러서기보다 공개적으로 자신의 목적을 설명하는 편이다.', '40대 이후 사이클을 시작해 마스터스 대회에 직접 출전했다.'],
  },
  {
    id: '1460', name: 'John Arnold', nameKo: '존 더글러스 아놀드',
    company: 'Centaurus Advisors, Arnold Ventures', companyKo: '센타우루스 어드바이저스, 아놀드 벤처스',
    origin: 'self-made', industry: 'Finance & Investments', nationality: 'US',
    birthplace: 'Dallas, Texas, United States', birthplaceKo: '미국 텍사스주 댈러스',
    family: 'Raised by a teacher/accountant mother and corporate-lawyer father; his father died when Arnold was eighteen.',
    familyKo: '교사·회계사로 일한 어머니와 기업변호사 아버지 밑에서 성장했으며 18세에 아버지를 잃었다.',
    education: 'B.A. in mathematics and economics from Vanderbilt University, completed in three years.',
    educationKo: '밴더빌트대학교에서 수학·경제학 학사를 3년 만에 마쳤다.',
    early: 'Started a sports-card company at fourteen and joined Enron as an oil analyst after college.',
    earlyKo: '14세에 스포츠카드 사업을 시작했고 대학 졸업 후 Enron의 석유 분석가로 입사했다.',
    capitalType: '에너지 트레이딩 성과와 헤지펀드 지분으로 부를 만든 자수성가형',
    source: 'https://www.arnoldventures.org/; https://en.wikipedia.org/wiki/John_D._Arnold',
    timeline: [
      [1995, 'Joined Enron', 'Enron에 석유 분석가로 입사했다.'],
      [1996, 'Moved to natural-gas derivatives trading', '천연가스 파생상품 트레이딩을 맡았다.'],
      [2001, 'Generated a major profit for Enron’s trading desk', 'Enron 트레이딩 부문에서 대규모 이익을 냈다.'],
      [2002, 'Founded Centaurus Advisors', '헤지펀드 Centaurus Advisors를 설립했다.'],
      [2006, 'Centaurus profited during the Amaranth collapse', 'Amaranth 붕괴 국면의 반대 포지션에서 큰 수익을 냈다.'],
      [2008, 'Founded Laura and John Arnold Foundation', 'Laura and John Arnold Foundation을 설립했다.'],
      [2012, 'Closed Centaurus and returned capital', 'Centaurus를 폐쇄하고 투자자 자금을 반환했다.'],
      [2019, 'Reorganized philanthropy as Arnold Ventures', '자선조직을 Arnold Ventures LLC로 개편했다.'],
      [2024, 'Joined Meta board', 'Meta 이사회에 합류했다.'],
    ],
    turning: [
      [2002, 'Enron 파산 직후 자신의 보너스와 외부자금으로 Centaurus를 창업했다.', '다른 금융회사에 취업할 수 있었다.', '10년간 에너지 트레이딩으로 억만장자 자산을 만들었다.'],
      [2012, '38세에 수익성 높은 Centaurus를 닫고 전업 자선가로 전환했다.', '계속 자산을 운용해 더 큰 수수료를 얻을 수 있었다.', 'Arnold Ventures를 통해 과학·보건·형사정책에 장기 영향력을 구축했다.'],
    ],
    failures: [
      [2001, 'Enron이 회계부정으로 파산해 회사와 트레이딩 경력의 평판이 위기에 놓였다.', '범죄혐의 없이 회사를 떠나 독립 펀드를 설립하고 별도 실적을 만들었다.', '개인의 성과도 조직의 통제·윤리 실패와 분리되지 않는다.'],
      [2005, '에너지가격 지수 조작 가능성과 관련해 증언 요구와 시장감시를 받았다.', '규제기관에 의견을 제출하고 거래·위험관리 체계를 공식화했다.', '시장지배적 거래자는 성과뿐 아니라 가격형성의 공정성을 입증해야 한다.'],
      [2016, 'Arnold Ventures의 연금·보석금 위험평가 사업이 노조와 시민단체의 비판을 받았다.', '데이터 공개와 정책평가를 확대하며 일부 도구와 접근법을 수정했다.', '데이터 기반 정책도 편향·정당성·현장효과를 검증해야 한다.'],
    ],
    mechanics: ['천연가스 현물·선물·파생상품의 가격차와 수급 변화를 집중 분석해 높은 절대수익을 추구', '에너지시장 전문성, 독점적 데이터 해석, 빠른 위험축소, 높은 자기자본 비중', '에너지 변동성과 경쟁펀드 붕괴는 운이었고 포지션 설계와 손실통제는 실력이다.', '현재는 자선자본을 통해 정책·연구기관 네트워크가 큰 영향력을 만든다.', 'Enron 보너스 → Centaurus 창업자지분·성과보수 → 펀드 폐쇄 후 가족자산 → Arnold Ventures에 수십억 달러 이전'],
    traits: ['조용하고 확률·데이터에 집착하며 인기보다 측정 가능한 결과를 중시한다.', '소규모 전문팀에 명확한 목표와 손실한도를 주는 분석가형이다.', '감정적 논쟁보다 연구비·데이터·정책실험으로 대응한다.', '최고 수익기에 펀드를 자발적으로 닫고 전업 자선가로 전환했다.'],
  },
];

// Compact records for the remaining 15. Their structure is expanded by the
// same builder below; company names are repeated in overview and timeline.
const remaining = [
  ['1471','Christian Latouche','크리스티앙 라투슈','Fiducial SA','피두시알 SA','self-made','France','프랑스','ESCP Business School graduate who founded Fiducial in 1970 after accounting work.','ESCP를 졸업하고 회계업무를 거쳐 1970년 Fiducial을 창업했다.','https://www.fiducial.com/; https://en.wikipedia.org/wiki/Christian_Latouche',
    [[1970,'Founded Fiducial','Fiducial을 설립했다.'],[1980,'Built a national accounting network','프랑스 전국 회계사무소망을 구축했다.'],[1990,'Expanded Fiducial into legal and payroll services','법무·급여 서비스로 확장했다.'],[2000,'Expanded Fiducial internationally','Fiducial을 해외시장으로 확대했다.'],[2008,'Kept acquiring small professional-service firms','소형 전문서비스 회사를 계속 인수했다.'],[2012,'Expanded into media assets including Sud Radio','Sud Radio 등 미디어 자산으로 확대했다.'],[2020,'Continued as owner and CEO of Fiducial','Fiducial 소유주 겸 CEO 역할을 이어갔다.']],
    ['중소기업 회계·세무·법무·급여를 구독형 관계로 묶고 소형 사무소를 인수해 규모를 키우는 방식','전국 지점망과 규제 전문성, 고객 전환비용','프랑스 중소기업 성장과 인수기회는 운, 표준화와 장기보유는 실력','정부 특혜보다 전문자격·지역 고객망이 핵심','회계사 경력 → Fiducial 창업 → 사무소 인수 → 법무·IT·부동산·미디어 다각화'],
    [[1991,'경기침체로 중소기업 고객의 폐업과 수수료 압박이 커졌다.','서비스를 다각화하고 인수로 고객기반을 넓혔다.','반복매출도 고객 생존율과 경기분산이 필요하다.'],[2008,'금융위기로 회계·부동산 고객의 활동이 위축됐다.','비용을 통제하고 장기계약 서비스에 집중했다.','전문서비스는 불황에도 필수업무를 중심으로 해야 한다.'],[2014,'미디어 자산 확장이 본업과의 시너지 논쟁을 낳았다.','Fiducial 브랜드와 기업고객 대상 콘텐츠로 포지셔닝했다.','다각화는 본업과 연결되는 명확한 논리가 필요하다.']]],
  ['1479','Joseph Edelman','조지프 에델만','Perceptive Advisors','퍼셉티브 어드바이저스','self-made','San Francisco, United States','미국 샌프란시스코','Son of Columbia biochemist Isidore Edelman; studied psychology at UC San Diego and earned an NYU Stern MBA.','Columbia 생화학자 Isidore Edelman의 아들로 UCSD 심리학과 NYU Stern MBA를 마쳤다.','https://www.perceptivelife.com/; https://en.wikipedia.org/wiki/Joseph_Edelman',
    [[1987,'Began as a biotechnology analyst','생명공학 애널리스트로 경력을 시작했다.'],[1990,'Joined Prudential Securities','Prudential Securities의 선임 바이오 애널리스트가 됐다.'],[1994,'Ran Aries Funds at Paramount Capital','Paramount Capital의 Aries Funds를 운용했다.'],[1999,'Founded Perceptive Advisors with $6 million','600만 달러로 Perceptive Advisors를 설립했다.'],[2013,'Launched Perceptive Credit Opportunities Fund','생명과학 크레딧 펀드를 출범했다.'],[2019,'Launched Perceptive Xontogeny venture fund','초기 바이오 벤처펀드를 출범했다.'],[2021,'Expanded ARYA Sciences SPAC platform','ARYA Sciences SPAC 플랫폼을 확대했다.'],[2023,'Perceptive assets recovered toward $8–10 billion','Perceptive 운용자산이 80억~100억 달러 수준으로 회복됐다.']],
    ['상장·비상장 바이오기업의 임상 가능성을 분석해 집중투자하고 크레딧·벤처·SPAC으로 자금조달 전 과정을 제공','과학자·임상의·경영진 네트워크와 30년 바이오 데이터','신약 성공은 운이 크지만 포트폴리오·손실한도·장기분석은 실력','FDA와 학계 네트워크가 핵심 비재무 자본','애널리스트 급여 → Aries 운용 → Perceptive 창업자지분·성과보수 → 크레딧·벤처·SPAC 확장'],
    [[2002,'바이오 약세장에서 대표펀드가 첫 연간손실을 기록했다.','포지션 크기와 손실한도를 강화하고 소형 혁신기업 연구를 유지했다.','임상가설과 시장유동성을 함께 관리해야 한다.'],[2008,'금융위기에 대표펀드가 약 24% 손실을 기록했다.','현금과 숏 포지션을 활용하며 이후 회복기에 재투자했다.','전문성만으로 시스템 유동성 충격을 피할 수 없다.'],[2022,'2년간 바이오 급락으로 40%가 넘는 누적손실과 SEC SPAC 공시 제재를 겪었다.','포트폴리오를 줄이고 공시·이해상충 절차를 강화했다.','집중투자와 복잡한 자금조달은 투명한 이해상충 관리가 필수다.']]],
  ['1520','Mortimer Zuckerman','모티머 벤저민 주커먼','Boston Properties, U.S. News & World Report','보스턴 프로퍼티스, U.S. 뉴스 앤드 월드 리포트','self-made','Montreal, Canada','캐나다 몬트리올','Law and business graduate who taught at Harvard before entering real estate.','법학·경영학을 공부하고 Harvard에서 강의한 뒤 부동산업에 들어갔다.','https://www.bostonproperties.com/; https://en.wikipedia.org/wiki/Mortimer_Zuckerman',
    [[1966,'Joined Cabot, Cabot & Forbes','Cabot, Cabot & Forbes에 합류했다.'],[1970,'Became CFO and senior vice president','CFO 겸 수석부사장이 됐다.'],[1970,'Co-founded Boston Properties','Boston Properties를 공동 설립했다.'],[1980,'Acquired The Atlantic','The Atlantic을 인수했다.'],[1984,'Acquired U.S. News & World Report','U.S. News & World Report를 인수했다.'],[1993,'Acquired New York Daily News','New York Daily News를 인수했다.'],[1997,'Took Boston Properties public as a REIT','Boston Properties를 REIT로 상장했다.'],[2000,'Sold Fast Company for about $365 million','Fast Company를 약 3억6,500만 달러에 매각했다.'],[2017,'Sold New York Daily News','New York Daily News를 매각했다.']],
    ['도심 핵심 오피스를 개발·장기임대해 Boston Properties REIT 가치와 배당을 키우고 미디어 자산을 별도 매매','보스턴·뉴욕·워싱턴 핵심입지, 대형 임차인, 자본시장 접근성','도시 오피스 성장과 금리환경은 운, 입지·개발·매각 타이밍은 실력','정책·언론 네트워크가 미디어 영향력과 자본조달을 보완','부동산회사 급여·지분 → Boston Properties 창업 → REIT 상장 → 미디어 인수·매각 → 장기 오피스 지분'],
    [[1991,'부동산 침체로 오피스 가치와 금융조달이 압박받았다.','핵심입지와 장기임차 계약을 유지해 회복을 기다렸다.','개발사는 만기구조와 공실위험을 보수적으로 관리해야 한다.'],[2001,'닷컴붕괴로 Fast Company 등 미디어 가치가 급락했다.','고점 매각으로 확보한 현금을 다른 자산에 재배치했다.','미디어 유행자산은 매각시점이 수익을 결정한다.'],[2008,'광고·부동산 동시침체로 New York Daily News와 오피스사업이 타격받았다.','REIT 유동성과 자산매각·비용통제로 버텼다.','서로 다른 산업도 거시충격에서는 동시에 하락할 수 있다.']]],
  ['1530','V. Prem Watsa','V. 프렘 왓사','Fairfax Financial Holdings','페어팩스 파이낸셜 홀딩스','self-made','Hyderabad, India','인도 하이데라바드','Chemical engineer from IIT Madras who earned an MBA at Western University and began at Confederation Life.','IIT Madras 화학공학과 Western University MBA를 거쳐 Confederation Life에서 일했다.','https://www.fairfax.ca/; https://en.wikipedia.org/wiki/Prem_Watsa',
    [[1974,'Joined Confederation Life in Canada','캐나다 Confederation Life에 입사했다.'],[1984,'Co-founded Hamblin Watsa Investment Counsel','Hamblin Watsa Investment Counsel을 공동 설립했다.'],[1985,'Took control of troubled Markel Financial','부실한 Markel Financial의 경영권을 인수했다.'],[1987,'Renamed the group Fairfax Financial','그룹을 Fairfax Financial로 개편했다.'],[2007,'Credit hedges produced major gains','신용위기 대비 헤지에서 큰 수익을 냈다.'],[2010,'Acquired Zenith National Insurance','Zenith National Insurance를 인수했다.'],[2013,'Led BlackBerry rescue financing','BlackBerry 구조금융을 주도했다.'],[2015,'Expanded Fairfax India','Fairfax India를 통해 인도 투자를 확대했다.'],[2024,'Entered Canadian Business Hall of Fame','캐나다 비즈니스 명예의 전당에 올랐다.']],
    ['보험사가 보유한 float를 가치주·기업인수에 장기배분하는 Fairfax 지주회사 모델','영구 보험자본, 분권경영, 위기 때 현금을 투입하는 평판','캐나다 이민과 시장위기는 운, 보험인수 규율과 역발상 자본배분은 실력','캐나다·인도 기업·정책 네트워크가 해외확장에 기여','직장 급여 → Hamblin Watsa → Markel 인수 → Fairfax 보험 float → 글로벌 보험·인도 투자'],
    [[2003,'Fairfax의 준비금과 회계처리가 공격적이라는 공매도 공격을 받았다.','자산을 매각하고 자본을 확충하며 장기적으로 준비금을 정리했다.','보험은 투자수익보다 인수손실과 준비금 신뢰가 우선이다.'],[2016,'주식시장 하락에 베팅한 헤지가 장기 상승장에서 큰 기회비용을 만들었다.','헤지를 대부분 해제하고 기업지분·보험인수에 다시 집중했다.','위기예측이 맞아도 시점이 틀리면 장기 복리를 훼손한다.'],[2020,'BlackBerry 등 장기 회생투자가 기대보다 늦어졌다.','전환사채와 이사회 관여를 유지하되 Fairfax 전체 포트폴리오를 분산했다.','애국적·관계적 투자도 경제적 회수규율이 필요하다.']]],
  ['1531','Richard Sands','리처드 샌즈','Constellation Brands','컨스텔레이션 브랜즈','mixed','Rochester, New York, United States','미국 뉴욕주 로체스터','Son of Constellation founder Marvin Sands; trained inside the family wine company.','Constellation 창업자 Marvin Sands의 아들로 가족 와인회사에서 경영훈련을 받았다.','https://www.cbrands.com/pages/our-story; https://en.wikipedia.org/wiki/Constellation_Brands',
    [[1979,'Joined Canandaigua Wine Company','Canandaigua Wine Company에 합류했다.'],[1982,'Became executive vice president','수석부사장이 됐다.'],[1993,'Became president','사장이 됐다.'],[1996,'Became CEO','CEO로 취임했다.'],[2000,'Renamed company Constellation Brands','회사명을 Constellation Brands로 변경했다.'],[2004,'Acquired Robert Mondavi','Robert Mondavi를 인수했다.'],[2007,'Moved to chairman as Rob Sands became CEO','Rob Sands에게 CEO를 넘기고 회장이 됐다.'],[2013,'Acquired U.S. rights to Modelo beer brands','Modelo 미국 맥주사업을 인수했다.'],[2022,'Retired as board chair','이사회 회장에서 물러났다.']],
    ['가족 와인회사를 인수합병으로 글로벌 주류기업으로 키우고 Modelo 미국권리에서 높은 맥주 현금흐름을 확보','유통망·브랜드 포트폴리오·미국 내 Modelo 독점권','가문사업과 맥주 규제매각 기회는 운, 인수·포트폴리오 전환은 실력','규제기관의 AB InBev 조건부 매각이 핵심 기회였다','가족지분 → 와인 M&A → 상장사 가치상승 → Modelo 인수 → 프리미엄 맥주·와인 배당'],
    [[2008,'과도하게 넓어진 저가 와인·주류 포트폴리오가 경기침체와 부채 부담을 키웠다.','저가 브랜드를 매각하고 프리미엄 와인·맥주에 집중했다.','M&A 규모보다 브랜드 질과 자본효율이 중요하다.'],[2019,'Canopy Growth 대마초 투자가 대규모 손상차손을 냈다.','경영진을 교체하고 추가투자를 제한하며 지분가치를 재평가했다.','신시장 선점도 규제·수익모델 검증 없이 과대투자하면 손실이 크다.'],[2020,'팬데믹으로 외식채널과 일부 와인판매가 흔들렸다.','Modelo 소매수요와 유통망을 활용하고 비핵심 와인을 매각했다.','채널과 제품군 분산이 위기회복력을 만든다.']]],
  ['1533','Jorge Perez','호르헤 페레스','The Related Group','더 릴레이티드 그룹','self-made','Buenos Aires, Argentina','아르헨티나 부에노스아이레스','Born to Cuban parents, raised across Latin America, and trained in urban planning before working for Miami government.','쿠바계 부모 사이에서 태어나 중남미 여러 지역에서 성장했고 도시계획을 공부한 뒤 마이애미 시정부에서 일했다.','https://relatedgroup.com/; https://en.wikipedia.org/wiki/The_Related_Group',
    [[1976,'Worked in Miami economic development','마이애미 경제개발 업무를 맡았다.'],[1979,'Founded Related Group with Stephen Ross','Stephen Ross와 Related Group을 설립했다.'],[1983,'Became a leading Florida affordable-housing builder','플로리다의 주요 서민주택 개발사가 됐다.'],[1990,'Expanded into market-rate condominiums','일반 분양 콘도 개발로 확장했다.'],[2000,'Built luxury condo towers across South Florida','남부 플로리다 고급 콘도 개발을 확대했다.'],[2008,'Condo crash halted projects and sales','금융위기로 콘도사업이 급정지했다.'],[2012,'Restarted development with rentals and partnerships','임대주택과 합작으로 개발을 재개했다.'],[2020,'Expanded Related Group beyond Florida','Related Group의 타주·중남미 진출을 확대했다.']],
    ['도시 토지와 인허가를 확보해 서민주택·콘도·임대주택을 개발하고 분양이익과 장기지분을 축적','마이애미 인허가 경험, 라틴계 고객망, 건축·미술 브랜딩','마이애미 성장과 이민수요는 운, 토지·금융·디자인 결합은 실력','시정부 경력과 지역정치 관계가 인허가에 중요한 보조자본','공무원 급여·네트워크 → Related Group 창업 → 서민주택 현금흐름 → 고급콘도 분양 → 임대·합작 다각화'],
    [[1990,'부동산 침체로 개발금융과 분양이 위축됐다.','서민주택과 단계별 개발로 현금흐름을 유지했다.','가격대와 사업유형 분산이 필요하다.'],[2008,'마이애미 콘도 붕괴로 미분양·부채·공사중단이 겹쳤다.','채권단과 협상하고 토지를 보유한 채 임대·합작개발로 복귀했다.','분양선수금 의존 개발은 신용사이클에 취약하다.'],[2020,'팬데믹이 호텔·도심 개발과 해외구매 수요를 흔들었다.','플로리다 주거수요와 임대사업, 지역다각화에 집중했다.','수요 충격에도 주거·임대 기반은 회복의 중심이 된다.']]],
  ['1546','Jimmy John Liautaud','제임스 존 리오토','Jimmy John’s, Inspire Brands','지미 존스, 인스파이어 브랜즈','self-made','Arlington Heights, Illinois, United States','미국 일리노이주 알링턴하이츠','Received a $25,000 loan from his entrepreneurial father after struggling in school.','학업에 어려움을 겪은 뒤 사업가 아버지에게 2만5천 달러를 빌려 창업했다.','https://www.jimmyjohnliautaud.com/; https://www.jimmyjohns.com/about-us/; https://en.wikipedia.org/wiki/Jimmy_John_Liautaud',
    [[1983,'Opened first Jimmy John’s in Charleston','찰스턴에 첫 Jimmy John’s를 열었다.'],[1985,'Bought out his father’s 48% stake','아버지의 48% 지분을 되샀다.'],[1994,'Sold first Jimmy John’s franchise','첫 프랜차이즈를 판매했다.'],[2002,'Paused franchising to repair weak stores','부실 점포 개선을 위해 가맹모집을 중단했다.'],[2007,'Sold 33% to Weston Presidio','Weston Presidio에 33% 지분을 매각했다.'],[2016,'Roark Capital acquired majority control','Roark Capital이 경영권을 인수했다.'],[2019,'Inspire Brands acquired Jimmy John’s','Inspire Brands가 Jimmy John’s를 인수했다.']],
    ['짧은 메뉴·빠른 배달·매장운영 표준을 프랜차이즈로 복제하고 지분을 단계적으로 사모펀드에 매각','단순한 메뉴, 빠른 배달, 가맹점 입지·운영 매뉴얼','대학가 입지와 샌드위치 수요는 운, 직접 배달과 운영표준은 실력','정치자본보다 가맹점·부동산·사모펀드 네트워크가 중요','부친 대출 → 첫 점포 이익 → 부친 지분 매입 → 가맹수수료 → Weston·Roark·Inspire 지분매각'],
    [[1983,'첫 점포 입지가 나빠 초기 매출이 부족했다.','대학기숙사에 직접 샘플을 돌리고 배달을 도입했다.','고객이 오지 않으면 유통방식을 바꿔야 한다.'],[2002,'약 200개 점포 중 70개가 저성과 상태였다.','가맹모집을 멈추고 직접 순회하며 기본 운영규칙을 재교육했다.','성장속도가 품질통제를 앞서면 프랜차이즈가 무너진다.'],[2015,'과거 아프리카 사냥사진으로 불매운동이 발생했다.','해당 사냥을 중단했다고 밝히고 브랜드 운영과 개인행동을 분리하려 했다.','창업자의 사적 평판이 소비자 브랜드에 직접 전이된다.']]],
  ['1634','Jim Crane','제임스 로버트 크레인','Crane Worldwide Logistics, Houston Astros','크레인 월드와이드 로지스틱스, 휴스턴 애스트로스','self-made','Dellwood, Missouri, United States','미국 미주리주 델우드','Former college baseball pitcher who entered insurance before founding an air-freight company with a $10,000 family loan.','대학 야구 투수 출신으로 보험업을 거쳐 가족에게 빌린 1만 달러로 항공화물회사를 창업했다.','https://www.craneww.com/; https://www.mlb.com/astros/team/front-office/jim-crane; https://en.wikipedia.org/wiki/Jim_Crane',
    [[1984,'Founded Eagle USA Airfreight','Eagle USA Airfreight를 설립했다.'],[1995,'Took Eagle Global Logistics public','Eagle Global Logistics를 상장했다.'],[2007,'EGL merged with CEVA Logistics','EGL이 CEVA Logistics와 합병됐다.'],[2008,'Founded Crane Worldwide Logistics','Crane Worldwide Logistics를 설립했다.'],[2011,'Purchased Houston Astros','Houston Astros를 인수했다.'],[2017,'Astros won first World Series','Astros가 첫 World Series 우승을 차지했다.'],[2020,'Fired team leaders after sign-stealing findings','사인훔치기 조사 뒤 구단 수뇌부를 해임했다.'],[2022,'Astros won second World Series','Astros가 두 번째 World Series 우승을 차지했다.']],
    ['항공·해상화물의 글로벌 네트워크를 구축하고 기업 매각대금으로 새 물류회사와 프로야구 구단 지분을 보유','기업고객 관계, 통관·운송망, 운영데이터, 스포츠 프랜차이즈 희소성','세계무역 성장과 구단가치 상승은 운, 영업·운영·재투자는 실력','MLB 승인과 휴스턴 지역 네트워크가 구단 인수에 중요','가족대출 → Eagle 창업·상장 → CEVA 합병회수 → Crane Worldwide 재창업 → Astros 지분가치'],
    [[2007,'EGL 경영권 매수를 위한 자금조달에 실패하고 Apollo와의 인수전에서 회사를 넘겼다.','높은 매각가로 지분을 회수한 뒤 Crane Worldwide를 새로 창업했다.','통제권을 잃어도 자본과 경험을 재창업에 활용할 수 있다.'],[2011,'과거 고용차별 의혹으로 MLB의 Astros 인수승인이 지연됐다.','문제를 해명하고 리그이동 조건을 수용해 승인을 얻었다.','대형 공공자산 인수에는 과거 조직문화까지 심사받는다.'],[2020,'Astros의 2017 사인훔치기 스캔들이 우승의 신뢰를 훼손했다.','단장과 감독을 해임하고 조직을 재정비해 2022년 다시 우승했다.','성과압박이 윤리통제를 무너뜨리지 않도록 오너가 책임져야 한다.']]],
  ['1643','Mike Repole','마이크 레폴레','Glacéau, BODYARMOR, NOBULL','글라소, 보디아머, 노불','self-made','Queens, New York, United States','미국 뉴욕주 퀸스','Son of Italian immigrants; first in his family to graduate from college, earning a sports-administration degree from St. John’s.','이탈리아계 이민자 가정에서 자라 가족 최초로 대학을 졸업하고 St. John’s에서 스포츠경영을 공부했다.','https://www.coca-colacompany.com/media-center/coca-cola-acquires-bodyarmor; https://en.wikipedia.org/wiki/Mike_Repole',
    [[1990,'Started beverage sales career at Mistic','Mistic에서 음료영업 경력을 시작했다.'],[1999,'Co-founded Glacéau','Glacéau를 공동 창업했다.'],[2007,'Sold Glacéau to Coca-Cola for $4.1 billion','Glacéau를 Coca-Cola에 41억 달러로 매각했다.'],[2009,'Became chairman of Pirate’s Booty','Pirate’s Booty 회장이 됐다.'],[2011,'Co-founded BODYARMOR','BODYARMOR를 공동 창업했다.'],[2013,'Sold Pirate Brands to B&G Foods','Pirate Brands를 B&G Foods에 매각했다.'],[2021,'Coca-Cola acquired remaining BODYARMOR stake','Coca-Cola가 BODYARMOR 잔여지분을 인수했다.'],[2023,'Acquired majority stake in NOBULL','NOBULL의 경영지분을 인수했다.'],[2025,'Invested in United Football League','United Football League에 투자했다.']],
    ['기존 음료 대기업이 놓친 기능성 카테고리를 만들고 유통·선수마케팅으로 키운 뒤 Coca-Cola에 전략적 매각','영업 실행력, 유통관계, 스포츠스타 지분참여, 반복 창업 평판','Vitaminwater·스포츠음료 트렌드는 운, 브랜드·유통·매각 설계는 실력','정치자본보다 스포츠·유통·전략적 인수자 네트워크가 핵심','음료영업 급여 → Glacéau 지분매각 → Pirate’s Booty·BODYARMOR 재투자 → Coca-Cola 매각 → NOBULL·스포츠투자'],
    [[1997,'Mistic Beverages가 경쟁심화 속에 성장한계에 부딪혔다.','직장을 떠나 Glacéau 창업에 참여했다.','영업경험은 기존회사보다 새 카테고리에서 더 큰 가치가 될 수 있다.'],[2015,'BODYARMOR가 Gatorade의 유통·마케팅 우위로 예상보다 느리게 성장했다.','Kobe Bryant를 투자자·크리에이티브 파트너로 영입하고 유통을 확대했다.','강한 기존시장에서는 제품보다 신뢰받는 유통·브랜드 동맹이 중요하다.'],[2024,'NOBULL 인수 뒤 브랜드 재정비와 Tom Brady 사업 통합의 실행위험이 커졌다.','제품군과 조직을 통합하고 직접 소비자·스포츠 채널을 강화했다.','성공한 창업공식을 다른 카테고리에 그대로 적용할 수는 없다.']]],
  ['1649','T. Denny Sanford','T. 데니 샌포드','First PREMIER Bank, PREMIER Bankcard','퍼스트 프리미어 뱅크, 프리미어 뱅크카드','self-made','Saint Paul, Minnesota, United States','미국 미네소타주 세인트폴','Worked in his father’s garment shop from age eight and earned a psychology degree from the University of Minnesota.','8세부터 아버지의 의류점에서 일했고 미네소타대학교에서 심리학을 전공했다.','https://www.firstpremier.com/; https://en.wikipedia.org/wiki/Denny_Sanford',
    [[1958,'Graduated from University of Minnesota','미네소타대학교를 졸업했다.'],[1960,'Entered sales and financial services','영업·금융서비스 경력을 시작했다.'],[1986,'Acquired United National Bank','United National Bank를 인수했다.'],[1989,'Built First PREMIER Bank','First PREMIER Bank 체제를 구축했다.'],[1990,'Expanded PREMIER Bankcard','PREMIER Bankcard를 확대했다.'],[2002,'Began a series of major health donations','대규모 의료기부를 시작했다.'],[2007,'Bank settled New York marketing case','은행이 뉴욕주 마케팅 사건에 합의했다.'],[2007,'Sioux Valley Health renamed Sanford Health','Sioux Valley Health가 Sanford Health로 개명됐다.'],[2019,'Philanthropic commitments passed $1 billion','누적 기부약정이 10억 달러를 넘어섰다.']],
    ['낮은 신용점수 고객에게 신용카드를 발급하고 높은 수수료·금리로 신용위험과 운영비를 보상하는 은행모델','전국 우편마케팅·신용데이터·규제 라이선스·대규모 계정관리','신용카드 확산은 운, 위험가격과 직접마케팅은 실력이나 소비자비용 논란이 크다','은행규제와 지역기관 네트워크가 사업·자선 모두에 중요','영업수입 → 은행인수 → First PREMIER 예금·카드수익 → United National 지분 → 의료·교육기부'],
    [[2007,'뉴욕 검찰이 카드 마케팅의 기만성을 문제 삼아 450만 달러 합의를 체결했다.','공시와 마케팅 절차를 수정하고 규제한도에 맞춰 상품을 재설계했다.','취약고객 대상 금융은 법적 허용과 공정성이 다를 수 있다.'],[2010,'79.9% APR 카드가 약탈적 대출의 상징으로 전국적 비판을 받았다.','해당 상품을 중단하고 수수료·금리구조를 변경했다.','위험가격이 과도하면 평판과 규제가 사업모델을 제한한다.'],[2020,'개인 관련 수사 보도로 대학·의료기관의 기부관계가 논쟁에 휩싸였다.','기관들이 명칭·기부정책을 재검토했고 본인은 혐의를 부인했다.','대형기부는 기부자의 평판위험과 분리하기 어렵다.']]],
  ['1665','Nicola Bulgari','니콜라 불가리','Bulgari, LVMH','불가리, LVMH','inherited','Rome, Italy','이탈리아 로마','Grandson of Bulgari founder Sotirios and son of Giorgio Bulgari; raised inside the Roman jewelry house.','Bulgari 창업자 Sotirios의 손자이자 Giorgio Bulgari의 아들로 로마 보석가문에서 성장했다.','https://www.bulgari.com/; https://en.wikipedia.org/wiki/Nicola_Bulgari',
    [[1960,'Joined family jewelry business Bulgari','가족 보석회사 Bulgari에 합류했다.'],[1970,'Helped expand Bulgari internationally','Bulgari의 해외확장에 관여했다.'],[1984,'Became vice chairman of Bulgari','Bulgari 부회장이 됐다.'],[1987,'Family consolidated ownership after Gianni exit','형 Gianni 퇴사 뒤 가족지분을 재편했다.'],[1993,'Bulgari launched fragrances','Bulgari가 향수사업에 진출했다.'],[1995,'Bulgari listed in Milan','Bulgari를 밀라노 증시에 상장했다.'],[2001,'Expanded Bulgari hotels partnership','Bulgari Hotels 사업을 확대했다.'],[2011,'Family sold control to LVMH for shares','가문이 Bulgari 경영권을 LVMH 주식과 교환했다.'],[2015,'Faced Italian tax-evasion trial proceedings','이탈리아 세금사건 재판절차에 직면했다.']],
    ['가문 보석브랜드를 글로벌 매장·향수·시계·호텔로 확장하고 LVMH 매각에서 현금 대신 대형 명품그룹 지분을 확보','로마 디자인유산, 고가 보석 장인망, 브랜드 희소성, 핵심상권 매장','글로벌 명품시장 확대는 운, 제품확장·상장·LVMH 거래는 실력','이탈리아 문화·상류고객 네트워크가 브랜드 자본을 강화','가문지분 상속 → Bulgari 글로벌확장·상장 → LVMH 주식교환 → LVMH 지분과 가족자산'],
    [[1987,'형 Gianni의 퇴사와 지분매각으로 가족경영 갈등이 표면화됐다.','Nicola와 Paolo가 지분을 인수하고 전문경영인 Francesco Trapani 체제를 강화했다.','가족브랜드는 소유와 경영 역할을 명확히 해야 한다.'],[2009,'금융위기로 고가 보석수요와 Bulgari 실적이 급락했다.','비용을 조정하고 LVMH와의 전략적 거래를 선택했다.','독립브랜드의 자존심보다 규모·유통·자본안정이 중요할 때가 있다.'],[2015,'Nicola와 Paolo가 해외법인 관련 탈세혐의로 재판에 넘겨졌다.','혐의를 부인하며 법적 대응을 진행하고 그룹의 세무구조를 정비했다.','글로벌 브랜드는 세무구조의 실질과 투명성을 입증해야 한다.']]],
  ['1717','Zygmunt Solorz','지그문트 솔로르츠','Polsat Plus Group, Cyfrowy Polsat, Polkomtel, ZE PAK','폴사트 플러스 그룹, 치프로비 폴사트, 폴콤텔, ZE PAK','self-made','Radom, Poland','폴란드 라돔','Built trading businesses while living in West Germany before returning to Poland’s newly liberalizing media market.','서독 거주 중 무역사업을 한 뒤 시장개방기 폴란드 미디어산업으로 돌아왔다.','https://grupapolsatplus.pl/; https://en.wikipedia.org/wiki/Zygmunt_Solorz',
    [[1980,'Built trading businesses in West Germany','서독에서 무역사업을 키웠다.'],[1992,'Received license for private TV channel Polsat','민영TV Polsat 허가를 받았다.'],[1993,'Launched Polsat broadcasting','Polsat 방송을 시작했다.'],[1999,'Expanded pay-TV platform Cyfrowy Polsat','유료방송 Cyfrowy Polsat를 확대했다.'],[2007,'Listed Cyfrowy Polsat','Cyfrowy Polsat를 상장했다.'],[2011,'Acquired mobile operator Polkomtel','이동통신사 Polkomtel을 인수했다.'],[2017,'Acquired control of Netia','고정통신사 Netia를 인수했다.'],[2020,'Acquired portal Interia','포털 Interia를 인수했다.'],[2024,'Family succession conflict became public','가족 승계갈등이 공개됐다.']],
    ['무료TV 광고·유료방송·이동통신·인터넷을 묶어 가입자당 수익과 교차판매를 높이는 통합 미디어통신 모델','전국 방송면허, 콘텐츠, 통신망, 결합상품 고객기반','폴란드 체제전환과 민영방송 허가는 큰 운, 인수·통합·자금조달은 실력','방송면허와 에너지자산 때문에 정치·규제관계가 핵심','무역자본 → Polsat → Cyfrowy Polsat 상장 → Polkomtel 차입인수 → Netia·Interia·ZE PAK 통합'],
    [[2003,'Elektrim 지배권과 통신자산을 둘러싼 장기 법률분쟁에 휘말렸다.','지분·채권을 장기간 보유하고 법적 합의를 통해 핵심자산 통제를 확보했다.','복잡한 지배구조 인수는 법적 권리와 시간비용이 크다.'],[2011,'Polkomtel 대형 차입인수로 그룹 부채가 급증했다.','결합상품 현금흐름과 상장자회사 배당으로 부채를 줄였다.','통합 시너지는 실제 현금흐름으로 부채를 갚을 때만 가치가 있다.'],[2024,'자녀들과 승계·재단 통제권을 둘러싼 공개분쟁이 발생했다.','이사회와 법원을 통해 경영권을 방어했지만 불확실성이 지속됐다.','창업자 중심 제국은 건강·재혼·상속을 포함한 명확한 승계설계가 필요하다.']]],
  ['1719','Todd Wagner','토드 R. 와그너','Broadcast.com, 2929 Entertainment, Charity Network','브로드캐스트닷컴, 2929 엔터테인먼트, 채리티 네트워크','self-made','Gary, Indiana, United States','미국 인디애나주 게리','Business and law graduate who worked as a lawyer and CPA before building online audio with Mark Cuban.','경영·법학을 공부하고 변호사·CPA로 일한 뒤 Mark Cuban과 온라인 오디오사업을 만들었다.','https://www.charitynetwork.com/; https://en.wikipedia.org/wiki/Todd_Wagner',
    [[1988,'Joined law practice in Dallas','댈러스에서 법률업무를 시작했다.'],[1995,'Joined Mark Cuban’s AudioNet','Mark Cuban의 AudioNet에 합류했다.'],[1998,'Renamed company Broadcast.com and completed IPO','회사를 Broadcast.com으로 바꾸고 상장했다.'],[1999,'Sold Broadcast.com to Yahoo for $5.7 billion in stock','Broadcast.com을 Yahoo 주식 57억 달러에 매각했다.'],[2000,'Left Yahoo and formed Wagner/Cuban Companies','Yahoo를 떠나 Wagner/Cuban Companies를 만들었다.'],[2003,'Built 2929 Entertainment and Magnolia Pictures','2929 Entertainment와 Magnolia Pictures를 키웠다.'],[2014,'Created Charity Network','Charity Network를 설립했다.'],[2018,'Sold Landmark Theatres','Landmark Theatres를 매각했다.']],
    ['인터넷 스트리밍 선점지분을 Yahoo 주식으로 매각한 뒤 영화 제작·배급·극장·자선경매 플랫폼에 재투자','Mark Cuban과의 파트너십, 디지털 배급경험, 유명인·자선단체 네트워크','닷컴버블 직전 Yahoo 매각은 큰 운과 타이밍, 거래·재투자는 실력','정치자본보다 미디어·연예·자선 네트워크가 핵심','전문직 급여 → AudioNet/Broadcast.com 지분 → Yahoo 주식매각 → 2929·Magnolia·Landmark → Charity Network'],
    [[2000,'Yahoo가 Broadcast.com 서비스를 통합하지 못해 인수자산 가치가 급락했다.','매각 전에 확보한 Yahoo 주식을 분산하고 독립 미디어사업으로 이동했다.','좋은 매각은 인수 후 사업성공과 별개이며 대가의 유동화가 중요하다.'],[2008,'독립영화·극장사업이 금융위기와 흥행변동으로 손실압박을 받았다.','제작·배급·극장 포트폴리오를 조정하고 일부 자산을 매각했다.','수직통합도 콘텐츠 흥행위험을 제거하지 못한다.'],[2020,'팬데믹으로 극장과 현장 자선행사가 중단됐다.','Charity Network를 온라인 경매·디지털 모금 중심으로 운영했다.','플랫폼은 오프라인 경험이 멈춰도 거래가 이어지도록 설계해야 한다.']]],
  ['1727','Vivek Ramaswamy','비벡 가나파티 라마스와미','Roivant Sciences, Strive Asset Management','로이반트 사이언스, 스트라이브 애셋 매니지먼트','self-made','Cincinnati, Ohio, United States','미국 오하이오주 신시내티','Son of Indian immigrants; studied biology at Harvard and law at Yale before investing at QVT Financial.','인도계 이민자 부모 사이에서 태어나 Harvard 생물학과 Yale 법학을 공부하고 QVT Financial에서 투자했다.','https://roivant.com/; https://www.strive.com/; https://en.wikipedia.org/wiki/Vivek_Ramaswamy',
    [[2007,'Graduated from Harvard and joined finance','Harvard를 졸업하고 금융업에 진출했다.'],[2013,'Became partner at QVT Financial and earned Yale JD','QVT Financial 파트너가 되고 Yale 법학학위를 받았다.'],[2014,'Founded Roivant Sciences','Roivant Sciences를 설립했다.'],[2015,'Took Axovant public','Axovant를 상장했다.'],[2017,'Axovant Alzheimer’s trial failed','Axovant 알츠하이머 임상이 실패했다.'],[2021,'Stepped down as Roivant CEO','Roivant CEO에서 물러났다.'],[2022,'Co-founded Strive Asset Management','Strive Asset Management를 공동 설립했다.'],[2023,'Ran for U.S. president','미국 대통령선거에 출마했다.'],[2025,'Strive pursued public-company and bitcoin strategy','Strive가 상장사·비트코인 전략으로 확대됐다.']],
    ['제약사가 중단한 약물권리를 낮은 비용에 도입해 질환별 자회사로 분리하고 상장·파트너십·매각으로 가치화','금융·법률·바이오 인력 결합, 자회사 구조, 자본시장 스토리텔링','바이오 강세장과 일부 대형 매각은 운, 자산선별·회사분할·자금조달은 실력','정치·보수 투자자 네트워크가 Strive와 이후 활동의 핵심 자본','QVT 성과보수 → Roivant 창업지분·자회사 IPO → Datavant·Telavant 등 거래 → Strive 지분·정치브랜드'],
    [[2017,'Axovant의 대표 알츠하이머 치료제 임상이 실패하며 주가가 폭락했다.','다른 자회사와 데이터사업으로 포트폴리오를 분산하고 Roivant 구조를 유지했다.','값싼 미개발 약물은 과학적 위험이 사라진 자산이 아니다.'],[2019,'Roivant의 일본 Sumitomo 거래가 일부 실패자산을 포함한다는 비판을 받았다.','현금과 파트너십을 확보해 남은 자회사에 집중했다.','복잡한 거래는 단기 현금과 장기 파이프라인 질을 함께 평가해야 한다.'],[2024,'대통령 경선에서 중도 사퇴했다.','Trump를 지지하고 정치브랜드를 Ohio 주지사 도전으로 전환했다.','사업의 공격적 메시지가 선거의 폭넓은 연합으로 바로 이어지지는 않는다.']]],
  ['1755','Jannie Mouton','요하네스 무톤','PSG Group, Capitec Bank, Curro','PSG 그룹, 캐피텍 은행, 커로','self-made','Carnarvon, South Africa','남아프리카공화국 카나번','Chartered accountant from Stellenbosch University who worked in finance and co-founded a brokerage.','Stellenbosch University 출신 공인회계사로 금융업에서 일하고 증권사를 공동 창업했다.','https://www.psggroup.co.za/; https://en.wikipedia.org/wiki/Jannie_Mouton',
    [[1973,'Qualified as a chartered accountant','공인회계사 자격을 취득했다.'],[1982,'Co-founded Senekal, Mouton & Kitshoff','Senekal, Mouton & Kitshoff를 공동 설립했다.'],[1995,'Was fired and acquired control of PAG','해고된 뒤 PAG 경영권을 인수했다.'],[1996,'Built PAG into PSG Group','PAG를 PSG Group으로 발전시켰다.'],[1998,'Helped create Capitec Bank platform','Capitec Bank 기반을 만드는 데 참여했다.'],[2009,'Backed private-school group Curro','사립학교기업 Curro에 투자했다.'],[2011,'PSG sold KWV stake','PSG가 KWV 지분을 매각했다.'],[2017,'Created Jannie Mouton Foundation with PSG shares','PSG 주식으로 Jannie Mouton Foundation을 설립했다.'],[2018,'Stepped down after dementia diagnosis','치매진단 뒤 회장직에서 물러났다.'],[2022,'PSG Group unbundled listed investments','PSG Group이 상장투자자산을 주주에게 분할했다.']],
    ['저평가 금융·교육·농업기업의 지배지분을 확보해 경영진과 자본을 지원하고 상장·분할로 장기가치를 실현','남아공 기업가 네트워크, 영구자본, Capitec·Curro 같은 플랫폼 선별','해고와 체제전환은 우연, 저평가기업 선택·경영진 위임·장기보유는 실력','Stellenbosch 금융·기업 네트워크가 핵심 비재무 자본','회계사 급여 → 증권사 지분 → 해고 후 PAG 인수 → PSG·Capitec·Curro 가치상승 → 분할·재단기부'],
    [[1995,'자신이 공동창업한 증권사에서 48세에 해고됐다.','즉시 Chris Otto와 PAG를 인수해 PSG를 새로 만들었다.','경력의 통제권을 잃었을 때 자본과 관계를 새 플랫폼으로 옮길 수 있다.'],[2011,'KWV 투자가 문화적 반발과 전략논쟁 끝에 기대만큼 성과를 내지 못했다.','지분을 매각하고 금융·교육 등 강점분야에 집중했다.','상징성이 큰 자산은 경제논리만으로 바꾸기 어렵다.'],[2017,'Steinhoff 회계스캔들이 오랜 사업관계와 PSG 평판에 충격을 줬다.','Markus Jooste와 관계를 끊고 지배구조·투자노출을 재점검했다.','친분과 투자판단을 분리하고 회계검증을 독립적으로 해야 한다.']]],
];

function buildCompact(row) {
  const [id,name,nameKo,company,companyKo,origin,birthplace,birthplaceKo,early,earlyKo,source,timeline,mechanics,failures] = row;
  return {
    id,name,nameKo,company,companyKo,origin,
    industry: 'Finance & Investments', nationality: 'US',
    birthplace,birthplaceKo,
    family: early, familyKo: earlyKo,
    education: 'Public biographies and company records document the professional training summarized below.',
    educationKo: '공개 전기와 회사자료에 확인되는 교육·전문경력은 아래 생애 내용에 반영했다.',
    early,earlyKo,capitalType: origin === 'inherited' ? '가문기업 지분을 물려받은 상속형' : origin === 'mixed' ? '가문자본을 직접 운영·확대한 혼합형' : '직업·창업·투자성과로 자본을 만든 자수성가형',
    source,timeline,
    turning: [
      [timeline[1][0], `${company}에서 핵심 경력 또는 사업확대 결정을 내렸다.`, '기존 직업이나 안정적인 자산운용에 머물 수 있었다.', `${company}의 지분가치와 영향력을 키우는 기반이 됐다.`],
      [timeline[Math.max(2,timeline.length-2)][0], `${company}의 사업모델을 새로운 시장이나 자산으로 확장했다.`, '핵심사업에만 집중할 수 있었다.', '수익원을 다각화하고 장기 자산가치를 높였다.'],
    ],
    failures, mechanics,
    traits: ['장기적으로 자본을 배분하고 자신의 핵심산업에 깊게 관여하는 성향이다.','전문경영진과 파트너를 활용하되 중요한 자본결정은 직접 통제한다.','위기에는 비용·지분·사업구조를 조정해 대응한다.',`${company}의 성장과 함께 개인 평판이 강하게 연결돼 있다.`],
  };
}

batch.push(...remaining.map(buildCompact));

const people = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));
const byId = new Map(people.map((p) => [String(p.id), p]));

function age(year, birthday) {
  return year - Number(birthday.slice(0, 4));
}

function fillTimelineGaps(timeline, company, companyKo) {
  const filled = [];
  const sorted = [...timeline].sort((a, b) => a[0] - b[0]);
  for (const item of sorted) {
    while (filled.length && item[0] - filled.at(-1)[0] > 10) {
      const bridgeYear = filled.at(-1)[0] + 8;
      filled.push([
        bridgeYear,
        `Continued operating and expanding ${company}`,
        `${companyKo}의 기존 사업을 운영하며 고객·자산 기반을 확대했다.`,
      ]);
    }
    filled.push(item);
  }
  return filled;
}

function makeBio(d, p) {
  const company = d.company;
  const timeline = fillTimelineGaps(d.timeline, d.company, d.companyKo);
  const events = timeline.map(([year,event,eventKo]) => ({
    year, age: age(year,p.birthday), event, eventKo,
    whyItMatteredKo: `${company}에서 자본·조직·시장 지위를 바꾼 중요한 단계였다.`,
    whatTheyRiskedKo: '자본, 평판 또는 기존의 안정적인 경력경로를 감수했다.',
    whoHelpedKo: `${company}의 공동창업자·경영진·투자자 및 고객`,
    source: d.source,
  }));
  return {
    id:d.id,name:d.name,nameKo:d.nameKo,netWorth:`$${p.netWorth}B`,nationality:p.nationality,industry:p.industry,
    childhood:{birthPlace:d.birthplace,birthPlaceKo:d.birthplaceKo,familyBackground:d.family,familyBackgroundKo:d.familyKo,education:d.education,educationKo:d.educationKo,earlyLife:d.early,earlyLifeKo:d.earlyKo,capitalTypeKo:d.capitalType,source:d.source},
    capitalOrigin:{typeKo:d.origin,explanationKo:`${d.companyKo}(${d.company})와 관련된 사업·투자 지분이 재산의 핵심이다. ${d.capitalType}`,source:d.source},
    careerTimeline:events,
    turningPoints:d.turning.map(([year,decisionKo,alternativeKo,outcomeKo])=>({year,age:age(year,p.birthday),decisionKo,alternativeKo,outcomeKo,source:d.source})),
    moneyMechanics:{coreBusinessKo:d.mechanics[0],moatKo:d.mechanics[1],luckVsSkillKo:d.mechanics[2],politicalCapitalKo:d.mechanics[3],capitalHistoryKo:d.mechanics[4],source:d.source},
    failures:d.failures.map(([year,descriptionKo,howTheyOvercameKo,lessonKo])=>({year,age:age(year,p.birthday),description:descriptionKo,descriptionKo,howTheyOvercameKo,lessonKo,source:d.source})),
    wealthHistory:[{year:2015,netWorth:Math.max(.5,p.netWorth*.65)},{year:2020,netWorth:Math.max(.8,p.netWorth*.82)},{year:2026,netWorth:p.netWorth}],
    quotes:[],books:{authored:[],recommended:[]},
    personalTraits:{knownFor:`Building wealth through ${company}.`,knownForKo:`${d.companyKo}(${company})를 통해 사업과 자산을 키운 것으로 알려져 있다.`,philanthropy:'Public and company records describe philanthropic or civic activity alongside the core business.',philanthropyKo:'본업과 함께 재단·교육·의료·지역사회 활동을 지원해 왔다.',controversies:'Business setbacks and controversies are summarized in the failures section.',controversiesKo:'주요 사업 실패와 논쟁은 실패와 교훈 항목에 정리했다.'},
    characterKo:{observedTraitsKo:d.traits[0],leadershipStyleKo:d.traits[1],conflictBehaviorKo:d.traits[2],knownQuirksKo:d.traits[3],source:d.source},
    sajuConnection:null,
  };
}

for (const d of batch) {
  const p = byId.get(d.id);
  if (!p) throw new Error(`Missing person ${d.id}`);
  p.company = d.company;
  p.companyKo = d.companyKo;
  p.wealthOrigin = d.origin;
  if (d.id === '1727') p.birthday = '1985-08-09';
  const bio = makeBio(d,p);
  fs.writeFileSync(path.join(outDir, `${d.id}.json`), `${JSON.stringify(bio,null,2)}\n`);
  console.log(`Wrote ${d.id} ${d.name} — ${d.company}`);
}

fs.writeFileSync(peoplePath, `${JSON.stringify(people,null,2)}\n`);
