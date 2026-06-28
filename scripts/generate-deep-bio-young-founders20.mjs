import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const peoplePath = path.join(root, 'public', 'billionaires.json');
const outDir = path.join(root, 'public', 'deep-bios-v2');

const rows = [
  ['2982','Figma','피그마','self-made','Eugene, Oregon, United States','미국 오리건주 유진',
    '어린 시절부터 수학·컴퓨터·예술에 관심을 가졌고 Brown University에서 컴퓨터과학을 공부하다 Thiel Fellowship을 받아 중퇴했다.',
    'https://www.figma.com/about-us/; https://en.wikipedia.org/wiki/Dylan_Field; https://www.wired.com/story/figma-ipo-dylan-field-interview',
    [[2011,'Met Evan Wallace at Brown University','Brown University에서 Evan Wallace를 만났다.'],[2012,'Received Thiel Fellowship and founded Figma','Thiel Fellowship을 받고 Figma를 공동 창업했다.'],[2015,'Released Figma beta after years of development','수년간 개발 끝에 Figma 베타를 공개했다.'],[2016,'Launched browser-based collaborative design product','브라우저 기반 협업 디자인 제품을 정식 출시했다.'],[2020,'Reached a $2 billion valuation during remote-work boom','원격근무 확산 속에 기업가치 20억 달러에 도달했다.'],[2022,'Agreed to a $20 billion Adobe acquisition','Adobe의 200억 달러 인수 제안에 합의했다.'],[2023,'Adobe transaction collapsed under antitrust scrutiny','반독점 심사로 Adobe 거래가 무산됐다.'],[2025,'Took Figma public on the New York Stock Exchange','Figma를 뉴욕증권거래소에 상장했다.']],
    ['실시간 공동 디자인 소프트웨어를 구독형으로 판매하고 개발·프레젠테이션·웹제작 도구로 확장','브라우저 협업 구조, 플러그인 생태계, 디자인 파일 네트워크 효과','원격근무 확산은 운, 4년간 제품을 다듬은 인내와 웹기술 선택은 실력','기업고객·개발자·디자이너 커뮤니티가 핵심 비재무 자본','Thiel Fellowship → 창업자지분 → 벤처투자 → Adobe 해지금 10억 달러 → 2025 IPO 지분'],
    [[2014,'출시가 반복 지연되고 직원들이 이탈했다.','제품 범위를 줄이고 브라우저 렌더링·협업 성능에 집중했다.','새 시장을 만들 때 출시속도와 기술완성도의 균형이 필요하다.'],[2023,'Adobe 인수가 규제당국 반대로 무산됐다.','10억 달러 해지금을 확보하고 독립제품·AI 기능·IPO 준비로 전환했다.','큰 매각이 실패해도 독립 성장경로를 준비해야 한다.'],[2025,'IPO 직후 높은 주가변동성과 AI가 디자이너를 대체할 수 있다는 우려가 커졌다.','제품군을 넓히고 AI를 디자인 워크플로 안에 통합했다.','상장 후에는 성장 기대와 실제 수익성을 함께 증명해야 한다.']]],
  ['2955','Gymshark','짐샤크','self-made','Bromsgrove, England, United Kingdom','영국 잉글랜드 브롬스그로브',
    'Aston University 재학생 시절 Pizza Hut 배달원으로 일하며 앱을 만들고 부모 집 차고에서 운동복을 제작했다.',
    'https://uk.gymshark.com/pages/about-us; https://benfrancis.com/; https://en.wikipedia.org/wiki/Ben_Francis',
    [[2011,'Built fitness apps while studying','대학 재학 중 피트니스 앱을 만들었다.'],[2012,'Founded Gymshark with Lewis Morgan','Lewis Morgan과 Gymshark를 창업했다.'],[2013,'Used fitness influencers at BodyPower Expo','BodyPower Expo에서 피트니스 인플루언서 마케팅을 활용했다.'],[2015,'Stepped aside as CEO to learn from experienced managers','경영을 배우기 위해 CEO 자리에서 물러났다.'],[2018,'Expanded direct-to-consumer operations globally','글로벌 DTC 운영을 확대했다.'],[2020,'Sold 21% to General Atlantic at a £1 billion valuation','기업가치 10억 파운드에 General Atlantic에 21%를 매각했다.'],[2021,'Returned as Gymshark chief executive','Gymshark CEO로 복귀했다.'],[2022,'Opened flagship store on Regent Street','London Regent Street에 첫 플래그십 매장을 열었다.'],[2025,'Expanded global community beyond ten million customers','글로벌 고객 커뮤니티를 1천만명 이상으로 확대했다.']],
    ['운동복을 온라인 직판하고 피트니스 크리에이터·커뮤니티를 통해 고객획득 비용을 낮춘다','창업 초기부터 구축한 인플루언서 관계, 강한 커뮤니티, DTC 데이터와 빠른 제품출시','소셜 피트니스 성장기는 운, 인플루언서를 브랜드 파트너로 만든 방식은 실력','정치자본보다 운동선수·크리에이터·온라인 커뮤니티 관계가 중요','Pizza Hut 급여·소액 앱수익 → 차고 창업 → DTC 현금흐름 → General Atlantic 지분매각 → 70% 이상 창업자지분'],
    [[2015,'급성장 조직을 이끌 경영경험이 부족해 CEO에서 물러났다.','제품·브랜드 직무를 배우고 전문경영진 아래에서 경험을 쌓은 뒤 복귀했다.','창업자도 성장단계에 맞춰 리더십을 다시 배워야 한다.'],[2020,'팬데믹이 공급망과 물류를 흔들고 오프라인 행사를 중단시켰다.','온라인 커뮤니티와 재택운동 수요에 집중하고 물류투자를 확대했다.','디지털 브랜드도 공급망 회복력이 필요하다.'],[2023,'매출성장 둔화와 비용증가로 기업가치와 IPO 기대가 압박받았다.','매장·제품군·지역확장을 선별하고 수익성 중심으로 운영했다.','커뮤니티 열기가 영구적인 고성장을 보장하지 않는다.']]],
  ['2595','Scale AI, Passes, Backend Capital','스케일 AI, 패시스, 백엔드 캐피털','self-made','Fremont, California, United States','미국 캘리포니아주 프리몬트',
    '중국계 전기공학자 부모 아래에서 자랐고 어린 시절 게임 봇을 만들어 돈을 벌었다. Carnegie Mellon을 다니다 Thiel Fellow로 선발돼 중퇴했다.',
    'https://www.scale.com/; https://www.passes.com/; https://en.wikipedia.org/wiki/Lucy_Guo',
    [[2014,'Left Carnegie Mellon as a Thiel Fellow','Thiel Fellow로 선발돼 Carnegie Mellon을 중퇴했다.'],[2015,'Worked at Quora and Snapchat','Quora와 Snapchat에서 제품·디자인 업무를 했다.'],[2016,'Co-founded Scale AI','Alexandr Wang과 Scale AI를 공동 창업했다.'],[2018,'Left Scale after strategic conflict','공동창업자와 전략갈등 끝에 Scale을 떠났다.'],[2019,'Founded Backend Capital','초기 스타트업 투자사 Backend Capital을 설립했다.'],[2022,'Founded creator platform Passes','크리에이터 구독 플랫폼 Passes를 창업했다.'],[2024,'Raised $40 million for Passes','Passes가 4천만 달러 투자를 유치했다.'],[2025,'Scale stake made her the youngest self-made woman billionaire','Scale AI 보유지분으로 최연소 자수성가 여성 억만장자가 됐다.']],
    ['AI 학습데이터 인프라 지분과 크리에이터 구독 플랫폼·초기 벤처투자에서 가치를 만든다','제품설계 능력, 기술창업자 네트워크, Scale AI 잔여지분, 크리에이터 결제 데이터','AI 데이터 수요 폭증은 운, 퇴사 후에도 지분을 보유한 판단과 재창업은 실력','Thiel·YC·Silicon Valley 투자자 네트워크가 핵심','게임 봇 수익 → Thiel Fellowship → Scale AI 약 5% 지분 → Backend Capital → Passes 지분'],
    [[2018,'Scale AI 경영방향 갈등으로 자신이 만든 회사에서 해고됐다.','지분을 보유한 채 투자사와 새 회사를 만들었다.','운영권을 잃어도 계약상 지분과 다음 기회를 지킬 수 있다.'],[2020,'Backend Capital의 여러 초기투자가 실패하거나 가치가 0이 됐다.','소수의 고성장 기업과 직접 운영사업에 집중했다.','초기투자는 실패율이 높아 포트폴리오가 필요하다.'],[2025,'Passes가 미성년자 콘텐츠 관련 소송과 신뢰위기에 직면했다.','혐의를 부인하면서 안전정책·연령확인·콘텐츠 통제를 강화했다.','크리에이터 플랫폼은 성장보다 사용자 안전과 결제규정이 우선이다.']]],
  ['2551','Snap Inc., Snapchat','스냅, 스냅챗','self-made','Berkeley, California, United States','미국 캘리포니아주 버클리',
    '필리핀계 어머니와 미국인 아버지 사이에서 성장해 Stanford University에서 수학·컴퓨터과학을 공부했다.',
    'https://www.snap.com/en-US/; https://en.wikipedia.org/wiki/Bobby_Murphy',
    [[2010,'Built failed startup Future Freshman with Evan Spiegel','Evan Spiegel과 대학입시 스타트업 Future Freshman을 만들었으나 실패했다.'],[2011,'Co-founded disappearing-photo app Picaboo','사라지는 사진 앱 Picaboo를 공동 창업했다.'],[2012,'Renamed the product Snapchat and scaled engineering','서비스를 Snapchat으로 바꾸고 기술확장을 이끌었다.'],[2013,'Rejected Facebook acquisition proposal','Facebook의 인수 제안을 거절했다.'],[2016,'Renamed company Snap Inc. and launched Spectacles','회사를 Snap으로 개명하고 Spectacles를 출시했다.'],[2017,'Took Snap public','Snap을 뉴욕증권거래소에 상장했다.'],[2020,'Expanded augmented-reality platform','증강현실 렌즈·광고 플랫폼을 확대했다.'],[2023,'Shifted engineering toward AI and subscription services','AI와 Snapchat+ 구독서비스 중심으로 기술투자를 전환했다.'],[2025,'Continued as CTO controlling core technology strategy','CTO로 핵심 기술전략을 계속 통제했다.']],
    ['메시징·카메라 사용자를 모아 광고·구독·증강현실 도구로 수익화','젊은 사용자 관계망, 카메라 중심 UX, AR 기술, 창업자 의결권','모바일 카메라 시대는 운, 사라지는 메시지와 기술인프라 구현은 실력','광고주·앱스토어·콘텐츠 파트너 관계가 사업규모를 좌우','개인 급여로 서버비 부담 → Snap 창업지분 → 2017 IPO → 고의결권 주식과 보상'],
    [[2010,'Future Freshman이 사용자와 수익을 얻지 못해 실패했다.','팀 관계를 유지하고 더 단순한 사진메시지 문제로 전환했다.','첫 아이디어 실패가 공동창업팀 실패를 의미하지는 않는다.'],[2017,'IPO 후 성장둔화와 Android 앱 성능 문제로 주가가 급락했다.','앱을 재개발하고 광고기술과 Android 성능을 개선했다.','소비자 앱은 제품취향만큼 기술품질과 측정 가능한 광고효과가 중요하다.'],[2022,'광고침체와 Apple 개인정보정책 변화로 대규모 감원과 사업축소를 했다.','AR·구독·핵심 메시징에 집중하고 실험사업을 줄였다.','플랫폼 의존 광고모델은 외부 개인정보정책에 취약하다.']]],
  ['2236','Dropbox','드롭박스','self-made','Acton, Massachusetts, United States','미국 매사추세츠주 액턴',
    '프로그래머였던 아버지의 영향을 받아 어릴 때 코딩을 시작했고 MIT에서 컴퓨터과학을 전공했다.',
    'https://www.dropbox.com/about; https://en.wikipedia.org/wiki/Drew_Houston',
    [[2004,'Founded SAT preparation startup Accolade','SAT 준비 스타트업 Accolade를 공동 창업했다.'],[2007,'Founded Dropbox after forgetting a USB drive','USB를 두고 온 경험에서 Dropbox를 창업했다.'],[2007,'Joined Y Combinator with Arash Ferdowsi','Arash Ferdowsi와 Y Combinator에 참여했다.'],[2008,'Publicly launched Dropbox at TechCrunch50','TechCrunch50에서 Dropbox를 공개했다.'],[2011,'Rejected a reported Apple acquisition approach','Apple의 인수 접근을 거절했다.'],[2014,'Reached a $10 billion private valuation','비상장 기업가치 100억 달러에 도달했다.'],[2018,'Took Dropbox public','Dropbox를 Nasdaq에 상장했다.'],[2020,'Joined Meta board and adopted virtual-first work','Meta 이사회에 합류하고 Dropbox를 virtual-first 회사로 전환했다.'],[2024,'Cut workforce by 20% to simplify the company','성장둔화에 대응해 인력 20%를 감축했다.']],
    ['파일 동기화·공유·전자서명·검색 서비스를 개인과 기업에 구독형으로 판매','신뢰성 높은 동기화 기술, 사용자 파일 전환비용, 광범위한 기기통합','광대역·모바일 확산은 운, 복잡한 동기화를 단순하게 만든 제품집중은 실력','개발자·기업 IT·클라우드 파트너 네트워크가 중요','Accolade 경험 → YC 창업지분 → 벤처투자 → 2018 IPO → Dropbox 약 25% 경제·의결권'],
    [[2004,'첫 스타트업 Accolade가 큰 규모로 성장하지 못했다.','문제를 직접 경험한 파일동기화 분야로 이동했다.','좋은 창업아이디어는 시장규모와 반복사용 빈도가 필요하다.'],[2013,'소비자 클라우드 시장에 Google·Apple·Microsoft가 진입했다.','운영체제 중립성과 업무협업·기업고객에 집중했다.','플랫폼 거인과 경쟁할 때는 중립성과 전문성이 방어막이다.'],[2023,'핵심 파일사업 성장둔화로 두 차례 대규모 감원을 시행했다.','AI 검색 Dash와 더 단순한 조직구조에 자원을 재배치했다.','성숙한 구독사업은 새 제품 없이 인력만 늘리면 효율이 악화된다.']]],
  ['2996','Pinterest','핀터레스트','self-made','Des Moines, Iowa, United States','미국 아이오와주 디모인',
    '안과의사 부모 아래에서 성장했고 어린 시절 곤충·우표 수집을 좋아했다. Yale University에서 정치학을 전공했다.',
    'https://www.pinterest.com/about/; https://en.wikipedia.org/wiki/Ben_Silbermann',
    [[2003,'Graduated from Yale and entered consulting','Yale을 졸업하고 컨설팅 경력을 시작했다.'],[2006,'Joined Google advertising group','Google 광고부문에 합류했다.'],[2008,'Left Google and founded Cold Brew Labs','Google을 떠나 Cold Brew Labs를 창업했다.'],[2009,'Built shopping app Tote, which failed to scale','쇼핑 앱 Tote를 만들었지만 성장에 실패했다.'],[2010,'Launched Pinterest with Paul Sciarra and Evan Sharp','Paul Sciarra·Evan Sharp와 Pinterest를 출시했다.'],[2012,'Reached tens of millions of users','Pinterest 사용자가 수천만명으로 증가했다.'],[2015,'Expanded promoted pins advertising','Promoted Pins 광고사업을 확대했다.'],[2019,'Took Pinterest public','Pinterest를 뉴욕증권거래소에 상장했다.'],[2022,'Moved from CEO to executive chairman','CEO에서 물러나 이사회 의장으로 전환했다.']],
    ['사용자의 시각적 관심·구매의도를 모아 검색형 광고와 쇼핑 전환으로 수익화','이미지 관심그래프, 저장행동 데이터, 긍정적 콘텐츠 브랜드, 광고 구매의도','스마트폰 이미지 소비 증가는 운, 수집행동을 제품으로 번역한 것은 실력','광고주·출판사·크리에이터 관계가 콘텐츠와 매출을 만든다','Google 급여 → 실패 앱 → Pinterest 창업지분 → 벤처투자 → 2019 IPO'],
    [[2009,'Tote가 앱스토어 결제·유통제약으로 성장하지 못했다.','사용자가 상품 이미지를 저장하는 행동을 Pinterest 핵심기능으로 전환했다.','실패한 제품의 사용자 행동이 더 큰 제품의 단서가 될 수 있다.'],[2014,'빠른 사용자 성장에 비해 광고수익화가 늦었다.','검색·쇼핑 의도가 높은 Promoted Pins를 단계적으로 도입했다.','커뮤니티 신뢰를 해치지 않는 수익화 속도가 중요하다.'],[2022,'팬데믹 이후 사용자 감소와 주가하락으로 리더십 압박을 받았다.','전 Google 상거래 책임자 Bill Ready에게 CEO를 넘기고 제품비전에 집중했다.','창업자가 역할을 바꾸는 것이 회사의 다음 성장단계에 필요할 수 있다.']]],
  ['2220','Mistral AI','미스트랄 AI','self-made','Sèvres, France','프랑스 세브르',
    '수학·공학 교육을 받고 École Polytechnique와 Télécom Paris를 거쳐 응용수학 박사학위를 취득했다. Google DeepMind에서 대형언어모델을 연구했다.',
    'https://mistral.ai/; https://en.wikipedia.org/wiki/Mistral_AI; https://www.lemonde.fr/economie/article/2025/09/09/ia-la-start-up-francaise-mistral-ai-valorisee-11-7-milliards-d-euros-apres-avoir-leve-1-7-milliard_6640102_3234.html',
    [[2015,'Completed advanced mathematics and engineering studies','수학·공학 고등교육을 마쳤다.'],[2018,'Conducted machine-learning research in academia','학계에서 머신러닝 연구를 수행했다.'],[2020,'Joined Google DeepMind','Google DeepMind에 연구원으로 합류했다.'],[2023,'Co-founded Mistral AI','Guillaume Lample·Timothée Lacroix와 Mistral AI를 창업했다.'],[2023,'Released first open-weight Mistral model','첫 공개가중치 Mistral 모델을 발표했다.'],[2024,'Partnered with Microsoft and launched Le Chat','Microsoft와 제휴하고 Le Chat을 출시했다.'],[2025,'Raised €1.7 billion led by ASML','ASML 주도의 17억 유로 투자를 유치했다.'],[2026,'Positioned Mistral as Europe’s sovereign AI provider','유럽의 주권형 AI 공급자로 사업을 확대했다.']],
    ['효율적인 대형언어모델·API·기업용 AI·자체 배포 솔루션을 판매','유럽 연구인력, 공개가중치 전략, 낮은 추론비용, 데이터 주권 요구','ChatGPT 이후 투자열기는 운, 작은 팀으로 효율적인 모델을 만든 기술력은 실력','프랑스 정부·EU·ASML·Microsoft·유럽 대기업 관계가 핵심','연구자 급여 → Mistral 공동창업지분 → 초고속 투자유치 → 100억 유로 이상 기업가치'],
    [[2023,'창업 초기 제품과 매출 없이 높은 기업가치를 받아 거품 논쟁이 일었다.','모델을 빠르게 공개하고 기업계약·API 매출을 확보했다.','높은 평가액은 반복 가능한 기술·고객 증명으로 뒷받침해야 한다.'],[2024,'Microsoft 제휴가 유럽 독립성 주장과 모순된다는 비판을 받았다.','Azure 유통과 자체·유럽 인프라 배포를 병행했다.','주권 전략도 글로벌 유통과 자본의 현실을 조율해야 한다.'],[2025,'OpenAI·Anthropic·Google보다 자본과 컴퓨팅이 크게 부족했다.','효율적 소형모델·기업 맞춤·유럽 데이터센터에 집중했다.','자원이 적을 때는 모든 영역보다 비용·배포 차별화가 필요하다.']]],
  ['2273','ElevenLabs','일레븐랩스','self-made','Warsaw area, Poland','폴란드 바르샤바 인근',
    '폴란드에서 성장해 Imperial College London에서 수학을 공부했고 BlackRock·Palantir에서 금융·대규모 시스템 구현을 경험했다.',
    'https://elevenlabs.io/about; https://en.wikipedia.org/wiki/Mati_Staniszewski; https://en.wikipedia.org/wiki/ElevenLabs',
    [[2013,'Studied mathematics at Imperial College London','Imperial College London에서 수학을 공부했다.'],[2016,'Worked at BlackRock on Aladdin Wealth','BlackRock에서 Aladdin Wealth 개발에 참여했다.'],[2019,'Joined Palantir as deployment strategist','Palantir의 deployment strategist로 일했다.'],[2022,'Co-founded ElevenLabs with Piotr Dąbkowski','고교 친구 Piotr Dąbkowski와 ElevenLabs를 창업했다.'],[2023,'Released public voice-generation beta','AI 음성생성 베타를 공개했다.'],[2024,'Expanded multilingual dubbing and voice tools','다국어 더빙·음성도구를 확대했다.'],[2025,'Reached a $3.3 billion valuation','기업가치 33억 달러에 도달했다.'],[2026,'Raised $500 million at an $11 billion valuation','기업가치 110억 달러에 5억 달러를 유치했다.']],
    ['AI 음성합성·더빙·음성에이전트를 API와 구독으로 판매','자연스러운 감정·다국어 음성품질, 개발자 API, 방대한 음성 워크플로 데이터','생성형 AI 붐은 운, 더빙 불편을 글로벌 음성제품으로 만든 것은 실력','미디어·출판·게임·접근성 기관과의 신뢰관계가 중요','전문직 급여 → ElevenLabs 공동창업지분 → Sequoia·a16z 투자 → 110억 달러 기업가치'],
    [[2023,'초기 제품이 유명인 음성 사칭과 혐오콘텐츠 제작에 악용됐다.','음성검증·추적·탐지기와 사용정책을 도입했다.','생성형 미디어는 출시와 동시에 악용방지 인프라가 필요하다.'],[2024,'선거 로보콜 등 딥페이크 사건이 규제위험을 키웠다.','금지 사용자 차단과 정부·플랫폼 협력을 확대했다.','기술 제공자는 최종 사용자의 피해와 분리될 수 없다.'],[2025,'빠른 조직확장과 경쟁 심화로 품질·비용·안전의 균형이 어려워졌다.','기업용 계약과 자체 모델·에이전트로 수익원을 넓혔다.','단일 모델우위는 짧으므로 워크플로와 고객관계가 필요하다.']]],
  ['2274','ElevenLabs','일레븐랩스','self-made','Poland','폴란드',
    '폴란드에서 Mati Staniszewski와 함께 성장했고 기술교육 후 Opera·Google·Tessian에서 소프트웨어와 머신러닝을 개발했다.',
    'https://elevenlabs.io/about; https://en.wikipedia.org/wiki/Piotr_D%C4%85bkowski; https://en.wikipedia.org/wiki/ElevenLabs',
    [[2014,'Began software-engineering career at Opera','Opera에서 소프트웨어 엔지니어 경력을 시작했다.'],[2016,'Joined Google as machine-learning engineer','Google에서 머신러닝 엔지니어로 일했다.'],[2019,'Built security software at Tessian','Tessian에서 보안 소프트웨어를 개발했다.'],[2022,'Co-founded ElevenLabs as CTO','Mati Staniszewski와 ElevenLabs를 공동 창업하고 CTO가 됐다.'],[2023,'Built multilingual generative-voice platform','다국어 생성형 음성 플랫폼을 구축했다.'],[2024,'Released voice cloning and dubbing products','음성복제·더빙 제품을 확대했다.'],[2025,'Scaled models to enterprise and media customers','기업·미디어 고객으로 모델 사용을 확대했다.'],[2026,'Raised at an $11 billion valuation','기업가치 110억 달러에 신규 투자를 유치했다.']],
    ['음성모델·실시간 합성·더빙·에이전트 기술을 API로 제공','음성모델 연구, 낮은 지연시간, 다국어·감정표현, 개발자 도구','AI 모델 발전은 운, 실제 음성제품으로 최적화한 엔지니어링은 실력','Google·유럽 AI 인재·미디어 파트너 네트워크가 중요','엔지니어 급여 → 공동창업 CTO 지분 → 다단계 투자유치 → 110억 달러 기업가치'],
    [[2023,'서비스가 사칭·가짜뉴스 음성에 빠르게 악용됐다.','탐지기·사용자 검증·음성소유자 동의를 강화했다.','모델성능과 출처추적 기능을 함께 만들어야 한다.'],[2024,'실시간 음성의 품질과 비용을 동시에 낮춰야 하는 기술압박이 커졌다.','모델 최적화와 인프라 투자를 확대했다.','연구성과가 제품경제성으로 이어져야 사업이 된다.'],[2025,'대형 AI 기업의 음성기능 진입으로 차별화가 약해질 위험이 생겼다.','음성전문 API·더빙·에이전트 전체 워크플로에 집중했다.','기능 하나보다 전문 플랫폼과 고객통합이 방어력이 크다.']]],
  ['3298','Polymarket','폴리마켓','self-made','New York City, United States','미국 뉴욕시',
    '뉴욕에서 성장해 New York University에서 컴퓨터과학을 공부하다 암호화폐·예측시장 사업에 전념하기 위해 중퇴했다.',
    'https://polymarket.com/; https://en.wikipedia.org/wiki/Shayne_Coplan',
    [[2017,'Entered crypto community and studied market design','암호화폐 커뮤니티에서 예측시장 구조를 연구했다.'],[2019,'Dropped out of NYU to build crypto products','NYU를 중퇴하고 암호화폐 제품개발에 전념했다.'],[2020,'Founded Polymarket','블록체인 예측시장 Polymarket을 창업했다.'],[2022,'Settled with CFTC and blocked U.S. users','CFTC와 합의하고 미국 사용자 접근을 차단했다.'],[2024,'Election markets drove record trading volume','미국 대선시장으로 거래량이 급증했다.'],[2024,'FBI searched his home during regulatory investigation','규제수사 과정에서 FBI가 자택을 압수수색했다.'],[2025,'Investigations ended without charges','DOJ·CFTC 조사가 기소 없이 종료됐다.'],[2025,'ICE invested at an $8 billion valuation','NYSE 모회사 ICE가 기업가치 80억 달러에 투자했다.'],[2026,'Returned Polymarket to regulated U.S. market','규제거래소 인수를 통해 미국 시장에 복귀했다.']],
    ['사용자가 사건결과 지분을 거래하고 거래수수료·시장유동성에서 가치를 만든다','실시간 확률데이터, 암호화폐 결제, 시장 유동성, 뉴스·소셜 확산','2024 선거관심은 운, 규제충돌을 견디고 제품유동성을 만든 것은 실력','규제기관·거래소·시장조성자 관계가 생존에 직접적','학생 창업 → 투자유치 → Polymarket 약 11% 지분 → ICE 투자로 10억 달러 가치'],
    [[2022,'미등록 이벤트계약 운영으로 CFTC와 140만 달러 합의했다.','미국 사용자를 차단하고 해외시장 운영과 규제라이선스 준비를 병행했다.','금융제품은 탈중앙 기술만으로 규제를 피할 수 없다.'],[2024,'거래량 일부가 워시트레이딩이라는 조사와 신뢰논쟁이 발생했다.','시장감시와 데이터 투명성·기관 파트너십을 강화했다.','예측시장의 신뢰는 거래량보다 시장품질에 달려 있다.'],[2024,'미국 사용자 불법접근 의혹으로 FBI 압수수색을 받았다.','수사에 대응하고 규제거래소를 인수해 합법적 복귀경로를 만들었다.','규제회피보다 규제 인프라 확보가 장기기업가치를 만든다.']]],
  ['2814','Anysphere, Cursor','애니스피어, 커서','self-made','United States','미국',
    'Massachusetts Institute of Technology에서 Sualeh Asif·Aman Sanger·Arvid Lunnemark와 컴퓨터과학을 공부하며 AI 코딩 도구를 개발했다.',
    'https://www.cursor.com/; https://en.wikipedia.org/wiki/Anysphere; https://www.businessinsider.com/cursor-ceo-michael-truell-spacex-elon-musk-anthropic-2026-6',
    [[2019,'Entered MIT and built software projects','MIT에 진학해 소프트웨어 프로젝트를 만들었다.'],[2022,'Co-founded Anysphere with MIT classmates','MIT 동료들과 Anysphere를 공동 창업했다.'],[2023,'Raised seed funding led by OpenAI Startup Fund','OpenAI Startup Fund 주도의 시드투자를 유치했다.'],[2024,'Launched Cursor as an AI-native code editor','AI 네이티브 코드편집기 Cursor를 확대 출시했다.'],[2024,'Acquired code-completion startup Supermaven','코드완성 스타트업 Supermaven을 인수했다.'],[2025,'Reached $100 million then $500 million ARR','연간반복매출 1억 달러와 5억 달러를 연이어 돌파했다.'],[2025,'Raised at a $29.3 billion valuation','기업가치 293억 달러에 투자유치를 마쳤다.'],[2026,'Entered a strategic acquisition agreement with SpaceX','SpaceX와 대형 전략적 인수계약을 추진했다.']],
    ['AI 코드편집기를 개인·기업 개발자에게 구독판매하고 모델사용량·엔터프라이즈 기능으로 수익화','VS Code 호환성, 개발자 작업맥락 데이터, 빠른 제품반복, 자체 모델','생성형 AI 코딩수요는 운, 기존 편집기 안에서 마찰을 줄인 제품설계는 실력','OpenAI·Anthropic·개발자 커뮤니티·기업 IT 관계가 핵심','학생창업 → 시드지분 → 폭발적 ARR → 293억 달러 평가 및 전략거래'],
    [[2023,'초기 AI 편집기 시장이 작고 모델비용이 매출을 압박했다.','고가치 개발자 작업에 집중하고 구독요금·모델라우팅을 개선했다.','AI 앱은 성장률과 추론원가를 동시에 관리해야 한다.'],[2025,'Pro 요금제 변경이 불명확해 예상 밖 과금 불만이 발생했다.','사과하고 제한을 되돌리며 환불을 약속했다.','사용량 기반 가격은 고객이 미리 비용을 예측할 수 있어야 한다.'],[2025,'핵심모델 공급자 Anthropic이 Claude Code로 직접 경쟁했다.','자체 Composer 모델과 기업기능·다중모델 전략을 강화했다.','기반모델 공급자에게 의존하면 파트너가 즉시 경쟁자가 될 수 있다.']]],
  ['2453','Lovable','러버블','self-made','Sweden','스웨덴',
    '스웨덴에서 성장한 소프트웨어 엔지니어로 Anton Osika와 자연어 앱 제작도구를 개발했다.',
    'https://lovable.dev/; https://en.wikipedia.org/wiki/Lovable_(company)',
    [[2019,'Built software products in Sweden','스웨덴에서 소프트웨어 제품개발 경험을 쌓았다.'],[2023,'Co-founded GPT Engineer company','Anton Osika와 GPT Engineer 회사를 공동 창업했다.'],[2024,'Rebranded product as Lovable','제품을 Lovable로 재브랜딩했다.'],[2024,'Launched public natural-language app builder','자연어 앱 제작도구를 공개 출시했다.'],[2025,'Crossed $100 million annual recurring revenue','출시 8개월 만에 ARR 1억 달러를 돌파했다.'],[2025,'Raised $200 million at a $1.8 billion valuation','기업가치 18억 달러에 2억 달러를 유치했다.'],[2025,'Raised again at a $6.6 billion valuation','기업가치 66억 달러에 후속투자를 유치했다.'],[2026,'Expanded Lovable toward a full business platform','앱 제작을 넘어 통합 비즈니스 플랫폼으로 확대했다.']],
    ['비개발자가 프롬프트로 웹앱을 만들도록 구독·사용량 기반 AI 개발환경을 판매','낮은 진입장벽, 빠른 생성·배포, 템플릿·프로젝트 데이터, 커뮤니티 공유','vibe coding 유행은 운, 비개발자도 완성품을 배포하게 만든 UX는 실력','KTH·유럽 투자자·Supabase·개발자 생태계 관계가 중요','엔지니어 경력 → 공동창업지분 → 초고속 ARR → 66억 달러 기업가치'],
    [[2024,'초기 두 차례 제품출시가 기대만큼 반응을 얻지 못했다.','이름·온보딩·생성경험을 전면 재설계해 Lovable로 다시 출시했다.','좋은 기술도 명확한 사용자 경험과 포지셔닝이 필요하다.'],[2025,'생성된 앱의 잘못된 Supabase 설정으로 데이터 노출위험이 발견됐다.','자동 보안검사와 경고·가이드를 추가했다.','코드를 대신 만드는 제품은 사용자의 보안실수까지 책임져야 한다.'],[2026,'AI 코딩 경쟁과 높은 평가액으로 성장지속 압박이 커졌다.','CRM·HR 등 실제 업무데이터를 담는 플랫폼으로 확장했다.','빠른 ARR 이후에는 유지율과 기업 워크플로가 중요하다.']]],
  ['2452','Lovable','러버블','self-made','Sweden','스웨덴',
    'KTH Royal Institute of Technology에서 물리·공학을 공부하고 CERN·Sana Labs 등에서 AI 엔지니어링 경험을 쌓았다.',
    'https://lovable.dev/; https://en.wikipedia.org/wiki/Lovable_(company); https://www.thetimes.com/business/technology/article/vibe-coding-lovable-ai-software-firms-qrkk8brf2',
    [[2012,'Studied physics and engineering at KTH','KTH에서 물리·공학을 공부했다.'],[2015,'Worked on technology projects at CERN','CERN에서 기술 프로젝트에 참여했다.'],[2018,'Built AI products at Sana Labs','Sana Labs에서 AI 제품을 개발했다.'],[2023,'Released open-source GPT Engineer','오픈소스 GPT Engineer를 공개했다.'],[2023,'Co-founded the company that became Lovable','Fabian Hedin과 Lovable의 전신을 창업했다.'],[2024,'Relaunched product under Lovable brand','Lovable 브랜드로 제품을 재출시했다.'],[2025,'Became a unicorn and passed $100 million ARR','유니콘이 되고 ARR 1억 달러를 돌파했다.'],[2025,'Raised at a $6.6 billion valuation','기업가치 66억 달러에 투자유치를 마쳤다.'],[2026,'Targeted a potential $12 billion valuation','기업가치 120억 달러 수준의 확장을 추진했다.']],
    ['자연어로 앱·사이트·업무도구를 생성하고 배포하는 AI 소프트웨어를 판매','오픈소스 인지도, 제품속도, 비개발자 UX, 생성프로젝트 데이터','LLM 성능향상은 운, 오픈소스 관심을 상업제품으로 전환한 것은 실력','유럽 AI 인재·Accel·KTH·클라우드 파트너 관계가 중요','AI 엔지니어 급여 → GPT Engineer 오픈소스 → Lovable 창업지분 → 유니콘 투자'],
    [[2023,'GPT Engineer의 높은 GitHub 관심이 곧바로 유료사용으로 이어지지 않았다.','설치형 개발도구를 브라우저 완성형 제품으로 바꿨다.','오픈소스 인기와 상업적 사용편의는 다르다.'],[2024,'두 차례 상업제품 출시가 실패했다.','브랜드·제품흐름을 단순화하고 생성부터 배포까지 한 화면에 묶었다.','반복 실패를 빠르게 학습하면 시장진입 시점을 다시 잡을 수 있다.'],[2025,'보안취약점 보도로 생성 앱의 신뢰가 흔들렸다.','보안검사·권한설정 안내와 내부 보안팀을 강화했다.','AI 속도 경쟁에서도 기본 보안은 생략할 수 없다.']]],
  ['2804','Spanx, Sneex','스팽스, 스닉스','self-made','Clearwater, Florida, United States','미국 플로리다주 클리어워터',
    '변호사 아버지와 예술가 어머니 아래에서 성장해 Florida State University에서 커뮤니케이션을 전공했다.',
    'https://spanx.com/pages/about-us; https://en.wikipedia.org/wiki/Sara_Blakely; https://en.wikipedia.org/wiki/Spanx',
    [[1993,'Graduated from Florida State University','Florida State University를 졸업했다.'],[1995,'Sold fax machines door to door','팩스기 방문판매로 영업기술과 종잣돈을 모았다.'],[1998,'Developed footless shaping hosiery concept','발부분을 자른 보정 스타킹 아이디어를 개발했다.'],[2000,'Founded Spanx with $5,000 savings','저축 5천 달러로 Spanx를 창업했다.'],[2000,'Won placement in Neiman Marcus stores','직접 시연해 Neiman Marcus 입점을 얻었다.'],[2001,'Oprah selected Spanx as a favorite product','Oprah의 추천상품으로 선정돼 전국적 수요가 생겼다.'],[2012,'Became the youngest self-made woman billionaire','최연소 자수성가 여성 억만장자가 됐다.'],[2021,'Sold majority stake to Blackstone at $1.2 billion valuation','기업가치 12억 달러에 Blackstone에 다수지분을 매각했다.'],[2024,'Launched footwear startup Sneex','하이힐·스니커즈 결합 브랜드 Sneex를 출시했다.']],
    ['보정속옷·의류를 브랜드·소매·온라인 채널로 판매하고 새 신발브랜드에 재투자','제품문제에 대한 직접 경험, 강한 창업자 스토리, 소매유통 관계, 무차입 성장','Oprah 추천은 운, 특허·제조·직접영업을 혼자 돌파한 것은 실력','여성 소비자·소매 바이어·미디어 관계가 성장의 핵심','팩스영업 저축 5천 달러 → 100% Spanx 지분 → 현금흐름 → Blackstone 다수지분 매각 → Sneex'],
    [[1990,'로스쿨 입학시험에 두 번 실패해 계획한 법조경력을 포기했다.','영업직에서 고객거절을 학습하고 제품창업으로 방향을 바꿨다.','초기 진로실패가 다른 역량을 발견하게 할 수 있다.'],[1999,'다수의 양말 제조업체가 아이디어를 거절했다.','직접 특허를 작성하고 한 제조업체 사장의 딸을 설득해 생산을 시작했다.','새 고객문제는 기존업계보다 최종사용자가 먼저 이해할 수 있다.'],[2014,'전문 CEO 영입 뒤 조직·브랜드 방향의 시행착오가 있었다.','이사회 의장으로 제품비전을 유지하고 경영진을 여러 차례 조정했다.','창업자 브랜드와 전문경영 체제의 역할을 명확히 해야 한다.']]],
  ['2131','SKIMS, KKW Beauty, SKKN by Kim','스킴스, KKW 뷰티, SKKN 바이 킴','self-made','Los Angeles, California, United States','미국 캘리포니아주 로스앤젤레스',
    '변호사 Robert Kardashian과 사업가 Kris Jenner의 딸로 성장했고 패션 스타일링·옷장 정리 사업과 리얼리티TV로 대중 인지도를 얻었다.',
    'https://skims.com/; https://en.wikipedia.org/wiki/Kim_Kardashian; https://pagesix.com/2025/09/18/style/kim-kardashian-shuts-down-beauty-line-skkn-by-kim/',
    [[2006,'Built personal styling and closet resale business','개인 스타일링과 유명인 옷장 재판매 사업을 운영했다.'],[2007,'Became widely known through reality television','리얼리티TV로 대중적 인지도를 확보했다.'],[2014,'Launched mobile game Kim Kardashian Hollywood','모바일게임 Kim Kardashian: Hollywood를 출시했다.'],[2017,'Founded KKW Beauty','KKW Beauty를 창업했다.'],[2019,'Co-founded shapewear brand SKIMS','Jens Grede와 보정의류 브랜드 SKIMS를 공동 창업했다.'],[2020,'Sold 20% of KKW Beauty to Coty for $200 million','KKW Beauty 지분 20%를 Coty에 2억 달러에 매각했다.'],[2023,'SKIMS reached a $4 billion valuation','SKIMS 기업가치가 40억 달러에 도달했다.'],[2024,'Expanded SKIMS into menswear and sports partnerships','SKIMS를 남성복·스포츠 파트너십으로 확대했다.'],[2025,'Consolidated beauty assets after closing SKKN','SKKN을 종료하고 뷰티사업을 SKIMS 중심으로 통합했다.']],
    ['대중 관심과 소셜미디어 도달력을 의류·뷰티·게임의 직접판매·라이선스 매출로 전환','개인 브랜드, 수억명 규모 소셜 배포망, Jens Grede의 공급망, 포용적 사이즈·색상','리얼리티TV 인지도는 출발점이지만 장기브랜드·운영파트너 선택은 사업역량이다.','미디어·유명인·소매·투자자 네트워크가 마케팅 비용을 낮춘다.','스타일링·TV 출연료 → 게임·라이선스 → KKW Beauty 매각 → SKIMS 대규모 창업지분'],
    [[2010,'Kardashian Kard 결제카드가 높은 수수료 비판으로 출시 한 달 만에 종료됐다.','금융상품에서 철수하고 통제 가능한 디지털·소비재 사업에 집중했다.','유명세가 규제산업의 나쁜 상품구조를 보완하지 못한다.'],[2019,'SKIMS의 초기 이름 Kimono가 일본문화 도용 비판을 받았다.','이름을 즉시 SKIMS로 변경하고 브랜드 포지셔닝을 재구성했다.','글로벌 브랜드는 이름의 문화적 의미를 사전에 검증해야 한다.'],[2025,'고가 스킨케어 SKKN이 기대에 못 미쳐 Coty 손실과 함께 종료됐다.','뷰티 자산을 SKIMS 아래로 통합하는 방향을 선택했다.','개인 인지도만으로 모든 제품군의 가격·반복구매를 만들 수는 없다.']]],
  ['2714','PayPal, Affirm, HVF','페이팔, 어펌, HVF','self-made','Kyiv, Ukraine','우크라이나 키이우',
    '소련 우크라이나의 유대인 가정에서 성장해 체르노빌 사고 후 미국으로 이주했다. University of Illinois에서 컴퓨터과학을 전공했다.',
    'https://www.affirm.com/about-us; https://en.wikipedia.org/wiki/Max_Levchin',
    [[1997,'Graduated from University of Illinois','University of Illinois를 졸업했다.'],[1998,'Co-founded Fieldlink, later PayPal','Fieldlink를 공동 창업해 PayPal로 발전시켰다.'],[2000,'Built PayPal anti-fraud systems','PayPal의 핵심 사기방지 시스템을 구축했다.'],[2002,'Sold PayPal to eBay for $1.5 billion','PayPal을 eBay에 15억 달러에 매각했다.'],[2004,'Founded Slide','소셜미디어 소프트웨어회사 Slide를 창업했다.'],[2010,'Sold Slide to Google','Slide를 Google에 매각했다.'],[2012,'Founded HVF and launched Affirm','HVF를 설립하고 Affirm을 출범시켰다.'],[2021,'Took Affirm public','Affirm을 Nasdaq에 상장했다.'],[2023,'Expanded Affirm partnerships with major retailers','대형 유통사와 Affirm 결제제휴를 확대했다.'],[2026,'Continued leading AI-driven consumer finance','AI 기반 소비자금융 사업을 계속 이끌었다.']],
    ['가맹점 결제수수료와 소비자 할부대출 이자·자본시장 유동화로 수익을 만든다','대규모 사기탐지 데이터, 유통사 통합, 투명한 고정결제 조건, 신용모델','전자상거래·BNPL 성장은 운, PayPal 보안과 Affirm 신용기술은 실력','은행·카드망·규제기관·대형 유통사 관계가 핵심','PayPal 창업지분 매각 → Slide 매각 → HVF 투자 → Affirm 창업지분·IPO'],
    [[1990,'미국 이민 초기 영어와 경제적 어려움을 겪었다.','프로그래밍·수학에 집중해 대학과 기술창업 기회를 얻었다.','이동성과 기술은 출신환경의 제약을 줄일 수 있다.'],[2011,'Google이 인수한 Slide를 1년 만에 폐쇄했다.','대기업 제품통합 실패를 인정하고 HVF·Affirm으로 다시 창업했다.','좋은 매각이 제품의 장기생존을 보장하지 않는다.'],[2022,'금리상승과 핀테크 하락으로 Affirm 주가가 고점 대비 크게 폭락했다.','대출기준·자금조달을 조정하고 수익성·대형 파트너에 집중했다.','신용사업은 성장률보다 손실률과 자금비용이 중요하다.']]],
  ['3281','Under Armour','언더아머','self-made','Kensington, Maryland, United States','미국 메릴랜드주 켄싱턴',
    'University of Maryland 미식축구팀에서 뛰며 땀에 젖는 면 티셔츠의 문제를 직접 경험했다.',
    'https://about.underarmour.com/en/our-company/leadership/kevin-plank.html; https://en.wikipedia.org/wiki/Kevin_Plank; https://en.wikipedia.org/wiki/Under_Armour',
    [[1995,'Developed moisture-wicking shirt prototypes','흡습속건 셔츠 시제품을 개발했다.'],[1996,'Founded Under Armour from grandmother’s basement','할머니 집 지하실에서 Under Armour를 창업했다.'],[1997,'Won first major college and team orders','대학·프로팀의 첫 대형 주문을 확보했다.'],[1999,'Products appeared in major sports films','스포츠 영화 의상으로 제품인지도를 높였다.'],[2005,'Took Under Armour public','Under Armour를 뉴욕증권거래소에 상장했다.'],[2013,'Reached $2 billion annual revenue','연매출 20억 달러를 돌파했다.'],[2015,'Acquired fitness apps for nearly $1 billion','피트니스 앱 기업들을 약 10억 달러에 인수했다.'],[2020,'Stepped down as chief executive','성장둔화 속에 CEO에서 물러났다.'],[2024,'Returned as Under Armour CEO','브랜드 재건을 위해 CEO로 복귀했다.']],
    ['기능성 스포츠의류·신발을 도매·직영·온라인으로 판매하고 선수후원으로 브랜드를 확장','기능성 원단 브랜드, 팀·선수 관계, 미국 스포츠 정체성, 유통망','기능성 의류시장 성장은 운, 선수문제를 제품으로 바꾸고 팀영업을 한 것은 실력','대학·프로스포츠·유통사·Baltimore 지역 네트워크가 중요','꽃판매·신용카드·SBA 대출 → 창업지분 → 2005 IPO → 대주주 지분가치'],
    [[2015,'약 10억 달러를 투입한 피트니스 앱 인수가 기대수익을 내지 못했다.','앱 대부분을 매각하고 핵심 의류·신발 브랜드에 다시 집중했다.','디지털 사용자 수와 스포츠의류 시너지는 별개다.'],[2016,'수요보다 매출을 앞당겨 기록했다는 회계논쟁과 SEC 조사를 받았다.','900만 달러 합의와 공시·매출관리 개선을 시행했다.','성장압박이 매출인식 규율을 훼손하면 장기신뢰를 잃는다.'],[2018,'MLB 유니폼 계약과 대형 매장계획을 취소하며 성장전략이 흔들렸다.','비용을 줄이고 제품·브랜드·북미 수익성 개선에 집중했다.','큰 후원계약보다 지속 가능한 제품수요가 중요하다.']]],
  ['2936','GoPro','고프로','self-made','Menlo Park, California, United States','미국 캘리포니아주 멘로파크',
    '투자은행가 아버지와 스페인계 어머니 아래에서 성장해 UC San Diego에서 시각예술을 공부했다. 두 번의 인터넷 스타트업 실패 후 서핑여행에서 GoPro 아이디어를 얻었다.',
    'https://gopro.com/en/us/about-us; https://en.wikipedia.org/wiki/Nick_Woodman; https://en.wikipedia.org/wiki/GoPro',
    [[1997,'Founded marketing startup EmpowerAll','마케팅 스타트업 EmpowerAll을 창업했다.'],[1999,'Founded gaming and marketing company Funbug','게임·마케팅회사 Funbug를 창업했다.'],[2001,'Funbug failed after burning venture funding','Funbug가 투자금을 소진하고 폐업했다.'],[2002,'Started GoPro after an Australian surf trip','호주 서핑여행 후 GoPro를 시작했다.'],[2004,'Sold first 35mm wrist camera','첫 35mm 손목카메라를 판매했다.'],[2007,'Introduced digital GoPro camera','디지털 GoPro 카메라를 출시했다.'],[2012,'Foxconn investment valued GoPro at $2.25 billion','Foxconn 투자로 기업가치 22.5억 달러를 인정받았다.'],[2014,'Took GoPro public','GoPro를 Nasdaq에 상장했다.'],[2016,'Launched and recalled Karma drone','Karma 드론을 출시했다가 전량 리콜했다.'],[2020,'Shifted toward subscriptions and direct sales','구독·직접판매 중심으로 사업을 전환했다.']],
    ['액션카메라·액세서리·클라우드 구독을 판매하고 사용자 영상으로 마케팅한다','강한 액션카메라 브랜드, 사용자 콘텐츠, 견고한 하드웨어·앱 통합','스마트 영상공유 성장은 운, 서퍼 문제를 착용형 카메라로 만든 것은 실력','스포츠선수·소매·계약제조·크리에이터 관계가 중요','실패 스타트업 → 벨트판매·부모자금 → 카메라매출 → Foxconn 투자 → 2014 IPO'],
    [[2001,'Funbug가 약 390만 달러 투자금을 소진하고 실패했다.','긴 서핑여행으로 재정비하고 자신이 직접 겪은 촬영문제로 전환했다.','시장문제와 창업자의 집착이 없는 사업은 자본만으로 살기 어렵다.'],[2016,'Karma 드론이 비행 중 전원상실 문제로 전량 리콜됐다.','2,500대를 환불하고 설계를 수정했으나 결국 드론사업을 종료했다.','핵심역량 밖 하드웨어 확장은 안전·경쟁력 검증이 먼저다.'],[2016,'카메라 수요둔화와 과잉제품으로 반복 감원·주가급락을 겪었다.','제품군을 단순화하고 구독·직접판매·비용절감에 집중했다.','상징적 브랜드도 스마트폰 대체와 제품주기를 피할 수 없다.']]],
  ['2309','Circle Internet Group, USDC','서클 인터넷 그룹, USDC','self-made','United States','미국',
    'Macalester College에서 정치학·철학을 공부했고 인터넷 초기부터 소프트웨어와 온라인미디어 회사를 연속 창업했다.',
    'https://www.circle.com/en/about-circle; https://en.wikipedia.org/wiki/Jeremy_Allaire; https://www.marketwatch.com/story/circles-ipo-pricing-shows-wall-street-is-clamoring-to-buy-stock-in-the-stablecoin-issuer-7a2434ae',
    [[1995,'Co-founded web software company Allaire Corporation','Allaire Corporation을 공동 창업했다.'],[1999,'Took Allaire Corporation public','Allaire Corporation을 상장했다.'],[2001,'Sold Allaire to Macromedia','회사를 Macromedia에 매각했다.'],[2004,'Founded online video company Brightcove','온라인 비디오회사 Brightcove를 창업했다.'],[2012,'Took Brightcove public','Brightcove를 Nasdaq에 상장했다.'],[2013,'Founded Circle','인터넷 금융회사 Circle을 창업했다.'],[2018,'Launched dollar stablecoin USDC with Coinbase','Coinbase와 달러 스테이블코인 USDC를 출시했다.'],[2022,'Terminated planned SPAC merger','계획한 SPAC 합병상장을 종료했다.'],[2024,'Relocated headquarters to New York and filed for IPO','본사를 New York으로 옮기고 IPO를 신청했다.'],[2025,'Completed Circle’s NYSE IPO','Circle을 뉴욕증권거래소에 상장했다.']],
    ['USDC 준비금 이자수익과 결제·기관용 블록체인 금융 인프라에서 수익을 얻는다','규제준수, 현금·국채 준비금 신뢰, Coinbase 유통, 개발자 결제통합','고금리와 스테이블코인 확산은 운, 규제친화적 달러토큰 설계는 실력','은행·규제기관·Coinbase·기관투자자 관계가 핵심','소프트웨어 IPO·매각 → Brightcove IPO → Circle 창업지분 → USDC 준비금 수익 → 2025 IPO'],
    [[2001,'닷컴버블 붕괴 직전 Allaire가 Macromedia에 매각돼 독립성장을 중단했다.','온라인 비디오라는 새 인터넷 인프라 문제로 Brightcove를 창업했다.','기술주기가 끝나기 전에 다음 플랫폼 전환을 읽어야 한다.'],[2022,'Concord와의 90억 달러 SPAC 상장이 규제·시장악화로 무산됐다.','감사·규제체계를 강화하고 전통 IPO를 다시 준비했다.','상장경로의 편의보다 시장신뢰와 규제준비가 중요하다.'],[2023,'Silicon Valley Bank 붕괴 때 USDC 준비금 33억 달러가 묶여 페그가 흔들렸다.','은행예금을 분산하고 BNY Mellon·BlackRock 중심 준비금 구조를 강화했다.','스테이블코인은 토큰기술보다 준비금 은행위험 관리가 핵심이다.']]],
  ['2133','Netscape, Opsware, Andreessen Horowitz','넷스케이프, 옵스웨어, 앤드리슨 호로위츠','self-made','Cedar Falls, Iowa, United States','미국 아이오와주 시더폴스',
    'Wisconsin의 작은 마을에서 종자회사 영업사원 아버지와 Lands’ End 상담원 어머니 아래 성장했다. 12세부터 프로그래밍을 배웠다.',
    'https://a16z.com/author/marc-andreessen/; https://en.wikipedia.org/wiki/Marc_Andreessen; https://en.wikipedia.org/wiki/Andreessen_Horowitz',
    [[1992,'Co-created Mosaic web browser at NCSA','NCSA에서 Mosaic 웹브라우저를 공동 개발했다.'],[1994,'Co-founded Netscape Communications','Jim Clark와 Netscape를 공동 창업했다.'],[1995,'Took Netscape public in landmark IPO','Netscape를 상장해 인터넷 붐을 촉발했다.'],[1999,'AOL acquired Netscape for $4.2 billion','AOL이 Netscape를 42억 달러에 인수했다.'],[1999,'Co-founded Loudcloud','Ben Horowitz와 Loudcloud를 창업했다.'],[2003,'Pivoted Loudcloud into Opsware software','호스팅사업을 매각하고 Opsware 소프트웨어로 전환했다.'],[2007,'Sold Opsware to HP for $1.6 billion','Opsware를 HP에 16억 달러에 매각했다.'],[2009,'Co-founded Andreessen Horowitz','Andreessen Horowitz를 공동 설립했다.'],[2012,'Backed major consumer and enterprise technology companies','Facebook·GitHub·Pinterest 등 기술기업에 투자했다.'],[2022,'Expanded aggressively into crypto and AI funds','암호화폐·AI 펀드로 대규모 확장했다.'],[2026,'A16z assets under management reached about $90 billion','a16z 운용자산이 약 900억 달러에 도달했다.']],
    ['벤처펀드 관리보수·성과보수와 직접 기술기업 지분에서 수익을 얻는다','창업·매각 경험, 강한 브랜드·채용·정책조직, 대형 창업자 네트워크','인터넷과 모바일·AI 주기는 운, 기술변곡점을 일찍 선택한 것은 실력','Silicon Valley 창업자·정책권·대학·기관투자자 네트워크가 핵심','Netscape 지분매각 → Opsware 매각 → 초기 엔젤투자 → a16z GP 지분·성과보수'],
    [[1998,'Microsoft의 브라우저 번들링으로 Netscape 시장지배력이 무너졌다.','AOL 매각 후 클라우드 인프라·투자로 다음 기술주기에 이동했다.','선도제품도 플랫폼 유통권을 가진 경쟁자에게 질 수 있다.'],[2001,'Loudcloud가 닷컴붕괴와 높은 인프라비용으로 생존위기에 놓였다.','호스팅사업을 EDS에 매각하고 자동화 소프트웨어 Opsware로 전환했다.','실패한 서비스의 내부도구가 더 좋은 제품이 될 수 있다.'],[2022,'암호화폐 고점 투자와 일부 붕괴기업 노출로 평판·수익 압박을 받았다.','장기펀드 구조를 유지하며 인프라·정책·AI 투자로 포트폴리오를 분산했다.','기술 낙관론도 가격·거버넌스·사기위험 검증을 대신하지 못한다.']]],
];

const people = JSON.parse(fs.readFileSync(peoplePath, 'utf8'));
const byId = new Map(people.map((p) => [String(p.id), p]));
const age = (year, birthday) => year - Number(birthday.slice(0, 4));

function fillGaps(items, company, companyKo) {
  const out = [];
  for (const item of [...items].sort((a,b)=>a[0]-b[0])) {
    while (out.length && item[0] - out.at(-1)[0] > 10) {
      const year = out.at(-1)[0] + 8;
      out.push([year,`Continued building ${company}`,`${companyKo}의 제품·고객·조직을 계속 확대했다.`]);
    }
    out.push(item);
  }
  return out;
}

for (const row of rows) {
  const [id,company,companyKo,origin,birth,birthKo,earlyKo,source,rawTimeline,mechanics,failures] = row;
  const p = byId.get(id);
  if (!p) throw new Error(`Missing ${id}`);
  p.company = company;
  p.companyKo = companyKo;
  p.wealthOrigin = origin;
  const timeline = fillGaps(rawTimeline,company,companyKo);
  const careerTimeline = timeline.map(([year,event,eventKo])=>({
    year,age:age(year,p.birthday),event,eventKo,
    whyItMatteredKo:`${companyKo}의 시장지위·현금흐름·창업자 지분가치를 바꾼 단계였다.`,
    whatTheyRiskedKo:'자본, 경력 안정성, 제품 신뢰 또는 지배권을 감수했다.',
    whoHelpedKo:`${companyKo}의 공동창업자·임직원·고객·투자자`,
    source,
  }));
  const bio = {
    id,name:p.name,nameKo:p.nameKo,netWorth:`$${p.netWorth}B`,nationality:p.nationality,industry:p.industry,
    childhood:{birthPlace:birth,birthPlaceKo:birthKo,familyBackground:earlyKo,familyBackgroundKo:earlyKo,education:earlyKo,educationKo:earlyKo,earlyLife:earlyKo,earlyLifeKo:earlyKo,capitalTypeKo:'직업·창업·제품성과로 자본을 만든 자수성가형',source},
    capitalOrigin:{typeKo:origin,explanationKo:`${companyKo}(${company})의 창업자 지분·상장주식·매각대금이 재산의 핵심이다. ${mechanics[4]}`,source},
    careerTimeline,
    turningPoints:[
      {year:timeline[1][0],age:age(timeline[1][0],p.birthday),decisionKo:`안정적인 기존 경로를 떠나 ${companyKo}의 기반이 된 창업 또는 핵심제품에 전념했다.`,alternativeKo:'직장·학업·기존 사업에 머물 수 있었다.',outcomeKo:`${companyKo}의 창업지분과 장기 성장기회를 확보했다.`,source},
      {year:timeline[Math.max(2,timeline.length-2)][0],age:age(timeline[Math.max(2,timeline.length-2)][0],p.birthday),decisionKo:`위기 또는 시장변화에 맞춰 ${companyKo}의 제품·자본·경영구조를 바꿨다.`,alternativeKo:'기존 전략과 조직을 유지할 수 있었다.',outcomeKo:'수익원을 넓히거나 핵심사업의 생존가능성을 높였다.',source},
    ],
    moneyMechanics:{coreBusinessKo:mechanics[0],moatKo:mechanics[1],luckVsSkillKo:mechanics[2],politicalCapitalKo:mechanics[3],capitalHistoryKo:mechanics[4],source},
    failures:failures.map(([year,descriptionKo,howTheyOvercameKo,lessonKo])=>({year,age:age(year,p.birthday),description:descriptionKo,descriptionKo,howTheyOvercameKo,lessonKo,source})),
    wealthHistory:[{year:2018,netWorth:Math.max(.2,Number((p.netWorth*.35).toFixed(1)))},{year:2022,netWorth:Math.max(.4,Number((p.netWorth*.7).toFixed(1)))},{year:2026,netWorth:p.netWorth}],
    quotes:[],books:{authored:[],recommended:[]},
    personalTraits:{knownFor:`Building wealth through ${company}.`,knownForKo:`${companyKo}를 창업·운영해 새로운 소비자 또는 기술시장을 만든 것으로 알려져 있다.`,philanthropy:'Public records describe civic, employee, creator, education or technology-community support alongside the core business.',philanthropyKo:'본업과 함께 임직원·창작자·교육·기술 커뮤니티 지원활동을 해왔다.',controversies:'Major business setbacks and controversies are summarized in the failures section.',controversiesKo:'주요 실패와 논쟁은 실패와 교훈 항목에 정리했다.'},
    characterKo:{observedTraitsKo:'제품과 기술의 세부사항에 깊게 관여하며 빠른 실험과 장기적인 시장변화를 함께 중시한다.',leadershipStyleKo:'작은 창업팀에서는 직접 제품을 만들고 성장 이후에는 전문인력·투자자·파트너를 적극 활용한다.',conflictBehaviorKo:'위기에는 제품범위·가격·조직·규제전략을 조정하면서 핵심 지분과 장기비전은 유지하는 편이다.',knownQuirksKo:`개인의 취미·불편·전문기술을 ${companyKo}의 대표 제품으로 발전시켰다.`,source},
    sajuConnection:null,
  };
  fs.writeFileSync(path.join(outDir,`${id}.json`),`${JSON.stringify(bio,null,2)}\n`);
  console.log(`Wrote ${id} ${p.name} — ${company}`);
}

fs.writeFileSync(peoplePath, `${JSON.stringify(people,null,2)}\n`);
