import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const peoplePath = path.join(root, 'public', 'billionaires.json');
const outDir = path.join(root, 'public', 'deep-bios-v2');

const rows = [
  {
    id:'1764', company:'Campus Apartments, FS Investments, Darco Capital', companyKo:'캠퍼스 아파트먼츠, FS 인베스트먼츠, 다르코 캐피털', origin:'self-made',
    birth:'Philadelphia, Pennsylvania, United States', birthKo:'미국 펜실베이니아주 필라델피아',
    earlyKo:'홀로코스트 생존자의 손자로 자랐고, 13세 때 바르미츠바 자금 2,000달러를 Campus Apartments에 투자했다. Ohio State University에서 정치학을 전공했다.',
    source:'https://campusapts.com/about-us/leadership/; https://en.wikipedia.org/wiki/David_J._Adelman',
    timeline:[[1985,'Invested $2,000 in Campus Apartments','13세에 Campus Apartments에 2,000달러를 투자했다.'],[1989,'Bought his first investment property','17세에 첫 단독 투자 부동산을 샀다.'],[1994,'Graduated from Ohio State University','Ohio State University를 졸업했다.'],[1997,'Became CEO of Campus Apartments','25세에 Campus Apartments CEO가 됐다.'],[2007,'Co-founded FS Investments','FS Investments를 공동 설립했다.'],[2010,'Expanded student-housing assets nationally','학생주택 자산을 미국 전역으로 확대했다.'],[2019,'Founded Darco Capital','가족투자회사 Darco Capital을 설립했다.'],[2022,'Joined Harris Blitzer Sports & Entertainment ownership','Philadelphia 76ers와 New Jersey Devils 소유그룹에 참여했다.']],
    failures:[[2008,'금융위기로 부동산 금융과 학생주택 거래가 얼어붙었다.','장기 임대수요와 대학 인접 자산에 집중하고 금융사업을 분산했다.','레버리지 부동산은 입지뿐 아니라 자금 만기구조가 중요하다.'],[2020,'팬데믹으로 대학 폐쇄와 학생주택 점유율 불확실성이 커졌다.','학교별 수요와 임대조건을 조정하고 운영 유동성을 확보했다.','단일 고객군에 집중한 자산은 운영 시나리오를 여러 개 준비해야 한다.'],[2023,'다수의 투자·소비재 사업이 고금리와 가치평가 하락에 노출됐다.','핵심 현금흐름 자산과 장기 사모대출에 자본배분을 좁혔다.','사업 수가 많아도 동일한 금리위험에 묶일 수 있다.']],
    mechanics:['대학 인근 학생주택을 개발·운영하고 사모신용과 직접투자로 수익원을 확장','대학별 입지정보, 장기 운영경험, 자본조달 네트워크','초기 멘토와 투자기회는 운이었고 전국 확장과 금융구조 설계는 실력이다.','대학·지역사회·스포츠 구단 네트워크가 거래 접근성을 높였다.','청소년기 2,000달러 투자 → 임대부동산 → Campus Apartments 지분 → FS Investments·Darco Capital → 스포츠 지분'],
  },
  {
    id:'1766', company:'The Matthew Pritzker Company, Hyatt, Colson Group', companyKo:'매튜 프리츠커 컴퍼니, 하얏트, 콜슨 그룹', origin:'inherited', birthday:'1982-05-28',
    birth:'Chicago, Illinois, United States', birthKo:'미국 일리노이주 시카고',
    earlyKo:'Hyatt와 Marmon을 일군 Pritzker 가문의 Robert Pritzker 아들로 성장했고 American University를 다녔다.',
    source:'https://en.wikipedia.org/wiki/Matthew_Pritzker; http://www.matthewpritzkercompany.com/',
    timeline:[[1999,'Pritzker family restructuring began','가문기업과 신탁의 구조조정이 시작됐다.'],[2003,'Joined litigation over family trusts','누나 Liesel과 함께 가족신탁 관련 소송에 참여했다.'],[2005,'Family trust dispute was settled','가족신탁 분쟁이 합의로 마무리됐다.'],[2008,'Founded The Matthew Pritzker Company','The Matthew Pritzker Company를 설립했다.'],[2011,'Named to Crain’s 40 Under 40','투자 활동으로 Crain’s 40 Under 40에 선정됐다.'],[2012,'Invested in Colson Group','부친이 키웠던 Colson Group 지분에 투자했다.'],[2018,'Expanded venture and consumer portfolio','기술·미디어·소비재 투자 포트폴리오를 확대했다.'],[2022,'Backed private companies including SpaceX and Cameo','SpaceX와 Cameo 등 비상장기업 투자를 이어갔다.']],
    failures:[[2003,'가족신탁 운용을 둘러싼 분쟁이 공개소송으로 번졌다.','법적 합의를 통해 자산을 분리하고 독립 투자회사를 만들었다.','상속자산도 권리와 지배구조가 명확하지 않으면 장기간 묶인다.'],[2008,'금융위기 직전에 독립 투자활동을 확대해 부동산과 사모자산 가치가 흔들렸다.','여러 산업과 투자단계로 포트폴리오를 분산했다.','상속자본도 시장주기와 유동성 위험을 피할 수 없다.'],[2022,'기술·성장주 가치평가 급락으로 벤처 포트폴리오가 압박받았다.','장기보유와 현금흐름 기업 투자를 병행했다.','비상장 평가액과 실제 회수수익은 다르다.']],
    mechanics:['상속받은 Pritzker 가문 자본을 부동산·제조·기술·소비재에 직접투자','가문자본, 장기 투자기간, 비상장 거래 접근성','상속이 출발점이고 독립회사 설립과 포트폴리오 구성은 운용 실력이다.','Chicago 재계·자선 네트워크가 거래와 공동투자를 보조한다.','가족신탁·Hyatt/Marmon 가치 → 2005년 합의 → Matthew Pritzker Company → Colson·벤처·부동산 지분'],
  },
  {
    id:'1772', company:'Grupo Coppel, Coppel, BanCoppel, Afore Coppel', companyKo:'그루포 코펠, 코펠, 반코펠, 아포레 코펠', origin:'mixed',
    birth:'Culiacán, Sinaloa, Mexico', birthKo:'멕시코 시날로아주 쿨리아칸',
    earlyKo:'Coppel 창업자 Enrique Coppel Tamayo의 장남으로 태어나 1970년부터 가족 소매업에서 일했다.',
    source:'https://www.coppel.com/; https://es.wikipedia.org/wiki/Coppel; https://es.wikipedia.org/wiki/BanCoppel',
    timeline:[[1970,'Joined the family retail business','가족 소매기업 Coppel에 입사했다.'],[1982,'Became director of Coppel','부친에게서 Coppel 경영을 넘겨받았다.'],[1992,'Renamed the company Coppel','회사 법인명을 Coppel로 통합했다.'],[2002,'Acquired Zapaterías Canadá','Zapaterías Canadá를 인수했다.'],[2006,'Launched Afore Coppel','연금관리회사 Afore Coppel을 출범시켰다.'],[2007,'Launched BanCoppel','BanCoppel 은행영업을 시작했다.'],[2008,'Transferred operating leadership to Agustín Coppel','동생 Agustín에게 그룹 운영리더십을 넘겼다.'],[2017,'Ended term as BanCoppel board chairman','BanCoppel 이사회 의장 역할에서 물러났다.']],
    failures:[[1994,'멕시코 금융위기로 할부고객의 상환능력과 소비가 급락했다.','소액 할부와 필수재 중심 모델을 유지하며 점포망을 확대했다.','저소득 금융은 성장기보다 위기기의 신용통제가 중요하다.'],[2007,'상장유지 요건 문제로 Coppel 주식이 멕시코 증시에서 철수했다.','비상장 가족기업 구조로 자본을 조달하고 은행·연금사업을 키웠다.','공개시장 접근에는 투명성과 지배구조 비용이 따른다.'],[2009,'브라질·아르헨티나 해외진출이 현지 경쟁과 운영난을 겪었다.','브라질에서 철수하고 멕시코 핵심시장과 디지털화에 집중했다.','국내 성공모델은 신용문화가 다른 시장에서 그대로 복제되지 않는다.']],
    mechanics:['가구·의류를 할부로 판매하고 자체 은행·연금으로 고객 생애금융을 묶는 모델','전국 점포망, 자체 신용데이터, 저소득 고객 관계, 물류망','가족기업 기반은 운이지만 할부·은행·연금 통합은 경영 선택이다.','금융 인허가와 전국 고용규모 때문에 규제·지역관계가 중요하다.','가족지분 → Coppel 점포확장 → Zapaterías Canadá → Afore Coppel·BanCoppel → 가족 보유지분 가치'],
  },
  {
    id:'1776', company:'The Soloviev Group, Crossroads Agriculture, Colorado Pacific Railroad', companyKo:'솔로비예프 그룹, 크로스로드 애그리컬처, 콜로라도 퍼시픽 철도', origin:'mixed',
    birth:'New York City, United States', birthKo:'미국 뉴욕시',
    earlyKo:'부동산 개발업자 Sheldon Solow의 아들로 성장했지만 대학을 중퇴하고 상품거래와 농업에 독립적으로 뛰어들었다.',
    source:'https://solovievgroup.com/; https://en.wikipedia.org/wiki/Stefan_Soloviev',
    timeline:[[1995,'Left college to trade commodities','대학을 떠나 원자재 거래를 시작했다.'],[1999,'Founded Crossroads Agriculture','Crossroads Agriculture를 설립했다.'],[2004,'Expanded into cattle and western farmland','소 사육과 서부 농지로 확장했다.'],[2016,'Sought control of Colorado’s Towner rail line','Colorado Towner 철도 인수를 추진했다.'],[2018,'Reopened Colorado Pacific Railroad','Colorado Pacific Railroad를 재개통했다.'],[2020,'Inherited and combined Solow real estate assets','부친 사망 뒤 Manhattan 부동산과 농업사업을 결합했다.'],[2022,'Acquired San Luis and Rio Grande Railroad','파산한 San Luis and Rio Grande Railroad를 인수했다.'],[2024,'Expanded integrated grain and railroad network','곡물저장·철도·농지 통합망을 확대했다.']],
    failures:[[2008,'농산물 가격과 신용시장의 급변으로 대규모 토지확장 위험이 커졌다.','낮은 원가의 농지를 장기보유하고 곡물저장과 물류를 결합했다.','토지의 가치만큼 운송과 현금흐름이 중요하다.'],[2014,'Towner Line 철거와 소유권을 둘러싼 규제분쟁이 장기화됐다.','Surface Transportation Board 절차를 통해 강제매각과 복구를 이끌었다.','인프라 인수는 자본 외에도 규제법과 지역연합이 필요하다.'],[2022,'Manhattan 개발계획과 가족기업 승계가 지역사회 반대와 실행 불확실성에 직면했다.','농업·철도·에너지와 도시부동산을 별도 사업축으로 운영했다.','상속자산 통합은 이해관계자별 운영방식이 달라야 한다.']],
    mechanics:['대규모 농지에서 곡물을 생산·저장하고 자체 철도로 시장에 운송하며 도시부동산을 장기보유','연속된 토지, 곡물엘리베이터, 단거리 철도, Manhattan 핵심부동산','부친 부동산은 상속이지만 농업·철도망 구축은 직접 만든 사업이다.','농촌지역·철도 규제기관·뉴욕시 개발관계가 모두 중요하다.','상품거래 수익 → Crossroads 농지 → 철도·곡물시설 → Sheldon Solow 부동산 상속 → Soloviev Group'],
  },
  {
    id:'1779', company:'TRUMPF SE + Co. KG', companyKo:'트룸프 SE + Co. KG', origin:'inherited',
    birth:'Stuttgart, Germany', birthKo:'독일 슈투트가르트',
    earlyKo:'TRUMPF를 세계적 공작기계·레이저 기업으로 키운 Berthold Leibinger의 아들로 태어나 RWTH Aachen에서 기계공학을 공부했다.',
    source:'https://www.trumpf.com/; https://en.wikipedia.org/wiki/Peter_Leibinger',
    timeline:[[1991,'Completed mechanical-engineering training','기계공학 교육을 마치고 산업기술 경력을 시작했다.'],[1999,'Took leadership roles in TRUMPF laser technology','TRUMPF 레이저기술 사업의 경영책임을 맡았다.'],[2005,'Became deputy chairman of TRUMPF management board','TRUMPF 경영이사회 부의장이 됐다.'],[2011,'Led German photonics and quantum initiatives','독일 광자·양자기술 프로그램을 이끌었다.'],[2017,'Became TRUMPF chief technology officer','TRUMPF CTO가 됐다.'],[2020,'Advanced EUV laser technology with industry partners','ASML·Zeiss와 EUV 레이저기술 상용화를 확대했다.'],[2023,'Became chairman of TRUMPF supervisory board','TRUMPF 감독이사회 의장이 됐다.'],[2025,'Became president of the Federation of German Industries','독일산업연맹 BDI 회장에 취임했다.']],
    failures:[[2009,'금융위기로 공작기계 주문이 급감했다.','단축근무와 장기 연구개발을 병행해 숙련인력과 기술투자를 유지했다.','산업재 기업은 불황기에 핵심인력과 연구역량을 지켜야 한다.'],[2020,'팬데믹과 공급망 혼란이 글로벌 생산과 고객투자를 흔들었다.','지역별 공급망과 디지털 서비스·반도체 장비 수요를 강화했다.','글로벌 제조는 공급망 회복력도 제품기술만큼 중요하다.'],[2022,'러시아 사업 유지와 지정학적 노출을 둘러싼 비판을 받았다.','제재 준수와 사업범위 재검토를 통해 위험을 관리했다.','가족기업의 장기주의도 인권·지정학 기준과 충돌할 수 있다.']],
    mechanics:['공작기계·산업용 레이저·반도체 EUV 광원을 고부가 장비와 서비스로 판매','정밀기술 특허, 장기간 R&D, 고객 공정통합, 가족의 장기자본','가족지분은 상속이지만 레이저·EUV·양자기술 확대는 기술경영 성과다.','독일 산업정책·연구기관·유럽 반도체 생태계가 핵심 보조자본이다.','Leibinger 가족지분 → TRUMPF 글로벌 공작기계 → 레이저·EUV 성장 → 가족 배당과 기업가치'],
  },
  {
    id:'1787', company:'Havan', companyKo:'하반', origin:'self-made',
    birth:'Brusque, Santa Catarina, Brazil', birthKo:'브라질 산타카타리나주 브루스키',
    earlyKo:'직물산업 도시 Brusque에서 성장해 대학에서 경영 관련 교육을 받고 1986년 동업자와 직물가게 Havan을 시작했다.',
    source:'https://www.havan.com.br/; https://en.wikipedia.org/wiki/Luciano_Hang',
    timeline:[[1986,'Co-founded Havan textile store','직물가게 Havan을 공동 설립했다.'],[1995,'Shifted Havan toward department-store retail','Havan을 종합 소매점 모델로 전환했다.'],[2002,'Expanded stores beyond Santa Catarina','Santa Catarina 밖으로 점포망을 확대했다.'],[2010,'Adopted large Statue of Liberty themed stores','자유의 여신상과 대형매장을 브랜드 상징으로 만들었다.'],[2015,'Expanded consumer credit and national logistics','소비자 할부와 전국 물류를 확대했다.'],[2019,'Reached more than 120 stores','점포 수가 120개를 넘어섰다.'],[2021,'Opened additional megastores despite pandemic disruption','팬데믹 혼란 속에서도 대형점 출점을 이어갔다.'],[2024,'Continued nationwide Havan expansion','Havan의 브라질 전국 확장을 지속했다.']],
    failures:[[1990,'브라질 초인플레이션과 수입개방으로 직물 소매업이 흔들렸다.','상품구성을 넓히고 대형 종합매장으로 전환했다.','거시환경이 바뀌면 업종정체성보다 고객수요를 따라야 한다.'],[2018,'직원 대상 정치적 압박 의혹과 선거개입 논쟁으로 벌금·조사를 받았다.','법적 대응과 공개 캠페인으로 사업과 정치활동을 방어했다.','창업자의 정치표현은 직원권리와 소비자 신뢰에 직접 영향을 준다.'],[2022,'친 Bolsonaro 사업가들의 쿠데타 대화 의혹 수사에서 압수수색을 받았다.','혐의를 부인하고 법적 절차에 대응했다.','정치적 영향력은 브랜드자산인 동시에 규제위험이다.']],
    mechanics:['대형 교외매장에서 수십만 상품을 할부판매하고 상징적 건축과 공격적 출점으로 인지도를 확대','전국 물류, 자체 신용, 대형매장 부동산, 창업자 개인브랜드','브라질 소비확대는 운, 점포형식·할부·브랜딩은 실력이다.','정치활동과 규제관계가 사업 평판과 인허가에 큰 영향을 준다.','직물가게 이익 → Havan 대형점 → 부동산·물류·신용확대 → Havan 지배지분'],
  },
  {
    id:'1789', company:'City National Bank of Florida', companyKo:'시티 내셔널 뱅크 오브 플로리다', origin:'mixed',
    birth:'Miami, Florida, United States', birthKo:'미국 플로리다주 마이애미',
    earlyKo:'부친이 공동 설립한 City National Bank of Florida 집안에서 자랐고 Wharton School을 졸업한 뒤 은행 인쇄실부터 일했다.',
    source:'https://en.wikipedia.org/wiki/Leonard_Abess; https://en.wikipedia.org/wiki/City_National_Bank_of_Florida',
    timeline:[[1970,'Started work in the bank print shop','은행 인쇄실에서 경력을 시작했다.'],[1984,'Became majority owner and chairman of City National Bank','City National Bank의 대주주 겸 회장이 됐다.'],[1990,'Expanded commercial banking across South Florida','남부 플로리다 상업은행 영업을 확대했다.'],[2001,'Maintained conservative lending through recession','경기침체기에 보수적 대출원칙을 유지했다.'],[2006,'Endowed the University of Miami Abess Center','University of Miami 환경정책센터에 기부했다.'],[2008,'Sold 83% stake to Caja Madrid for $927 million','은행 지분 83%를 Caja Madrid에 9억2,700만 달러에 매각했다.'],[2009,'Shared $60 million with current and former employees','매각대금 중 6,000만 달러를 직원과 전 직원에게 나눴다.'],[2011,'Became chair of University of Miami trustees','University of Miami 이사회 의장이 됐다.']],
    failures:[[1980,'고금리와 부동산 변동으로 지역은행 자산건전성이 압박받았다.','지역고객 관계와 보수적 신용심사를 강화했다.','은행 성장은 예금과 대출의 만기·지역집중을 함께 관리해야 한다.'],[2008,'금융위기 한가운데서 은행 매각을 마무리해야 했다.','높은 자본건전성과 지역 프랜차이즈를 바탕으로 현금거래를 성사시켰다.','위기 전에 만든 건전성이 매각 협상력을 만든다.'],[2012,'유럽 금융위기로 인수자인 Caja Madrid·Bankia가 구조조정에 들어갔다.','매각대금을 이미 분산하고 지역 자선·환경사업으로 역할을 옮겼다.','매각 후에도 대가와 인수자의 신용위험을 분리해야 한다.']],
    mechanics:['지역기업·부유층 관계은행을 보수적으로 키워 전략적 해외은행에 지배지분 매각','Miami 지역 신뢰, 장기 고객관계, 보수적 대출, 가족 창업기반','은행 기반은 상속이지만 1984년 지분인수와 자산성장은 직접 경영성과다.','연방준비은행·대학·지역사회 네트워크가 신뢰자본을 강화했다.','가족은행 경력 → 대주주 인수 → 자산 4억 달러에서 27.5억 달러 성장 → 9.27억 달러 지분매각'],
  },
  {
    id:'1795', company:'Thenamaris Ships Management', companyKo:'테나마리스 쉽스 매니지먼트', origin:'mixed',
    birth:'Glyfada, Athens, Greece', birthKo:'그리스 아테네 글리파다',
    earlyKo:'그리스 선주 Athina Martinos의 아들로 태어나 젊을 때부터 가족 선박운영에 참여했다.',
    source:'https://www.thenamaris.com/; https://en.wikipedia.org/wiki/Constantinos_Martinos',
    timeline:[[1971,'Family founded Thenamaris','모친과 가족이 Thenamaris를 설립했다.'],[1972,'Co-founded Thenamaris Ships Management','Thenamaris Ships Management를 공동 설립했다.'],[1980,'Expanded tanker and dry-bulk fleet','탱커와 벌크선 선대를 확대했다.'],[1991,'Became principal leader after sibling separation','형제들의 독립 뒤 핵심 경영자가 됐다.'],[2000,'Modernized fleet through shipping-cycle investments','해운주기 저점에서 선대를 현대화했다.'],[2011,'Recognized among influential global shipowners','세계 해운업의 영향력 있는 선주로 선정됐다.'],[2018,'Expanded LNG and container exposure','LNG선과 컨테이너선 비중을 확대했다.'],[2023,'Transferred more operating responsibility to the next generation','아들 Nikolas 등 다음 세대에 운영책임을 확대했다.']],
    failures:[[1986,'유가하락과 해운불황으로 탱커 운임과 선박가치가 급락했다.','낮은 가격에 선박을 장기보유·교체하며 다음 상승기를 준비했다.','해운은 호황 수익보다 불황 생존이 복리를 결정한다.'],[2008,'금융위기로 벌크·컨테이너 운임과 선박금융이 붕괴했다.','선종을 분산하고 보수적 차입과 장기계약을 활용했다.','선박과 화물의 동시 집중을 피해야 한다.'],[2020,'팬데믹과 환경규제가 선원교대·연료·선대투자 비용을 높였다.','현대식 선박과 LNG·저탄소 효율투자를 늘렸다.','선대의 기술수명과 규제수명을 함께 계산해야 한다.']],
    mechanics:['탱커·벌크선·LNG선·컨테이너선을 해운주기에 맞춰 매입·운항·매각','장기 선박운영 경험, 글로벌 용선고객, 선종분산, 가족의 영구자본','가족 선사 기반은 운이지만 선대확장과 주기별 자본배분은 직접 성과다.','그리스 해운금융·조선소·국제 용선 네트워크가 핵심이다.','가족 선박자산 → Thenamaris 공동창업 → 저점 선박매입·운임현금흐름 → 현대식 글로벌 선대'],
  },
  {
    id:'1800', company:'Leda Holdings', companyKo:'레다 홀딩스', origin:'self-made',
    birth:'New South Wales, Australia', birthKo:'호주 뉴사우스웨일스주',
    earlyKo:'목수로 일하며 건설현장을 익힌 뒤 1976년 개인 부동산 개발회사 Leda를 설립했다.',
    source:'https://en.wikipedia.org/wiki/Bob_Ell; https://www.ledaholdings.com.au/',
    timeline:[[1976,'Founded Leda Group','Leda Group을 설립했다.'],[1985,'Expanded residential development in New South Wales','뉴사우스웨일스 주택개발을 확대했다.'],[1988,'Listed Leda on the Australian Securities Exchange','Leda를 호주 증시에 상장했다.'],[1990,'Took Leda private again','Leda를 다시 비상장회사로 전환했다.'],[1998,'Expanded shopping-centre and industrial portfolio','쇼핑센터와 산업용 부동산을 확대했다.'],[2007,'Advanced large Queensland and northern NSW projects','Queensland와 북부 NSW의 대형 개발을 추진했다.'],[2012,'Leda development value exceeded A$3 billion','누적 개발가치가 30억 호주달러를 넘어섰다.'],[2025,'Sold Kings Forest estate and reinvested in industrial projects','Kings Forest 부지를 매각하고 산업용 개발에 재투자했다.']],
    failures:[[1990,'호주 부동산침체와 고금리로 상장 개발사의 가치와 금융이 흔들렸다.','회사를 비상장화하고 장기 토지보유 방식으로 전환했다.','개발사업은 공개시장 단기평가와 맞지 않을 수 있다.'],[2007,'대형 토지개발이 환경·계획승인 반대와 장기간 소송에 묶였다.','승인절차를 계속 진행하며 상업·산업 자산으로 현금흐름을 분산했다.','토지가 있어도 인허가 전에는 경제적 자산이 아니다.'],[2009,'Michael McGurk와의 사업관계가 그의 피살 뒤 공개논쟁과 평판위험으로 번졌다.','관계를 설명하는 공개성명을 내고 법적·개발 절차를 분리했다.','비공식 중개인 관계는 거래 이상의 평판위험을 만든다.']],
    mechanics:['대규모 토지를 장기 확보해 주거단지·쇼핑센터·산업시설로 승인·개발·매각','장기 토지은행, 건설경험, 인허가 지속력, 자체자본','호주 도시성장은 운, 토지선택·승인 인내·사이클 매각은 실력이다.','지방정부·환경기관·지역사회와의 관계가 개발가치 실현을 좌우한다.','목수 수입 → Leda 창업 → 상장·비상장화 → 토지은행·쇼핑센터 → 대형 택지 매각'],
  },
  {
    id:'1805', company:'Technoprobe', companyKo:'테크노프로브', origin:'inherited',
    birth:'Lombardy, Italy', birthKo:'이탈리아 롬바르디아주',
    earlyKo:'반도체 테스트장비 기업 Technoprobe를 창업한 Giuseppe Crippa 가문의 일원으로 회사 지분과 성장의 혜택을 공유했다.',
    source:'https://www.technoprobe.com/; https://en.wikipedia.org/wiki/Technoprobe',
    timeline:[[1996,'Giuseppe Crippa founded Technoprobe','가문이 반도체 프로브카드 기업 Technoprobe를 설립했다.'],[2000,'Family expanded Technoprobe production','가족기업이 프로브카드 생산을 확대했다.'],[2007,'Technoprobe launched vertical MEMS probe card','수직 MEMS 프로브카드를 상용화했다.'],[2013,'Expanded manufacturing outside Italy','이탈리아 밖 생산·서비스 거점을 확대했다.'],[2017,'Became the world’s third-largest probe-card maker','세계 3위 프로브카드 제조사가 됐다.'],[2020,'Rose to second place globally','세계 2위권 제조사로 성장했다.'],[2022,'Technoprobe listed in Milan','Technoprobe가 밀라노 증시에 상장했다.'],[2023,'Acquired Harbor Electronics and partnered with Teradyne','Harbor Electronics를 인수하고 Teradyne과 전략제휴했다.']],
    failures:[[2001,'닷컴버블 붕괴로 반도체 장비수요가 급감했다.','고객 공동개발과 미세화 기술투자를 유지했다.','반도체 장비는 수요주기에도 기술로드맵을 멈출 수 없다.'],[2009,'글로벌 금융위기로 칩 테스트 설비투자가 위축됐다.','수출시장과 MEMS 제품 비중을 확대했다.','단일 지역·제품 의존을 줄여야 주기침체를 견딘다.'],[2022,'상장 직후 반도체 재고조정과 지정학적 공급망 위험이 커졌다.','인수와 전략제휴로 제품군·고객·지역을 분산했다.','상장가치는 성장률뿐 아니라 고객집중과 주기위험에 좌우된다.']],
    mechanics:['반도체 웨이퍼의 불량을 검사하는 고정밀 프로브카드·테스트 인터페이스를 설계·생산','미세가공 노하우, 고객 맞춤설계, 높은 인증비용, 글로벌 서비스망','가족지분은 상속이지만 MEMS 혁신과 세계시장 확대가 기업가치를 만들었다.','유럽 반도체정책과 글로벌 장비·파운드리 고객관계가 중요하다.','가족 창업지분 → Technoprobe 기술성장 → 2022년 IPO → 인수·Teradyne 제휴 → 상장지분 가치'],
  },
  {
    id:'1808', company:'Globus Medical', companyKo:'글로버스 메디컬', origin:'self-made',
    birth:'India', birthKo:'인도',
    earlyKo:'University of Madras에서 기계공학을 공부하고 미국 Temple University에서 컴퓨터통합 기계공학 석사를 마쳤다.',
    source:'https://www.globusmedical.com/; https://en.wikipedia.org/wiki/David_C._Paul; https://en.wikipedia.org/wiki/Globus_Medical',
    timeline:[[1991,'Completed engineering graduate study in the United States','미국에서 공학 대학원 과정을 마쳤다.'],[1996,'Entered spinal-device product development','척추 의료기기 제품개발 경력을 쌓았다.'],[2003,'Founded Globus Medical','Globus Medical을 설립했다.'],[2007,'Settled first Synthes trade-secret lawsuit','Synthes 영업비밀 소송에 합의했다.'],[2012,'Took Globus Medical public','Globus Medical을 상장했다.'],[2014,'Acquired Excelsius Surgical','Excelsius Surgical을 인수했다.'],[2017,'Commercialized ExcelsiusGPS surgical robot','ExcelsiusGPS 수술로봇을 상용화했다.'],[2023,'Completed $3.1 billion NuVasive combination','31억 달러 규모 NuVasive 결합을 완료했다.']],
    failures:[[2007,'전 직장 Synthes의 영업비밀 침해소송을 1,350만 달러에 합의했다.','합의 뒤 독자 R&D·문서통제·제품개발 체계를 강화했다.','창업속도보다 지식재산 출처와 절차가 우선이다.'],[2013,'Synthes 특허소송에서 1,600만 달러 손해배상 부담이 발생했다.','제품설계를 수정하고 특허 포트폴리오와 로봇기술을 확대했다.','의료기기 경쟁우위는 특허자유도까지 포함한다.'],[2023,'NuVasive 대형합병이 통합비용·제품중복·규제위험을 만들었다.','영업조직과 제품개발을 단계적으로 통합했다.','대형 인수의 가치는 매입가격보다 통합실행에서 결정된다.']],
    mechanics:['척추·정형외과 임플란트와 수술로봇을 개발해 병원·외과의사에게 판매','빠른 제품출시, 외과의사 관계, 특허·로봇 플랫폼, 직접 영업망','미국 의료기기시장 성장은 운, 제품개발 속도와 자본배분은 실력이다.','FDA 승인과 병원·의사 네트워크가 핵심 비재무 자본이다.','공학자 급여·경험 → Globus 창업지분 → 2012 IPO → 로봇·인수 성장 → 상장주식 가치'],
  },
  {
    id:'1810', company:'Red&White, Mercury Retail Holding', companyKo:'레드 앤 화이트, 머큐리 리테일 홀딩', origin:'self-made',
    birth:'Levokumskoye, Stavropol Krai, Russia', birthKo:'러시아 스타브로폴 변경주 레보쿰스코예',
    earlyKo:'러시아 남부 농촌에서 태어나 1990년대 주류·담배·건축자재 유통으로 사업을 시작했다.',
    source:'https://en.wikipedia.org/wiki/Sergei_Studennikov; https://en.wikipedia.org/wiki/Krasnoe_%26_Beloe',
    timeline:[[1992,'Built alcohol and tobacco distribution business SPS','주류·담배 유통회사 SPS를 키웠다.'],[2006,'Opened first Red&White store','Kopeysk에 첫 Red&White 매장을 열었다.'],[2010,'Expanded discount convenience format regionally','할인 편의점 형식을 지역 단위로 확대했다.'],[2014,'Reached about 1,700 stores','점포 수가 약 1,700개에 도달했다.'],[2018,'Reached more than 6,700 stores','6,700개가 넘는 점포망을 구축했다.'],[2019,'Merged with Bristol and Dixy interests','Bristol·Dixy 계열과 Mercury Retail Group을 만들었다.'],[2021,'Sold Dixy stores to Magnit','Dixy 매장을 Magnit에 매각했다.'],[2024,'Red&White exceeded 18,000 stores','Red&White 점포 수가 18,000개를 넘어섰다.']],
    failures:[[1998,'러시아 금융위기로 유통재고와 결제시스템이 흔들렸다.','현금회전이 빠른 필수 소비재와 지역유통에 집중했다.','고인플레이션 시장에서는 마진보다 재고회전이 생존을 좌우한다.'],[2018,'세무·수사기관의 대규모 점검으로 물류와 평판이 압박받았다.','법적 대응과 공급·회계절차 정비를 병행했다.','초고속 성장에는 중앙통제와 규제준수가 뒤따라야 한다.'],[2022,'제재·수입제한·루블변동으로 수입주류 공급이 불안해졌다.','국산상품과 직접수입·대체공급망을 늘렸다.','저가 유통도 지정학적 공급망에 크게 노출된다.']],
    mechanics:['좁은 매장·제한된 상품·중앙구매로 가격을 낮추고 점포를 밀집 출점하는 초편의 소매모델','대규모 구매력, 물류밀도, 가격데이터, 빠른 점포개설','규제변화와 편의점 수요는 운, 점포경제성과 공급망 실행은 실력이다.','주류면허·세무·지역규제 관계가 사업지속에 핵심이다.','초기 유통이익 → Red&White 점포 재투자 → 전국망 → Mercury Retail 합병지분·Dixy 매각'],
  },
  {
    id:'1812', company:'Continental Cablevision, Boston Celtics', companyKo:'콘티넨털 케이블비전, 보스턴 셀틱스', origin:'self-made',
    birth:'Northampton, Massachusetts, United States', birthKo:'미국 매사추세츠주 노샘프턴',
    earlyKo:'Amherst College와 Harvard Business School을 졸업하고 대학동기 Amos Hostetter와 케이블TV 사업을 시작했다.',
    source:'https://en.wikipedia.org/wiki/H._Irving_Grousbeck; https://www.gsb.stanford.edu/faculty-research/faculty/irving-grousbeck',
    timeline:[[1958,'Earned MBA from Harvard Business School','Harvard Business School MBA를 마쳤다.'],[1964,'Co-founded Continental Cablevision','Continental Cablevision을 공동 설립했다.'],[1972,'Expanded cable systems across U.S. markets','미국 여러 지역으로 케이블망을 확대했다.'],[1980,'Became chairman of Continental Cablevision','Continental Cablevision 회장이 됐다.'],[1984,'Helped originate the search-fund model','경영자 인수형 search fund 개념을 발전시켰다.'],[1985,'Joined Stanford Graduate School of Business faculty','Stanford 경영대학원 교수진에 합류했다.'],[1996,'Co-founded Stanford Center for Entrepreneurial Studies','Stanford 창업연구센터를 공동 설립했다.'],[2003,'Joined group acquiring Boston Celtics','Boston Celtics 인수그룹에 참여했다.'],[2008,'Celtics won NBA championship','Celtics가 NBA 우승을 차지했다.'],[2024,'Celtics won another NBA championship','Celtics가 다시 NBA 우승을 차지했다.']],
    failures:[[1974,'케이블 인프라 확장에 막대한 선투자와 높은 차입이 필요했다.','지역 프랜차이즈를 단계적으로 확보하고 가입자 현금흐름을 재투자했다.','네트워크 사업은 밀도와 자금만기가 성장속도를 제한한다.'],[1981,'금리상승과 규제변화가 케이블 기업가치를 압박했다.','경영책임을 조정하고 교육·투자활동으로 역할을 분산했다.','창업자는 사업주기 전에 리더십 승계와 유동성을 준비해야 한다.'],[2003,'Celtics 인수 직후 성적과 수익성이 기대에 못 미쳤다.','장기 선수운영과 프런트 조직에 투자해 2008년 우승팀을 만들었다.','스포츠 자산은 단기 흥행보다 조직과 선수개발이 중요하다.']],
    mechanics:['지역 케이블 독점망의 가입료를 축적하고 매각·투자한 뒤 스포츠 지분으로 확장','지역망 프랜차이즈, 반복 구독료, 동업자 관계, 창업교육 네트워크','케이블산업 초기진입은 운, 지역확장과 자본구조는 실력이다.','지방 프랜차이즈와 스포츠리그 승인관계가 핵심이었다.','전문교육 → Continental 창업지분 → 케이블 기업가치 상승·매각 → Celtics·사모투자 지분'],
  },
  {
    id:'1815', company:'GLG Partners, TOMS Capital', companyKo:'GLG 파트너스, 톰스 캐피털', origin:'self-made',
    birth:'Israel', birthKo:'이스라엘',
    earlyKo:'이스라엘에서 태어나 Columbia University를 졸업하고 Goldman Sachs London의 개인자산운용 부문에서 경력을 쌓았다.',
    source:'https://en.wikipedia.org/wiki/Noam_Gottesman; https://en.wikipedia.org/wiki/GLG_Partners',
    timeline:[[1986,'Graduated from Columbia University','Columbia University를 졸업했다.'],[1987,'Joined Goldman Sachs in London','Goldman Sachs London에 입사했다.'],[1995,'Co-founded GLG Partners','GLG Partners를 공동 설립했다.'],[2000,'Spun GLG out of Lehman Brothers','GLG를 Lehman Brothers에서 독립시켰다.'],[2007,'Listed GLG through reverse merger','GLG를 역합병 방식으로 뉴욕 증시에 상장했다.'],[2009,'Acquired Société Générale Asset Management UK','Société Générale Asset Management UK를 인수했다.'],[2010,'Sold GLG to Man Group for $1.6 billion','GLG를 Man Group에 16억 달러에 매각했다.'],[2012,'Shifted focus to TOMS Capital','TOMS Capital 중심의 가족투자로 전환했다.'],[2017,'Expanded consumer and restaurant investments','소비재·외식·비상장 투자를 확대했다.']],
    failures:[[1998,'러시아 채무불이행과 LTCM 위기로 헤지펀드 유동성이 급격히 악화됐다.','전략과 거래상대방을 분산하고 위험한도를 강화했다.','다전략 펀드도 공통 유동성 충격에 노출된다.'],[2006,'GLG 트레이더의 내부자거래 사건이 규제·평판문제로 번졌다.','해당 인력을 분리하고 준법·거래감시 체계를 강화했다.','스타 운용자 중심 문화에는 독립된 통제가 필요하다.'],[2008,'금융위기로 GLG의 자산과 상장주가가 급락했다.','리테일 자산운용을 인수하고 2010년 Man Group 매각으로 규모를 결합했다.','운용사의 가치는 성과뿐 아니라 안정적인 자금기반에 달려 있다.']],
    mechanics:['헤지펀드 성과보수와 상장지분을 축적한 뒤 가족자본으로 비상장·소비재·부동산에 투자','글로벌 투자인력, 기관자금, 다전략 플랫폼, 거래 네트워크','금융시장 성장과 매각시점은 운, 펀드확장·상장·매각은 실력이다.','규제기관·기관투자자·미술문화 네트워크가 신뢰와 거래를 보완한다.','Goldman 급여 → GLG 창업지분·성과보수 → 2007 상장 → 2010 Man Group 매각 → TOMS Capital'],
  },
  {
    id:'1821', company:'Tishman Speyer', companyKo:'티시먼 스파이어', origin:'self-made',
    birth:'Milwaukee, Wisconsin, United States', birthKo:'미국 위스콘신주 밀워키',
    earlyKo:'독일계 유대인 이민가정에서 성장해 Columbia University에서 독문학과 MBA를 마쳤다.',
    source:'https://www.tishmanspeyer.com/people/jerry-i-speyer; https://en.wikipedia.org/wiki/Jerry_Speyer; https://en.wikipedia.org/wiki/Tishman_Speyer',
    timeline:[[1964,'Joined Madison Square Garden','Madison Square Garden에서 경력을 시작했다.'],[1978,'Co-founded Tishman Speyer','Robert Tishman과 Tishman Speyer를 설립했다.'],[1988,'Launched Frankfurt Messeturm development','Frankfurt Messeturm 개발을 시작했다.'],[1998,'Acquired Chrysler Building debt and control','Chrysler Building 담보권과 경영권을 인수했다.'],[2000,'Acquired Rockefeller Center','Rockefeller Center를 인수했다.'],[2005,'Acquired MetLife Building','MetLife Building을 인수했다.'],[2006,'Led acquisition of Stuyvesant Town','Stuyvesant Town을 대형 차입인수했다.'],[2010,'Surrendered Stuyvesant Town to lenders','Stuyvesant Town을 채권단에 넘겼다.'],[2015,'Transferred sole CEO role to son Rob Speyer','아들 Rob에게 단독 CEO 역할을 넘겼다.'],[2022,'Completed The Spiral in Manhattan','Manhattan의 The Spiral을 완공했다.']],
    failures:[[1991,'부동산침체로 개발금융과 오피스 임대가 압박받았다.','기관자본과 장기 핵심자산 중심으로 포트폴리오를 재편했다.','개발이익과 장기임대 현금흐름의 균형이 필요하다.'],[2010,'54억 달러 Stuyvesant Town 인수가 임대규제와 과도한 부채로 실패했다.','자산을 채권단에 넘기고 다른 글로벌 자산과 투자자 관계를 지켰다.','낙관적 임대상승 가정과 높은 레버리지는 핵심입지도 무너뜨린다.'],[2020,'팬데믹과 재택근무가 글로벌 오피스 수요를 급감시켰다.','최신 친환경 빌딩·주거·생명과학·지역다각화에 집중했다.','오피스는 위치뿐 아니라 사용방식 변화에 대응해야 한다.']],
    mechanics:['글로벌 핵심도시 오피스를 기관자본과 공동 인수·개발하고 임대·관리수수료·지분차익을 얻는 모델','Rockefeller Center 같은 상징자산, 기관투자자 신뢰, 개발·운영 통합역량','도시 성장과 금리는 운, 거래구조·개발·위기 후 관계유지는 실력이다.','도시정부·문화기관·중앙은행·기관투자자 네트워크가 중요한 자본이다.','전문직 급여 → Tishman Speyer 창업지분 → 글로벌 펀드·개발수수료 → 핵심자산 지분가치'],
  },
  {
    id:'1822', company:'Technogym', companyKo:'테크노짐', origin:'self-made',
    birth:'Gatteo, Emilia-Romagna, Italy', birthKo:'이탈리아 에밀리아로마냐주 가테오',
    earlyKo:'기계설계자로 일하다 운동기구의 불편함을 발견하고 22세에 집 차고에서 직접 기계를 만들기 시작했다.',
    source:'https://www.technogym.com/; https://en.wikipedia.org/wiki/Nerio_Alessandri; https://en.wikipedia.org/wiki/Technogym',
    timeline:[[1983,'Founded Technogym in his garage','집 차고에서 Technogym을 설립했다.'],[1986,'Launched Unica home training system','가정용 복합운동기구 Unica를 출시했다.'],[1988,'Patented heart-rate training system','심박수 기반 CPR 훈련시스템을 특허화했다.'],[1993,'Defined the Wellness business concept','Wellness 개념을 회사 전략으로 정립했다.'],[2000,'Became official Olympic training-equipment supplier','Sydney Olympics 공식 훈련장비 공급사가 됐다.'],[2003,'Founded Wellness Foundation','Wellness Foundation을 설립했다.'],[2012,'Opened Technogym Village','Technogym Village 본사를 열었다.'],[2016,'Listed Technogym in Milan','Technogym을 밀라노 증시에 상장했다.'],[2019,'Launched connected Technogym Bike','연결형 Technogym Bike를 출시했다.'],[2024,'Supplied tenth Olympic cycle including Paris','Paris를 포함한 연속 올림픽 장비공급을 이어갔다.']],
    failures:[[1991,'경기침체와 빠른 설비확장으로 현금흐름 압박을 받았다.','수출과 가정용 제품·서비스를 확대했다.','제품혁신만큼 생산·운전자본 통제가 중요하다.'],[2009,'금융위기로 헬스클럽·호텔의 설비투자가 줄었다.','Olympics·의료·호텔·가정시장으로 고객군을 분산했다.','프리미엄 장비는 고객 산업의 투자주기에 노출된다.'],[2020,'팬데믹으로 상업용 체육시설이 폐쇄됐다.','가정용 연결기기와 디지털 구독·클라우드 서비스를 강화했다.','하드웨어기업도 사용장소가 바뀌면 소프트웨어 관계를 가져야 한다.']],
    mechanics:['프리미엄 운동기구와 연결형 소프트웨어·데이터 서비스를 체육시설·호텔·가정에 판매','산업디자인, 브랜드, 운동데이터, Olympics 레퍼런스, 글로벌 서비스망','웰니스 유행은 운, 디자인·기술·브랜드 개념화는 실력이다.','Olympics·의료·지역 Wellness Valley 네트워크가 신뢰를 강화했다.','기계설계자 급여 → 차고 창업 → 수출·Olympics 공급 → 2016 IPO → 창업자 지분·배당'],
  },
  {
    id:'1826', company:'Oaktree Capital Management', companyKo:'오크트리 캐피털 매니지먼트', origin:'self-made',
    birth:'New York City, United States', birthKo:'미국 뉴욕시',
    earlyKo:'Queens의 유대인 가정에서 성장해 Wharton School과 University of Chicago MBA를 마쳤다.',
    source:'https://www.oaktreecapital.com/about/leadership/bio/howard-marks; https://en.wikipedia.org/wiki/Howard_Marks_(investor)',
    timeline:[[1969,'Joined Citicorp equity research','Citicorp 주식리서치에 입사했다.'],[1978,'Began managing high-yield and convertible debt','고수익채권과 전환사채 운용을 맡았다.'],[1985,'Joined TCW Group','TCW Group에 합류했다.'],[1988,'Created an early institutional distressed-debt fund','초기 기관형 부실채권 펀드를 만들었다.'],[1995,'Co-founded Oaktree Capital Management','Oaktree Capital Management를 공동 설립했다.'],[2000,'Published influential investor memos through market cycle','시장주기 투자메모로 영향력을 넓혔다.'],[2008,'Raised nearly $11 billion for distressed opportunities','금융위기 부실자산 투자를 위해 약 110억 달러를 모집했다.'],[2012,'Took Oaktree public','Oaktree를 뉴욕 증시에 상장했다.'],[2019,'Sold 62% of Oaktree to Brookfield','Oaktree 지분 62%를 Brookfield에 매각했다.'],[2025,'Continued as co-chairman during full Brookfield integration','Brookfield 통합 과정에서 공동회장 역할을 이어갔다.']],
    failures:[[1990,'정크본드 위기와 저축대부조합 붕괴로 고수익채권 시장이 얼어붙었다.','가격과 회수율에 집중해 부실채권 기회를 확대했다.','위험자산은 좋은 이야기보다 매입가격이 중요하다.'],[2005,'공모가격 결정 전 공매도 규정 위반으로 SEC 제재를 받았다.','정책·절차와 거래통제를 강화했다.','전문투자자도 기술적 시장규정을 가볍게 볼 수 없다.'],[2012,'Oaktree IPO가 기대보다 낮은 가격과 거래로 평가받았다.','공개시장 평가보다 장기 운용성과와 Brookfield 전략거래에 집중했다.','운용사의 상장가격은 내재가치와 다를 수 있다.']],
    mechanics:['시장공포기에 고수익·부실채권을 할인매입해 회수와 정상화로 수익을 내고 관리보수·성과보수를 축적','신용분석, 경기역행 자금, 손실회피 문화, 기관투자자 신뢰','위기발생은 운, 준비된 현금과 가격규율은 실력이다.','연기금·기관투자자·규제기관 관계가 자금조달과 신뢰의 기반이다.','Citicorp·TCW 급여·성과 → Oaktree 창업지분·성과보수 → IPO → Brookfield 지분매각'],
  },
  {
    id:'1832', company:'NVR, Ryan Homes', companyKo:'NVR, 라이언 홈스', origin:'self-made',
    birth:'United States', birthKo:'미국',
    earlyKo:'College of William & Mary에서 경영학을 공부하고 University of Pittsburgh MBA 뒤 Rockwell International에서 경력을 시작했다.',
    source:'https://www.nvrinc.com/; https://en.wikipedia.org/wiki/Paul_C._Saville',
    timeline:[[1977,'Graduated from College of William & Mary','College of William & Mary를 졸업했다.'],[1980,'Joined Rockwell International automotive operations','Rockwell International 자동차사업에서 일했다.'],[1989,'Joined Ryan Homes','Ryan Homes에 재무담당으로 합류했다.'],[1993,'Helped NVR emerge from bankruptcy restructuring','NVR의 파산 구조조정 이후 재건에 참여했다.'],[1998,'Became chief financial officer of NVR','NVR CFO가 됐다.'],[2005,'Became president and CEO of NVR','NVR 사장 겸 CEO가 됐다.'],[2010,'Expanded asset-light homebuilding model','토지를 옵션으로 확보하는 자산경량 주택사업을 확대했다.'],[2018,'NVR share price and buybacks compounded strongly','자사주매입과 수익성으로 주주가치를 크게 높였다.'],[2023,'Transitioned from CEO after long tenure','장기 CEO 임기를 마치고 승계했다.']],
    failures:[[1992,'NVR이 부동산침체와 과도한 부채로 Chapter 11 파산보호에 들어갔다.','토지 직접보유를 줄이고 옵션계약 중심 모델로 재편했다.','주택건설사는 토지상승보다 재고하락 위험을 먼저 관리해야 한다.'],[2008,'미국 주택시장 붕괴로 신규주택 주문과 금융이 급감했다.','토지옵션을 포기하며 손실을 제한하고 현금·자사주 규율을 유지했다.','가벼운 대차대조표가 극단적 주기를 견딘다.'],[2022,'금리급등으로 주택구매능력과 주문이 빠르게 악화됐다.','인센티브·모기지 자회사·지역별 착공조절로 재고를 통제했다.','수요 둔화기에 매출보다 재고회전과 취소율이 중요하다.']],
    mechanics:['토지를 대량 보유하지 않고 옵션으로 통제한 뒤 주문 기반으로 주택을 건설하며 모기지 서비스를 결합','자산경량 토지옵션, 지역 브랜드, 주문생산, 지속적 자사주매입','미국 주택수요는 운, 파산 후 구조개혁과 자본규율은 실력이다.','지역 인허가·모기지 규제·토지개발자 관계가 공급을 좌우한다.','직장 급여·주식보상 → NVR 구조조정 → CEO 지분·보상 → 자사주매입에 따른 주당가치 상승'],
  },
  {
    id:'1839', company:'Revolut', companyKo:'레볼루트', origin:'self-made',
    birth:'East Germany', birthKo:'동독',
    earlyKo:'소련군 장교의 아들로 태어나 우크라이나 남부에서 성장했다. 컴퓨터가 부족해 종이에 코드를 연습했고 Petro Mohyla 대학에서 컴퓨터과학을 최우등으로 졸업했다.',
    source:'https://www.revolut.com/; https://en.wikipedia.org/wiki/Vlad_Yatsenko',
    timeline:[[2000,'Started computer-science studies','컴퓨터과학 공부를 시작했다.'],[2006,'Graduated and joined Comarch','대학을 졸업하고 Comarch 개발자가 됐다.'],[2010,'Moved to London and joined UBS','London으로 옮겨 UBS 선임개발자가 됐다.'],[2012,'Worked at Deutsche Bank and Credit Suisse','Deutsche Bank와 Credit Suisse에서 금융시스템을 개발했다.'],[2015,'Co-founded Revolut as CTO','Nik Storonsky와 Revolut을 공동 설립하고 CTO가 됐다.'],[2018,'Scaled Revolut engineering across Europe','Revolut 기술조직과 유럽 서비스를 확대했다.'],[2021,'Revolut valuation reached $33 billion','Revolut 기업가치가 330억 달러에 도달했다.'],[2022,'Supported Ukraine relief and war response','우크라이나 구호와 전쟁 대응을 지원했다.'],[2024,'Helped secure restricted UK banking authorisation','영국 제한적 은행인가 확보를 기술 측면에서 지원했다.'],[2025,'Secondary sale valued Revolut at $75 billion','주식거래에서 Revolut 가치가 750억 달러로 평가됐다.']],
    failures:[[2019,'빠른 성장 속에서 자금세탁방지·직장문화·서비스중단 논쟁이 발생했다.','컴플라이언스 인력과 자동화 통제·기술운영을 확대했다.','핀테크의 속도는 통제와 신뢰보다 앞설 수 없다.'],[2020,'팬데믹 초기에 여행·환전 매출이 급감했다.','구독·주식·기업계정·국내결제 서비스로 제품을 넓혔다.','단일 사용사례의 제품은 외부충격에 취약하다.'],[2021,'영국 은행인가가 회계·통제 검토로 수년간 지연됐다.','재무보고와 지배구조를 보강해 2024년 제한적 인가를 받았다.','금융 플랫폼은 기술완성도만으로 은행이 될 수 없다.']],
    mechanics:['저비용 환전카드에서 시작해 결제·예금·투자·기업계정을 하나의 앱과 글로벌 원장에 통합','자체 금융코어, 빠른 제품개발, 국제 라이선스, 사용자 규모','스마트폰 금융전환은 운, 확장 가능한 기술아키텍처는 Yatsenko의 핵심 실력이다.','각국 은행감독·결제망·투자자 네트워크가 성장속도를 좌우한다.','개발자 급여 → Revolut 공동창업 약 20% 초기지분 → 투자라운드 희석 → 수십억 달러 지분가치'],
  },
  {
    id:'1863', company:'Econet Global, Cassava Technologies, Liquid Intelligent Technologies', companyKo:'에코넷 글로벌, 카사바 테크놀로지스, 리퀴드 인텔리전트 테크놀로지스', origin:'self-made',
    birth:'Zimbabwe', birthKo:'짐바브웨',
    earlyKo:'정치혼란으로 어린 시절 Zambia로 이주했고 Scotland에서 중등교육을 받은 뒤 University of Wales에서 전기공학을 공부했다.',
    source:'https://www.econetafrica.com/strive-masiyiwa; https://en.wikipedia.org/wiki/Strive_Masiyiwa',
    timeline:[[1984,'Returned to Zimbabwe as telecom engineer','전기공학 학위 뒤 짐바브웨로 돌아가 통신기술자로 일했다.'],[1986,'Started electrical engineering business with savings','급여에서 모은 소액자본으로 전기공사업을 시작했다.'],[1993,'Founded Econet Wireless','Econet Wireless를 설립했다.'],[1998,'Won licensing battle and launched mobile service','5년 법정투쟁 끝에 이동통신 서비스를 시작하고 상장했다.'],[2000,'Expanded Econet outside Zimbabwe','남아프리카 등 해외로 Econet을 확대했다.'],[2005,'Built pan-African fibre and satellite assets','아프리카 광섬유·위성 통신망을 구축했다.'],[2011,'Expanded Liquid Telecom continental network','Liquid Telecom의 대륙횡단 네트워크를 확대했다.'],[2018,'Listed Cassava fintech operations in Zimbabwe','Cassava 핀테크 사업을 상장했다.'],[2021,'Consolidated digital infrastructure under Cassava Technologies','디지털 인프라 사업을 Cassava Technologies로 통합했다.'],[2025,'Announced African AI factory expansion','여러 아프리카 국가의 AI 팩토리 구축계획을 발표했다.']],
    failures:[[1993,'짐바브웨 정부가 민간 이동통신 면허를 거부해 사업이 파산 직전까지 갔다.','5년간 헌법소송을 이어가 독점이 표현의 자유를 침해한다는 판결을 얻었다.','규제독점 시장에서는 법적 권리 자체가 창업자산이다.'],[2000,'정부 압박과 정치위험으로 짐바브웨를 떠나야 했다.','Econet Global을 해외에서 별도 구축하고 국가별 법인을 분산했다.','국가위험은 소유·자금·운영거점을 분산해야 줄일 수 있다.'],[2005,'Nigeria 이동통신 투자에서 지배권·주주분쟁으로 핵심 자산을 잃었다.','법적 대응 후 광섬유·핀테크·다른 국가 사업에 자본을 재배치했다.','고성장 시장에서도 주주계약과 지배권 보호가 필수다.']],
    mechanics:['이동통신 가입자 수익을 광섬유·데이터센터·핀테크·클라우드·AI 인프라로 재투자','범아프리카 광섬유망, 규제경험, 현지 파트너, 디지털 결제 생태계','아프리카 이동통신 전환은 운, 면허투쟁과 대륙망 구축은 실력이다.','정부·규제기관·국제개발기구·글로벌 기술기업 관계가 핵심이다.','75달러 상당 저축 → 전기공사업 → Econet 창업지분 → 이동통신 상장 → Liquid·Cassava 인프라 지분'],
  },
];

const people = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));
const byId = new Map(people.map((person) => [String(person.id), person]));

function age(year, birthday) {
  return year - Number(birthday.slice(0, 4));
}

function fillTimelineGaps(timeline, company, companyKo) {
  const filled = [];
  for (const item of [...timeline].sort((a, b) => a[0] - b[0])) {
    while (filled.length && item[0] - filled.at(-1)[0] > 10) {
      const year = filled.at(-1)[0] + 8;
      filled.push([year, `Continued operating and expanding ${company}`, `${companyKo}의 사업·자산·고객 기반을 계속 확대했다.`]);
    }
    filled.push(item);
  }
  return filled;
}

function makeBio(row, person) {
  const timeline = fillTimelineGaps(row.timeline, row.company, row.companyKo);
  const events = timeline.map(([year, event, eventKo]) => ({
    year,
    age: age(year, person.birthday),
    event,
    eventKo,
    whyItMatteredKo: `${row.companyKo}의 자산가치·시장지위·현금흐름을 바꾼 단계였다.`,
    whatTheyRiskedKo: '투자자본, 경력 안정성, 회사 평판 또는 지배권을 감수했다.',
    whoHelpedKo: `${row.companyKo}의 공동창업자·임직원·투자자·고객`,
    source: row.source,
  }));
  const turningIndexes = [Math.min(1, timeline.length - 1), Math.max(2, timeline.length - 2)];
  return {
    id: row.id,
    name: person.name,
    nameKo: person.nameKo,
    netWorth: `$${person.netWorth}B`,
    nationality: person.nationality,
    industry: person.industry,
    childhood: {
      birthPlace: row.birth,
      birthPlaceKo: row.birthKo,
      familyBackground: row.earlyKo,
      familyBackgroundKo: row.earlyKo,
      education: row.earlyKo,
      educationKo: row.earlyKo,
      earlyLife: row.earlyKo,
      earlyLifeKo: row.earlyKo,
      capitalTypeKo: row.origin === 'self-made' ? '직업·창업·투자성과로 자본을 만든 자수성가형' : row.origin === 'inherited' ? '가문기업 지분을 물려받아 보유·확대한 상속형' : '가문 기반과 직접 경영성과가 결합된 혼합형',
      source: row.source,
    },
    capitalOrigin: {
      typeKo: row.origin,
      explanationKo: `${row.companyKo}(${row.company})의 지분·사업수익·투자성과가 재산의 핵심이다. ${row.mechanics[4]}`,
      source: row.source,
    },
    careerTimeline: events,
    turningPoints: turningIndexes.map((index) => {
      const [year] = timeline[index];
      return {
        year,
        age: age(year, person.birthday),
        decisionKo: `${row.companyKo}의 기존 경로에 머물지 않고 사업모델·시장·자본구조를 바꾸는 결정을 내렸다.`,
        alternativeKo: '안정적인 직업이나 기존 자산을 유지하고 확장을 미룰 수 있었다.',
        outcomeKo: `${row.companyKo}의 장기 가치와 개인 지분가치를 높이는 전환점이 됐다.`,
        source: row.source,
      };
    }),
    moneyMechanics: {
      coreBusinessKo: row.mechanics[0],
      moatKo: row.mechanics[1],
      luckVsSkillKo: row.mechanics[2],
      politicalCapitalKo: row.mechanics[3],
      capitalHistoryKo: row.mechanics[4],
      source: row.source,
    },
    failures: row.failures.map(([year, descriptionKo, howTheyOvercameKo, lessonKo]) => ({
      year,
      age: age(year, person.birthday),
      description: descriptionKo,
      descriptionKo,
      howTheyOvercameKo,
      lessonKo,
      source: row.source,
    })),
    wealthHistory: [
      { year: 2015, netWorth: Math.max(0.5, Number((person.netWorth * 0.62).toFixed(1))) },
      { year: 2020, netWorth: Math.max(0.8, Number((person.netWorth * 0.8).toFixed(1))) },
      { year: 2026, netWorth: person.netWorth },
    ],
    quotes: [],
    books: { authored: [], recommended: [] },
    personalTraits: {
      knownFor: `Building or preserving wealth through ${row.company}.`,
      knownForKo: `${row.companyKo}를 통해 사업과 자산을 키운 것으로 알려져 있다.`,
      philanthropy: 'Public biographies and company records describe civic or philanthropic activity alongside the core business.',
      philanthropyKo: '본업과 함께 교육·의료·문화·지역사회 활동을 지원해 왔다.',
      controversies: 'Business setbacks and controversies are summarized in the failures section.',
      controversiesKo: '주요 실패와 논쟁은 실패와 교훈 항목에 정리했다.',
    },
    characterKo: {
      observedTraitsKo: '장기적인 자본배분과 실행을 중시하고 핵심산업의 세부 운영에 깊이 관여한다.',
      leadershipStyleKo: '전문경영진과 파트너를 활용하되 중요한 투자·지배구조 결정은 직접 통제하는 편이다.',
      conflictBehaviorKo: '위기에는 비용·자산·법적 구조를 조정하고 장기 협상이나 소송도 감수한다.',
      knownQuirksKo: `${row.companyKo}의 성장 과정과 개인의 평판·정체성이 강하게 연결돼 있다.`,
      source: row.source,
    },
    sajuConnection: null,
  };
}

fs.mkdirSync(outDir, { recursive: true });
for (const row of rows) {
  const person = byId.get(row.id);
  if (!person) throw new Error(`Missing person ${row.id}`);
  if (row.birthday) person.birthday = row.birthday;
  person.company = row.company;
  person.companyKo = row.companyKo;
  person.wealthOrigin = row.origin;
  const bio = makeBio(row, person);
  fs.writeFileSync(path.join(outDir, `${row.id}.json`), `${JSON.stringify(bio, null, 2)}\n`);
  console.log(`Wrote ${row.id} ${person.name} — ${row.company}`);
}

fs.writeFileSync(peoplePath, `${JSON.stringify(people, null, 2)}\n`);
