# Cowork Instructions — Deep Bio Research for Korean Rich People

**Goal:** Produce structured deep-bio JSON files for the Korean entries in `public/billionaires.json` that don't yet have one. These power the per-person detail pages on 사주부자.

**Date written:** 2026-04-25

---

## Background

`public/billionaires.json` has 203 KR-nationality entries. Of these, **129 are missing a deep-bio file** in either `public/deep-bios/` (v1) or `public/deep-bios-v2/` (v2). The site falls back gracefully when a deep bio is missing, but the saju-storytelling layer (childhood, capital origin, turning points, sajuConnection) only fires when the v2 file exists.

**Today's batch of 79 new Koreans was just added** from prior research reports (`research-reports/2026-04-17-new-rich-koreans.md` and `2026-04-18-new-rich-koreans.md`) — they have IDs **3394–3472**. Their bullet-derived bios are placeholders. They need real deep bios most urgently.

---

## Output format — `public/deep-bios-v2/{id}.json`

Match the schema used by existing v2 files (e.g. `public/deep-bios-v2/1.json`). Top-level keys, in order:

```json
{
  "id": "3394",
  "name": "Chung Yoo-kyung",
  "nameKo": "정유경",
  "netWorth": "$1B",
  "nationality": "KR",
  "industry": "Retail",

  "childhood": {
    "birthPlace": "...",
    "birthPlaceKo": "...",
    "familyBackground": "...",
    "familyBackgroundKo": "...",
    "earlyEducation": "...",
    "earlyEducationKo": "...",
    "formativeExperiences": "...",
    "formativeExperiencesKo": "..."
  },

  "capitalOrigin": {
    "initialCapital": "...",
    "initialCapitalKo": "...",
    "fundingSources": "...",
    "fundingSourcesKo": "...",
    "firstBigBreak": "...",
    "firstBigBreakKo": "..."
  },

  "careerTimeline": [
    { "year": "1995", "event": "...", "eventKo": "...", "ageAt": 23 }
  ],

  "turningPoints": [
    { "year": "2014", "event": "...", "eventKo": "...", "impact": "...", "impactKo": "..." }
  ],

  "moneyMechanics": {
    "primaryWealthEngine": "...",
    "primaryWealthEngineKo": "...",
    "secondaryStreams": "...",
    "secondaryStreamsKo": "...",
    "leverageStrategy": "...",
    "leverageStrategyKo": "..."
  },

  "failures": [
    { "year": "...", "event": "...", "eventKo": "...", "lesson": "...", "lessonKo": "..." }
  ],

  "wealthHistory": [
    { "year": "2020", "netWorthEstimate": "$X.XB", "context": "...", "contextKo": "..." }
  ],

  "quotes": [
    { "quote": "...", "quoteKo": "...", "context": "...", "contextKo": "..." }
  ],

  "books": [
    { "title": "...", "titleKo": "...", "author": "...", "note": "...", "noteKo": "..." }
  ],

  "personalTraits": ["...", "...", "..."],
  "characterKo": "한국어로 인물의 성격·기질을 2~3문장으로 요약.",

  "sajuConnection": {
    "ilju": "갑자",
    "geokguk": "정관격",
    "interpretation": "사주적 해석을 한국어로 작성. 일주·격국·용신과 인생 흐름의 연결고리를 구체적으로.",
    "keyEvents": [
      { "year": "2014", "saju": "...대운", "interpretation": "..." }
    ]
  }
}
```

**Schema notes:**

- Every English field has a `*Ko` Korean counterpart. Both are required.
- `netWorth` is a display string ("$1B", "$3.4B", "$500M") — not the raw number from `billionaires.json`.
- `careerTimeline` should be 5–15 entries spanning birth/education → first job → company founding → IPO/exit → present.
- `turningPoints` should be 3–6 entries — moments where the wealth trajectory genuinely changed.
- `failures` should be 1–4 entries — bankruptcies, lawsuits, fired-from-own-company, family disputes. Don't fabricate; omit if there are none.
- `wealthHistory` 4–10 datapoints across decades.
- `quotes` 2–6 entries with sourced context.
- `books` 1–4 — books they wrote, books known to have shaped them, or books written about them.
- `personalTraits` 5–10 short English adjectives/phrases.
- `sajuConnection` is the differentiator. **Use the user's existing 사주 calculation in the codebase** (`lunar-javascript` package, see `AGENTS.md`) to derive 일주·격국 from `birthday` — don't invent. The interpretation paragraph should weave the 격국 / 십신 / 대운 into the actual life events you documented above.

---

## Sourcing rules

1. **Cite primary Korean sources.** 나무위키, DART 공시 (dart.fss.or.kr), 한국경제, 매일경제, 비즈니스포스트, 조선비즈, 중앙일보 are all acceptable. English Wikipedia is fine for cross-checks but not as a sole source for Korean figures.
2. **Confirm the birthday in `billionaires.json` against at least one source before writing the saju section.** If the recorded date looks wrong, flag it in the file under a top-level `_notes` key rather than silently using a different date.
3. **Net worth ranges** — give a defensible estimate. For unlisted founders use stake × company valuation; for celebrities use property holdings + reported deals. State the basis in `moneyMechanics.primaryWealthEngine`.
4. **Don't invent quotes.** If you can't find at least 2 verifiable quotes, leave the array shorter — empty is better than fake.
5. **Real-estate addresses** are fine to include for celebrities (자산화된 유명한 부동산만) — they're public record via 등기부등본 and are core to the wealth story for K-pop/배우 entries.

---

## Process per entry

1. Pick a target ID from the checklist below.
2. Read `public/billionaires.json` to get the entry's current `name`, `nameKo`, `birthday`, `source`. **Don't modify `billionaires.json`** unless you discover a wrong birthday — and if so, ping the user before changing it.
3. Research and write `public/deep-bios-v2/{id}.json` matching the schema above.
4. Run `npm run build` (or at minimum verify the JSON parses) before declaring the file done.
5. Tick the checkbox below for that ID and append a one-line note to `research-reports/deep-bio-progress.md` with the date and primary source URLs used. (Create the file if it doesn't exist.)

---

## Priority groups

**Tier 1 — Foundational figures (do these first):** 이병철, 이건희, 정주영, 박태준, 구인회, 박두병, 이수만, 박인천 — early-20th-century founders whose deep bios anchor the genealogical structure of the rest. The site already implies family-tree relationships; without these the heir entries float.

**Tier 2 — High-profile celebrities & athletes (3349–3354 BTS, 3395 G-Dragon, 3397 Son Heung-min, 3403 Song Hye-kyo, 3451 IU, etc.):** highest visitor traffic. Real-estate holdings matter more than corporate structure here.

**Tier 3 — The 79 newly-added entries (3394–3472):** placeholder bios already in `billionaires.json`; replace with real deep bios.

**Tier 4 — Mid-cap / KOSDAQ founders:** longer tail.

---

## Checklist — 129 Koreans missing deep bios

(Format: `[ ] **id** — 한글이름 (영문, YYYY-MM-DD) — source`. Tick `[x]` when the v2 JSON file is committed.)

- [ ] **3317** — 이병철 (Lee Byung-chul, 1910-02-12) — Samsung Group
- [ ] **3318** — 이건희 (Lee Kun-hee, 1942-01-09) — Samsung
- [ ] **3319** — 한종희 (Han Jong-hee, 1962-03-04) — Samsung Electronics
- [ ] **3320** — 노태문 (Roh Tae-moon, 1968-03-07) — Samsung Electronics
- [ ] **3321** — 박정호 (Park Jung-ho, 1963-03-01) — SK Group
- [ ] **3322** — 정주영 (Chung Ju-yung, 1915-11-25) — Hyundai Group
- [ ] **3324** — 김동명 (Kim Dong-myung, 1969-03-01) — LG Energy Solution
- [ ] **3326** — 박두병 (Park Doo-byung, 1910-10-06) — Doosan Group
- [ ] **3329** — 양종희 (Yang Jong-hee, 1961-10-01) — KB Financial
- [ ] **3330** — 박태준 (Park Tae-joon, 1927-10-24) — POSCO
- [ ] **3331** — 최수연 (Choi Soo-yeon, 1981-04-01) — NAVER
- [ ] **3333** — 구인회 (Koo In-hoe, 1907-08-27) — LG Group
- [ ] **3334** — 김동철 (Kim Dong-cheol, 1955-09-01) — KEPCO
- [ ] **3335** — 임종룡 (Yim Jong-yong, 1959-08-01) — Woori Financial Group
- [ ] **3337** — 최윤범 (Choi Yun-beom, 1975-07-01) — Korea Zinc
- [ ] **3338** — 김영섭 (Kim Young-shub, 1959-09-01) — KT
- [ ] **3341** — 박인천 (Park In-chon, 1901-08-18) — Kumho Group
- [ ] **3342** — 박찬구 (Park Chan-koo, 1948-08-01) — Kumho Petrochemical
- [ ] **3345** — 이수만 (Lee Soo-man, 1952-06-18) — SM Entertainment
- [ ] **3346** — 양현석 (Yang Hyun-suk, 1970-01-09) — YG Entertainment
- [ ] **3347** — 유재석 (Yoo Jae-suk, 1972-08-14) — TV hosting
- [ ] **3348** — 전지현 (Jun Ji-hyun, 1981-10-30) — Acting
- [ ] **3349** — RM (김남준) (RM, 1994-09-12) — BTS / HYBE
- [ ] **3350** — 진 (김석진) (Jin, 1992-12-04) — BTS / HYBE
- [ ] **3351** — 슈가 (민윤기) (Suga, 1993-03-09) — BTS / HYBE
- [ ] **3352** — 제이홉 (정호석) (J-Hope, 1994-02-18) — BTS / HYBE
- [ ] **3353** — 지민 (박지민) (Jimin, 1995-10-13) — BTS / HYBE
- [ ] **3354** — 뷔 (김태형) (V, 1995-12-30) — BTS / HYBE
- [ ] **3366** — 홍민택 (Hong Min-taek, 1982-10-05) — Toss Bank / Kakao
- [ ] **3373** — 정몽규 (Chung Mong-gyu, 1962-01-14) — HDC
- [ ] **3374** — 김소희 (Kim So-hee, 1983-11-08) — 스타일난다 / 3CE
- [ ] **3375** — 정몽윤 (Chung Mong-yoon, 1955-03-18) — 현대해상 회장
- [ ] **3376** — 송병준 (Song Byung-joon, 1976-01-08) — 컴투스홀딩스 의장
- [ ] **3377** — 류진 (Ryu Jin, 1958-03-05) — 풍산 회장
- [ ] **3378** — 홍라영 (Hong Ra-young, 1960-01-10) — ex-리움미술관 총괄부관장
- [ ] **3379** — 강호동 (Kang Ho-dong, 1970-07-14) — 방송인
- [ ] **3380** — 김창한 (Kim Chang-han, 1974-09-13) — Krafton CEO
- [ ] **3381** — 이순형 (Lee Sun-hyung, 1949-02-10) — 세아홀딩스 회장
- [ ] **3382** — 구자용 (Koo Ja-yong, 1955-03-27) — E1 대표이사 회장, LS네트웍스 회장
- [ ] **3383** — 박삼구 (Park Sam-koo, 1945-03-19) — 금호아시아나그룹 4대·6대 회장 (ex)
- [ ] **3384** — 장세주 (Jang Se-joo, 1953-11-08) — 동국홀딩스 회장
- [ ] **3385** — 신동엽 (Shin Dong-yup, 1971-02-17) — 방송인, 대학가요제 입상자 출신
- [ ] **3386** — 송인준 (Song In-jun, 1965-09-22) — IMM PE 대표이사 사장
- [ ] **3387** — 김슬아 (Sophie Kim, 1983-06-16) — Kurly Inc
- [ ] **3388** — 유상덕 (Yoo Sang-duk, 1959-05-22) — ST국제 회장
- [ ] **3389** — 이경규 (Lee Kyung-kyu, 1960-09-21) — 대한민국 개그맨 1세대
- [ ] **3390** — 이상순 (Lee Sang-soon, 1974-08-25) — 이효리 남편
- [ ] **3391** — 이사배 (Risabae, 1988-09-13) — K-beauty 유튜버
- [ ] **3392** — 김종국 (Kim Jong-kook, 1976-04-25) — 터보 멤버 → 솔로
- [ ] **3393** — 김봉진 (Kim Bong-jin, 1976-10-30) — Woowa Brothers
- [ ] **3394** — 정유경 (Chung Yoo-kyung, 1972-10-05) — 신세계 (Shinsegae Inc.) — chairwoman since Oct 2024
- [ ] **3395** — 권지용 (G-Dragon, 1988-08-18) — BIGBANG / Galaxy Corporation (solo agency) / PEACEMINUSONE
- [ ] **3396** — 이효리 (Lee Hyori, 1979-05-10) — Fin.K.L / solo artist / real-estate investing
- [ ] **3397** — 손흥민 (Son Heung-min, 1992-07-08) — Tottenham (2015–2025) → LAFC / endorsements
- [ ] **3398** — 김태평 (Hyun Bin, 1982-09-25) — VAST Entertainment (co-founder via management relationship) / acting
- [ ] **3399** — 류현진 (Ryu Hyun-jin, 1987-03-25) — LA Dodgers / Toronto Blue Jays / Hanwha Eagles
- [ ] **3400** — 김하성 (Kim Ha-seong, 1995-10-17) — San Diego Padres → Tampa Bay Rays → Atlanta Braves
- [ ] **3401** — 박재범 (Jay Park, 1987-04-25) — AOMG, H1ghr Music, More Vision labels, 원스피리츠 (Wonsoju)
- [ ] **3402** — 김태희 (Kim Tae-hee, 1980-03-29) — Acting + with husband 비 (Rain) owns Seocho building purchased ₩920B in 2021 (later shelved ₩1.4T sale attempt)
- [ ] **3403** — 송혜교 (Song Hye-kyo, 1981-11-22) — drama lead + endorsements (Chaumet, Fendi, etc.)
- [ ] **3404** — 송중기 (Song Joong-ki, 1985-09-19) — drama lead (Descendants of the Sun, Vincenzo, Reborn Rich) + High Zium Studio
- [ ] **3405** — 이병헌 (Lee Byung-hun, 1970-07-12) — 
- [ ] **3406** — 이민호 (Lee Min-ho, 1987-06-22) — drama lead (Boys Over Flowers, King: Eternal Monarch, Pachinko) + MYM Entertainment
- [ ] **3407** — 박서준 (Park Seo-jun, 1988-12-16) — drama lead (Itaewon Class, Fight For My Way, Gyeongseong Creature) + Awesome ENT
- [ ] **3408** — 공유 (Gong Yoo, 1979-07-10) — Goblin, Train to Busan, Squid Game + SOOP MGMT
- [ ] **3409** — 박지성 (Park Ji-sung, 1981-03-30) — Man Utd (2005–2012) / Korean FA ambassador / JS Foundation + restaurant holdings
- [ ] **3410** — 구본준 (Koo Bon-joon, 1951-12-24) — LX Holdings (2021 LG spinoff — LX International, LX Semicon, LX Hausys, LX MMA)
- [ ] **3411** — 조원태 (Cho Won-tae, 1976-01-25) — Hanjin KAL (holding company), Korean Air chairman & CEO since April 2019
- [ ] **3412** — 서장훈 (Seo Jang-hoon, 1974-06-03) — 전 농구선수 (연세대–삼성전자썬더스–SK); 현 방송인; 대형 건물주
- [ ] **3413** — 나희선 (Na Hee-sun / DDotty, 1986-12-10) — 샌드박스네트워크 공동창업자 & CCO; 대한민국 1세대 마인크래프트 크리에이터
- [ ] **3414** — 박재한 (Park Jae-han / Panibottle, 1987-10-26) — 234만 구독자 여행 유튜버; Pikicast 출신
- [ ] **3415** — 곽준빈 (Kwak Jun-bin / Kwaktube, 1992-02-02) — 외교관 시험 준비 출신; 아프리카 여행 컨텐츠로 돌파
- [ ] **3416** — 박막례 (Park Mak-rye, 1947-02-12) — 'Korea Grandma' YouTube channel (grand-daughter 김유라 produces); 화장품/식품 브랜드
- [ ] **3417** — 나동현 (Na Dong-hyun / Daedoseogwan, 1978-10-31) — 대도서관TV; 대한민국 1세대 게임 유튜버; 이혼 前 윰댕(이유미)과 공동 브랜드
- [ ] **3418** — 박세창 (Park Se-chang, 1975-07-16) — 금호건설 사장; 아시아나IDT 前 대표; 박삼구 장남
- [ ] **3419** — 구자엽 (Koo Ja-yup, 1951-12-30) — LS전선 회장, 가온전선 회장
- [ ] **3420** — 최성원 (Choi Sung-won, 1969-12-08) — 광동제약 (KwangDong Pharmaceutical, "비타500"·"옥수수수염차")
- [ ] **3421** — 최규옥 (Choi Kyu-ok, 1960-05-10) — 오스템임플란트 (Osstem Implant, world #5 dental-implant maker; now 서진시스템 major shareholder post-Osstem exit)
- [ ] **3422** — 천종윤 (Chun Jong-yoon, 1957-07-06) — 씨젠 (Seegene, KOSDAQ 096530 — PCR diagnostic reagents)
- [ ] **3423** — 조영식 (Cho Young-sik, 1961-06-30) — 에스디바이오센서 (SD Biosensor, KOSPI 137310) + 바이오노트 (Bionote, KOSPI 377740)
- [ ] **3424** — 차석용 (Cha Suk-yong, 1953-06-09) — 휴젤 (Hugel) Chairman since 2023; ex–LG생활건강 Vice Chairman ("차석용 매직")
- [ ] **3425** — 강정석 (Kang Jeong-seok, 1964-10-30) — 동아쏘시오홀딩스 (Dong-A Socio Holdings) — chairman returned 2023 after 2018 FTA sentence
- [ ] **3426** — 허일섭 (Huh Il-sup, 1954-05-28) — GC녹십자 / 녹십자홀딩스 (Green Cross Holdings) — Chairman, largest individual shareholder (~12.16%)
- [ ] **3427** — 윤웅섭 (Yoon Woong-sup, 1967-07-07) — 일동제약 (Ildong Pharmaceutical) — Chairman, 3세. Grandson of founder 윤용구, son of 윤원영
- [ ] **3428** — 이경하 (Lee Kyung-ha, 1963-08-29) — JW홀딩스 / JW중외그룹 — Chairman, 3세. Grandson of 이기석 창업주
- [ ] **3429** — 윤성태 (Yoon Sung-tae, 1964-07-13) — 휴온스글로벌 (Huons Global) — Chairman since 2022, 42.84% largest shareholder
- [ ] **3430** — 권기범 (Kwon Ki-bum, 1967-03-23) — 동국제약 (Dongkook Pharmaceutical) — Chairman 2022, 2세, son of late founder 권동일
- [ ] **3431** — 이태성 (Lee Tae-sung, 1978-08-11) — 세아홀딩스 (SeAH Holdings) — son of late 이운형, runs 세아베스틸 / 세아창원특수강 branch
- [ ] **3432** — 이주성 (Lee Ju-sung, 1978-10-23) — 세아제강지주 (SeAH Steel Holdings) — son of 이순형 chairman
- [ ] **3433** — 권오갑 (Kwon Oh-gap, 1951-02-10) — HD현대 명예회장 (ex-CEO/Chairman 2019–2025). 47-year HD Hyundai lifer — the "샐러리맨 신화" who steered the group through the post-2015 crisis
- [ ] **3434** — 정지선 (Chung Ji-sun, 1972-10-20) — 현대백화점그룹 Chairman since 2007. Grandson of 정주영, nephew of 정몽구
- [ ] **3435** — 이명희 (Lee Myung-hee, 1943-09-05) — 신세계그룹 총괄회장. Daughter of 이병철, sister of 이건희
- [ ] **3436** — 조현범 (Cho Hyun-bum, 1972-01-07) — 한국앤컴퍼니그룹 (Hankook & Company) Chairman. 조양래 명예회장 차남. Married to Lee Myung-bak's third daughter.
- [ ] **3437** — 이웅열 (Lee Woong-yeul, 1956-04-18) — 코오롱그룹 명예회장 (2018년 경영사퇴 선언, 2019년 공식 사퇴)
- [ ] **3438** — 허연수 (Huh Yeon-soo, 1961-07-26) — GS리테일 Vice Chairman (stepping down 2024 for 4세 허서홍 transition). Son of GS Retail 명예회장 허신구
- [ ] **3439** — 정몽근 (Chung Mong-geun, 1942-05-25) — 현대백화점그룹 명예회장. 3rd son of 정주영, father of 정지선 (#72)
- [ ] **3440** — 허명수 (Huh Myung-soo, 1955-10-01) — GS건설 상임고문 (ex-Vice Chairman / CEO 2006–2013). 4th son of 허준구, younger brother of 허창수 (already in roster as id 3339), elder brother of 허태수 GS Group chairman
- [ ] **3441** — 배용준 (Bae Yong-joon, 1972-08-29) — 키이스트 (KeyEast) — acquired a listed shell in 2006 for ~₩9B, sold KeyEast to SM C&C/Kakao in later tranches. Seongbuk-dong house ~₩9.5B.
- [ ] **3442** — 임영웅 (Lim Young-woong, 1991-06-16) — 물고기뮤직 (1인 기획사). 마포 성산동 6층 빌딩 ₩45B 매입(2021) → ₩61B+ 현 시세. 한남동 펜트하우스.
- [ ] **3443** — 현빈 (Hyun Bin, 1982-09-25) — 《시크릿 가든》·《사랑의 불시착》·《공조》 시리즈. 2022 손예진과 결혼, 2022 득남. VAST 엔터테인먼트 소속.
- [ ] **3444** — 손예진 (Son Ye-jin, 1982-01-11) — 《클래식》·《내 머리 속의 지우개》·《사랑의 불시착》·《서른, 아홉》. MSteam Entertainment 소속. Cheongdam/Itaewon real-estate holder.
- [ ] **3445** — 이영애 (Lee Young-ae, 1971-01-31) — 《대장금》·《JSA》·《친절한 금자씨》. Household wealth is very large due to spouse's US business holdings — popular-press estimates ₩2T (the "2조 재산설") are speculative, but verifiable family wealth is comfortably ten-figure KRW.
- [ ] **3446** — 김수현 (Kim Soo-hyun, 1988-02-16) — 《해를 품은 달》·《별에서 온 그대》·《사이코지만 괜찮아》·《눈물의 여왕》. GOLD MEDALIST 소속 (자신이 대주주).
- [ ] **3447** — 전현무 (Jeon Hyun-moo, 1977-11-07) — SM C&C 소속 MC — 고정 진행 10+ 프로그램이 동시 방영되는 시기 다수. 연세대 영문/사회.
- [ ] **3448** — 이승엽 (Lee Seung-yuop, 1976-10-11) — KBO 국민타자. 성수동 빌딩 ₩293B (2009 매입) → ₩707B+ 현 감정가 per 뉴스1. 삼성 36번 영구 결번.
- [ ] **3449** — 박세리 (Pak Se-ri, 1977-09-28) — 1998 US Women's Open champion ("IMF 키드" national icon). LPGA Hall of Fame. 두 차례 올림픽 여자골프 국가대표팀 감독.
- [ ] **3450** — 최경주 (K.J. Choi, 1970-05-19) — First Korean PGA Tour card holder; 2011 Players Championship winner. Asia-first top-5 world ranking 2008. 최경주재단 founder.
- [ ] **3451** — 이지은 (Lee Ji-eun / IU, 1993-05-16) — Solo singer-songwriter (own production credits, ~50%+ of catalog self-written/composed). Real estate: 청담동 에테르노 청담 ₩130B, 과천 작업실 ₩46B, 양평 별장 ₩22B + 인근 토지 ₩8B.
- [ ] **3452** — 윤동한 (Yoon Dong-han, 1947-01-26) — 한국콜마홀딩스 (구 한국콜마) 창업주·회장 → 현 명예회장
- [ ] **3453** — 김정완 (Kim Jung-wan, 1957-08-13) — 매일유업 회장 (창업주 김복용의 장남)
- [ ] **3454** — 남승우 (Nam Seung-woo, 1951-04-16) — 풀무원 창업주·총괄CEO (2018년 전문경영인 이효율에게 CEO 이양 후 이사회 의장)
- [ ] **3455** — 조동혁 (Cho Dong-hyuk, 1950-11-22) — 한솔케미칼 (KOSPI 014680) 회장
- [ ] **3456** — 이부섭 (Lee Boo-sup, 1937-11-22) — 동진쎄미켐 (KOSDAQ 005290) 창업주·명예회장
- [ ] **3457** — 정지완 (Jung Ji-wan, 1956-10-18) — 솔브레인홀딩스 (KOSDAQ 036830) 회장 — 솔브레인·솔브레인SLD 지배
- [ ] **3458** — 이용한 (Lee Yong-han, 1954-04-06) — 원익홀딩스 (KOSDAQ 030530) 회장 — 원익QnC, 원익IPS, 원익피앤이, 테라세미콘 지배
- [ ] **3459** — 박성수 (Park Sung-soo, 1953-01-14) — 이랜드그룹 회장 — 이랜드월드·이랜드리테일·이랜드이츠 지배
- [ ] **3460** — 이중근 (Lee Joong-keun, 1941-01-19) — 부영그룹 회장 — 부영주택·동광주택·광영토건 지배
- [ ] **3461** — 허영인 (Heo Young-in, 1949-07-30) — SPC그룹 회장 — 파리크라상·SPC삼립·비알코리아 지배
- [ ] **3462** — 윤홍근 (Yoon Hong-geun, 1955-11-11) — 제너시스BBQ그룹 회장 — 비비큐·비비큐치킨 운영
- [ ] **3463** — 장영신 (Chang Young-shin, 1936-05-05) — 애경그룹 회장 — AK홀딩스·제주항공·애경산업 지배
- [ ] **3464** — 김동녕 (Kim Dong-nyung, 1945-01-10) — 한세예스24홀딩스 (KOSPI 016450) 회장 — 한세실업(의류 OEM)·예스24(온라인서점)·동아출판
- [ ] **3465** — 임창욱 (Lim Chang-wook, 1949-02-12) — 대상그룹 명예회장 — 대상(종가집·청정원)·대상홀딩스·초록마을
- [ ] **3466** — 김윤 (Kim Yoon, 1953-06-24) — 삼양홀딩스 (KOSPI 000070) 회장 — 삼양사·삼양바이오팜·삼양이노켐
- [ ] **3467** — 윤석금 (Yoon Seok-keum, 1945-11-16) — 웅진그룹 회장 — 웅진씽크빅·웅진플레이도시 등
- [ ] **3468** — 성기학 (Sung Ki-hak, 1947-11-28) — 영원무역홀딩스 (KOSPI 009970) 회장 — 영원무역·영원아웃도어(노스페이스 한국)·Scott Sports (스위스 자전거)
- [ ] **3469** — 윤윤수 (Yoon Yoon-soo, 1945-06-08) — 휠라홀딩스 (KOSPI 081660) 회장 — FILA Korea + FILA 글로벌 본사(이탈리아에서 역수출) + 아쿠쉬네트(Titleist 골프) 최대주주
- [ ] **3470** — 홍석현 (Hong Seok-hyun, 1949-11-24) — 중앙홀딩스 회장 — 중앙일보·JTBC·메가박스 지배
- [ ] **3471** — 이정훈 (Lee Jung-hoon, 1954-01-12) — 서울반도체 (KOSDAQ 046890) 대표이사·창업주 — 서울바이오시스·서울세미콘 계열
- [ ] **3472** — 손주은 (Son Joo-eun, 1961-01-26) — 메가스터디교육 (KOSDAQ 215200) · 메가스터디 (KOSDAQ 072870) 회장

---

## Stop conditions

- Stop and ping the user if you find that more than ~10% of the recorded birthdays in `billionaires.json` are wrong. That's a data-quality issue worth a separate fix-up pass before continuing.
- Stop and ping if you can't reach DART or 나무위키 — those are the load-bearing sources.
- After every 10 deep-bios, run `npm run build` and commit the batch with message `Add deep bios for IDs X–Y` so progress isn't lost.
