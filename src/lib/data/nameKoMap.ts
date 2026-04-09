// Curated Korean transliterations for billionaire names.
// Keys match the `name` field in billionaires.ts exactly (case-sensitive).
// Used as a fallback when a Person record has no `nameKo` of its own.
export const nameKoMap: Record<string, string> = {
  // Top US tech
  'Elon Musk': '일론 머스크',
  'Larry Page': '래리 페이지',
  'Sergey Brin': '세르게이 브린',
  'Jeff Bezos': '제프 베이조스',
  'Mark Zuckerberg': '마크 저커버그',
  'Larry Ellison': '래리 엘리슨',
  'Jensen Huang': '젠슨 황',
  'Michael Dell': '마이클 델',
  'Steve Ballmer': '스티브 발머',
  'Bill Gates': '빌 게이츠',
  'Warren Buffett': '워런 버핏',
  'Michael Bloomberg': '마이클 블룸버그',
  'Eric Schmidt': '에릭 슈밋',
  'Peter Thiel': '피터 틸',
  'Phil Knight': '필 나이트',
  'Eduardo Saverin': '에두아르도 새버린',
  'MacKenzie Scott': '매켄지 스콧',
  'Melinda French Gates': '멀린다 프렌치 게이츠',
  'Henry Samueli': '헨리 사무엘리',
  'Robert Pera': '로버트 페라',

  // Walton family (Walmart)
  'Rob Walton': '롭 월턴',
  'Jim Walton': '짐 월턴',
  'Alice Walton': '앨리스 월턴',
  'Lukas Walton': '루카스 월턴',

  // Koch family
  'Charles Koch': '찰스 코크',
  'Julia Koch': '줄리아 코크',

  // Mars family
  'Jacqueline Mars': '재클린 마스',
  'John Mars': '존 마스',

  // Finance
  'Thomas Peterffy': '토머스 페터피',
  'Ken Griffin': '켄 그리핀',
  'Stephen Schwarzman': '스티븐 슈워츠먼',
  'Jeff Yass': '제프 야스',
  'Israel Englander': '아이작 잉글랜더',
  'Abigail Johnson': '애비게일 존슨',
  'Len Blavatnik': '렌 블라바트닉',
  'Carl Icahn': '칼 아이칸',
  'Ray Dalio': '레이 달리오',
  'George Soros': '조지 소로스',

  // Europe luxury & retail
  'Bernard Arnault': '베르나르 아르노',
  'Amancio Ortega': '아만시오 오르테가',
  'François Pinault': '프랑수아 피노',
  'Francoise Bettencourt Meyers': '프랑수아즈 베탕쿠르 메이예르',
  'Giovanni Ferrero': '조반니 페레로',
  'Alain Wertheimer': '알랭 베르트하이머',
  'Gerard Wertheimer': '제라르 베르트하이머',
  'Dieter Schwarz': '디터 슈바르츠',
  'Klaus-Michael Kuehne': '클라우스미하엘 퀴네',
  'Stefan Quandt': '슈테판 콴트',
  'Susanne Klatten': '주잔네 클라텐',
  'Reinhold Wuerth': '라인홀트 뷔르트',
  'Emmanuel Besnier': '에마뉘엘 베니에',
  'Mark Mateschitz': '마르크 마테시츠',
  'Andrea Pignataro': '안드레아 피냐타로',
  'Giancarlo Devasini': '잔카를로 데바시니',
  'Paolo Ardoino': '파올로 아르도이노',
  'Gianluigi Aponte': '잔루이지 아폰테',
  'Rafaela Aponte-Diamant': '라파엘라 아폰테디아만트',
  'Jean-Louis van der Velde': '장루이 반 데르 벨데',

  // Mexico / LatAm
  'Carlos Slim Helu': '카를로스 슬림 엘루',
  'Germán Larrea Mota Velasco': '헤르만 라레아 모타 벨라스코',
  'Iris Fontbona': '이리스 폰트보나',

  // China / HK / Taiwan
  'Changpeng Zhao': '자오 창펑',
  'Zhang Yiming': '장이밍',
  'Zhong Shanshan': '중산산',
  'Robin Zeng': '쩡위췬',
  'Ma Huateng': '마화텅',
  'Jack Ma': '마윈',
  'Li Ka-shing': '리카싱',
  'William Ding': '딩레이',
  'Colin Huang': '황정',
  'Zheng Shuliang': '정수량',
  'He Xiangjian': '허샹젠',
  'Huang Shilin': '황스린',
  'Lei Jun': '레이쥔',

  // India
  'Mukesh Ambani': '무케시 암바니',
  'Gautam Adani': '가우탐 아다니',
  'Shiv Nadar': '시브 나다르',
  'Savitri Jindal': '사비트리 진달',
  'Cyrus Poonawalla': '사이러스 푸나왈라',
  'Lakshmi Mittal': '락슈미 미탈',
  'Dilip Shanghvi': '딜립 샹비',

  // Japan
  'Tadashi Yanai': '야나이 다다시',
  'Masayoshi Son': '손 마사요시',

  // Russia / CIS
  'Alexey Mordashov': '알렉세이 모르다쇼프',
  'Vladimir Potanin': '블라디미르 포타닌',
  'Vagit Alekperov': '바기트 알렉페로프',
  'Leonid Mikhelson': '레오니트 미헬슨',
  'Vladimir Lisin': '블라디미르 리신',
  'Suleiman Kerimov': '술레이만 케리모프',

  // Israel / Middle East / Africa
  'Miriam Adelson': '미리암 아델슨',
  'Eyal Ofer': '에얄 오페르',
  'Idan Ofer': '이단 오페르',
  'Aliko Dangote': '알리코 단고테',

  // Vietnam
  'Pham Nhat Vuong': '팜 녓 브엉',

  // Hospitals / pharma / etc.
  'Thomas Frist Jr': '토머스 프리스트 주니어',
  'Andreas von Bechtolsheim': '안드레아스 폰 베흐톨샤임',

  // Misc others from top
  'Marilyn Simons': '메릴린 사이먼스',
  'Lyndal Stephens Greth': '린들 스티븐스 그레스',
  'Elaine Marshall': '일레인 마셜',
  'Michal Strnad': '미할 스트르나드',
  'Vicky Safra': '비키 사프라',
  'Rick Cohen': '릭 코헨',
  'Gina Rinehart': '지나 라인하트',
};
