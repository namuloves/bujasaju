# Deep-bio Research Progress Log

Per `research-reports/INSTRUCTIONS-deep-bio-research.md` — one line per shipped v2 file with date and primary sources.

## 2026-04-26 — Batch 1 (Tier 1, $1B+)

10 files written. KR coverage: 40 → 50 / 203 (24.6%).

| ID | 한글이름 | 영문 | NW | 일주 | 격국 | Notes | Primary sources |
|----|---------|------|----|----|----|-------|-----------------|
| 3423 | 조영식 | Cho Young-sik | $2.5B | 갑오 | 상관격 | | businesspost 286838, namuwiki SD바이오센서, thebell 2021-02-16 |
| 3422 | 천종윤 | Chun Jong-yoon | $1.8B | 기묘 | 편인격 | | businesspost 329444/411250, namuwiki 씨젠, forbeskorea 340747 |
| 3460 | 이중근 | Lee Joong-keun | $2.0B | 정묘 | 식신격 | **birthday discrepancy DB 1941-01-19 vs Wiki 1941-01-11** | wiki 이중근(1941년), namuwiki, businesspost 365685, metroseoul 2025-09-23 |
| 3459 | 박성수 | Park Sung-soo | $1.8B | 을축 | 편재격 | **birthday discrepancy DB 1953-01-14 vs Wiki/Namu 1953-03-01** | wiki 박성수(기업인), namuwiki, businesspost 147675, ceomagazine 32405 |
| 3436 | 조현범 | Cho Hyun-bum | $1.5B | 정유 | 식신격 | | businesspost 417602, namuwiki 조현범, fntimes 2024-11-17, sisajournal-e 413668 |
| 3426 | 허일섭 | Huh Il-sup | $1.3B | 갑신 | 식신격 | | businesspost 273662/369841, wiki 허영섭, seoul.co.kr 2015-07-09, sisajournal-e 409205 |
| 3461 | 허영인 | Heo Young-in | $1.3B | 신유 | 편인격 | | businesspost 328115, namuwiki 허영인, seoul.co.kr 2025-10-21, namuwiki SPC그룹/사건사고 |
| 3468 | 성기학 | Sung Ki-hak | $1.3B | 신해 | 상관격 | **birthday discrepancy DB 1947-11-28 vs Wiki 1947-07-08** | businesspost 356090, wiki 성기학, ceomagazine 31146, bizwatch governance 2024-09-05, khan 2026-02-23 |
| 3420 | 최성원 | Choi Sung-won | $1.2B | 정사 | 편관격 | | businesspost 359615, wiki 최성원(기업인), wiki 광동제약, hitnews 50561 |
| 3425 | 강정석 | Kang Jeong-seok | $1.2B | 임자 | 편관격 | | businesspost 368655, namuwiki 동아쏘시오그룹, womaneconomy 51570, edaily 2023 광복절 사면 |

## Birthday data-quality note

3 of 10 entries (30%) had birthday mismatches between `billionaires.json` and Korean primary sources. Per user direction, kept DB date and flagged in each affected file's `_notes` field rather than editing `billionaires.json`. This is well above the 10% threshold mentioned in the instructions — recommend a focused birthday-audit pass on the remaining 154 KR entries before they get deep bios written against potentially-wrong saju.

## Manifest update

Added the 10 IDs to `DEEP_BIO_V2_IDS` set in `src/lib/deepBio.ts` so the app surfaces the v2 bios.

## Validation

- Each file passes `python -c 'import json; json.load(open(...))'`.
- `npm run prebake` succeeds (3,075 records).
- `tsx scripts/build-search-index.ts` succeeds (836 bios indexed; v2 files render via per-page fetch, not the search index).

## 2026-04-26 — Batch 2 (Tier 1, $1.0–1.1B)

10 files written. KR coverage: 50 → 60 / 203 (29.6%).

| ID | 한글이름 | 영문 | NW | 일주 | 격국 | Notes | Primary sources |
|----|---------|------|----|----|----|-------|-----------------|
| 3097 | 신동주 | Shin Dong-joo | $1.1B | 갑신 | 정재격 | | namuwiki 신동주, 광윤사, hankookilbo 2025-06, sisajournal-e 413160 |
| 3142 | 김현태 | Kim Hyun-tae | $1.1B | 임술 | 상관격 | **DB source 알테오젠은 오류 — 실제 회사는 보로노이(Voronoi)** | businesspost 394147, namuwiki 보로노이, biospectator 5206, edaily |
| 3180 | 방시혁 | Bang Si-hyuk | $1.1B | 임신 | 편인격 | | namuwiki 방시혁, businesspost 355173, namuwiki HYBE, namuwiki 4000억 비밀계약 |
| 3204 | 홍석조 | Hong Seok-joh | $1.1B | 기미 | 건록격 | | wiki 홍석조, businesspost 319694, namuwiki BGF리테일, fntimes |
| 3211 | 이수진 | Lee Su-jin | $1.1B | 갑오 | 정재격 | | namuwiki 이수진(1978), businesspost 312272, ajunews 흙수저, investchosun |
| 3313 | 장병규 | Chang Byung-gyu | $1.1B | 신묘 | 정인격 | | namuwiki 장병규, wiki 장병규(1973), insightkorea, krafton press 2024 |
| 3314 | 이승건 | Lee Seung-gun | $1.1B | 계축 | 편관격 | | namuwiki 이승건, businesspost 318673, hankyung 8전9기, economytribune |
| 3315 | 신창재 | Shin Chang-jae | $1B | 을묘 | 정재격 | | namuwiki 신창재, businesspost 356603, investchosun, sisajournal 풋옵션 |
| 3339 | 허창수 | Heo Chang-soo | $1B | 병술 | 편재격 | **birthday discrepancy DB 1948-08-29 vs Wiki 1948-10-16** | namuwiki 허창수, wiki 허창수, businesspost 276080, financialpost 20주년 |
| 3356 | 남도현 | Nam Do-hyun | $1.06B | 경인 | 건록격 | | aimedbio 회사 소개, namuwiki 에임드바이오, medicopharma, biotimes IPO |

## Cumulative birthday data-quality status

After 20 entries researched, 4 birthday discrepancies (3460 이중근, 3459 박성수, 3468 성기학, 3339 허창수) — 20% rate. Plus 1 source-field error (3142 김현태 listed as 알테오젠 in DB but actually is Voronoi CEO). Recommended birthday-audit pass before deeper batches still stands.

## Manifest update

Added the 10 new IDs to `DEEP_BIO_V2_IDS` set in `src/lib/deepBio.ts`.

## 2026-04-26 — Batch 3 (Tier 1 wrap + Tier 2 start, $0.77B–$1B)

10 files written. KR coverage: 60 → 70 / 203 (34.5%).

| ID | 한글이름 | 영문 | NW | 일주 | 격국 | Notes | Primary sources |
|----|---------|------|----|----|----|-------|-----------------|
| 3368 | 허민 | Heo Min | $1B | 무진 | 정관격 | | namuwiki 허민(기업인), wiki 허민(1976), businesspost 147279, namuwiki 네오플 |
| 3394 | 정유경 | Chung Yoo-kyung | $1B | 기사 | 식신격 | | namuwiki 정유경, wiki 정유경(기업인), businesspost 381835, hankyung 회장 승진 |
| 3421 | 최규옥 | Choi Kyu-ok | $1B | 무술 | 편인격 | | namuwiki 오스템임플란트, dentalnews 최규옥, thevaluenews, alphabiz 서진시스템 |
| 3437 | 이웅열 | Lee Woong-yeul | $1B | 을묘 | 정재격 | | namuwiki 이웅열, businesspost 103833, seoul.co.kr 재계인맥, sisajournal-e 코오롱 |
| 3359 | 장평순 | Jang Pyeong-sun | $0.995B | 계묘 | 건록격 | | wiki 장평순, namuwiki 장평순, businesspost 35218, insightkorea 흙수저 |
| 3307 | 김대일 | Kim Dae-il | $0.9B | 무술 | 양인격 | **DB source 컴투스는 오류 — 실제 회사는 펄어비스(Pearl Abyss)** | namuwiki 김대일, wiki 김대일, greened, businesspost 153210 |
| 3410 | 구본준 | Koo Bon-joon | $0.9B | 무술 | 정재격 | | namuwiki 구본준, wiki 구본준, businesspost 325765, ajunews LX, thebell |
| 3327 | 박정원 | Park Jeong-won | $0.8B | 병오 | 정인격 | | namuwiki 박정원, wiki 박정원(기업인), businesspost 357765, newsis 두산에너빌리티 |
| 3360 | 조현상 | Cho Hyun-sang | $0.78B | 정유 | 상관격 | **biggest birthday discrepancy yet — DB 1976-04-15 vs Wiki/Namu/BusinessPost 1971-11-26 (4.5 year gap, completely different ilju)** | namuwiki 조현상, businesspost 398374, ceomagazine, magazine.hankyung 제2창업 |
| 3361 | 김재영 | Kim Jae-young | $0.77B | 경술 | 식신격 | | namuwiki 라이온하트스튜디오, namuwiki 김재영, businesspost 381658, thevc lionheartstudio |

## Cumulative birthday + source data-quality status (after 30 entries)

- **Birthday discrepancies: 5 of 30 (16.7%)** — 3460 이중근, 3459 박성수, 3468 성기학, 3339 허창수, 3360 조현상
- **Source-field errors: 2 of 30 (6.7%)** — 3142 김현태 (DB 알테오젠 → 실제 보로노이), 3307 김대일 (DB 컴투스 → 실제 펄어비스)
- **3360 조현상의 4.5년 birthday 차이**가 가장 심각한 케이스. 데이터 보정 우선순위 1.
- 16.7% birthday 오류율은 여전히 ~10% threshold 초과. user direction에 따라 _notes 플래그만 달고 진행 중.

## Manifest

Added 10 batch-3 IDs to `DEEP_BIO_V2_IDS`. Total v2 manifest now contains 70 KR billionaires + 70 globals = ~140 entries.

## 2026-04-26 — Batch 4 (Tier 2, $0.63B–$0.76B)

10 files written. KR coverage: 70 → 80 / 203 (39.4%). No new birthday/source discrepancies in this batch.

| ID | 한글이름 | 영문 | NW | 일주 | 격국 | Primary sources |
|----|---------|------|----|----|----|-----------------|
| 3362 | 정성재 | Jung Sung-jae | $0.76B | 무술 | 상관격 | insightkorea, wiki 클래시스, sedaily 베인 인수, biz.heraldcorp |
| 3316 | 담철곤 | Dam Cheol-gon | $0.745B | 무술 | 편인격 | wiki 담철곤, namuwiki 담철곤, businesspost 373461, khan 담서원 |
| 3363 | 김상열 | Kim Sang-yeol | $0.74B | 을미 | 식신격 | namuwiki 김상열, wiki 김상열, businesspost 311418, insightkorea 야간고 |
| 3369 | 박관호 | Park Kwan-ho | $0.7B | 갑진 | 편인격 | businesspost 389982, shinailbo, biz.heraldcorp 복귀, m.mt 위메이드 |
| 3457 | 정지완 | Jung Ji-wan | $0.7B | 무오 | 건록격 | businesspost 373309, namuwiki 정지완, soulbrain 회사, asiae 코스닥협회장 |
| 3469 | 윤윤수 | Yoon Yoon-soo | $0.7B | 무신 | 정인격 | namuwiki 윤윤수, wiki 윤윤수, businesspost 31839, mt.co.kr 9000억, hankyung |
| 3364 | 이준호 | Lee Jun-ho | $0.69B | 기사 | 식신격 | businesspost 26514, wiki 이준호(기업인), namuwiki 이준호, namuwiki NHN |
| 3365 | 김남정 | Kim Nam-jung | $0.665B | 정사 | 식신격 | namuwiki 김남정, businesspost 102255, fntimes 회장, smartfn 4대 밸류체인 |
| 3370 | 정몽진 | Chung Mong-jin | $0.65B | 을축 | 편재격 | namuwiki 정몽진, wiki 정몽진, businesspost 331013, dealsite 영업외수익 |
| 3355 | 김형태 | Kim Hyung-tae | $0.63B | 경자 | 편재격 | businesspost 371391, namuwiki 시프트업, industrynews 1조 클럽, daily.hankooki |

## Cumulative status (40 entries researched)

- **Birthday discrepancies: 5 of 40 (12.5%)** — same 5 from batches 1–3 (3460, 3459, 3468, 3339, 3360); no new ones in batch 4
- **Source-field errors: 2 of 40 (5%)** — 3142 김현태 (보로노이 not 알테오젠), 3307 김대일 (펄어비스 not 컴투스)
- **3360 조현상의 4.5년 birthday 오차**가 여전히 가장 시급한 보정 항목
- 12.5% birthday 오류율은 여전히 ~10% threshold 초과

## Manifest

Added 10 batch-4 IDs to `DEEP_BIO_V2_IDS`. Total v2 manifest now contains 80 KR billionaires + 70 globals = ~150 entries.

## 2026-04-26 — Batch 5 (Tier 2, $0.47B–$0.6B)

10 files written. KR coverage: 80 → 90 / 203 (44.3%).

| ID | 한글이름 | 영문 | NW | 일주 | 격국 | Notes | Primary sources |
|----|---------|------|----|----|----|-------|-----------------|
| 3371 | 이해욱 | Lee Hae-wook | $0.6B | 갑인 | 건록격 | | namuwiki 이해욱, businesspost 352112, wiki 이해욱(1968), bloter 지배구조 |
| 3402 | 김태희 | Kim Tae-hee | $0.6B | 신축 | 편재격 | | namuwiki 김태희, wiki 김태희, sedaily 강남빌딩, news1 1400억 |
| 3458 | 이용한 | Lee Yong-han | $0.6B | 임진 | 편관격 | | businesspost 96669, namuwiki 원익그룹, the-economy 지배구조, daum 2세 경영 |
| 3372 | 김재철 | Kim Jae-chul | $0.53B | 계축 | 정관격 | | businesspost 91259, namuwiki 김재철, ceomagazine 부호탐구, hankyung KAIST 603억 |
| 3340 | 정몽원 | Chung Mong-won | $0.5B | 경자 | 정관격 | | namuwiki 정몽원, businesspost 432511, wiki 정몽원, m-i 재계인물 |
| 3344 | 황철주 | Hwang Chul-ju | $0.5B | 계미 | 정관격 | | businesspost 99073, namuwiki 주성엔지니어링, etnews IT구루, hankyung 50조 비전 |
| 3412 | 서장훈 | Seo Jang-hoon | $0.5B | 을해 | 상관격 | | r114 부동산114, hankyung 28→450억, segye 1000억, daum 홍대 |
| 3448 | 이승엽 | Lee Seung-yuop | $0.5B | 병신 | 식신격 | | namuwiki 이승엽, wiki 이승엽, samsunglions, m.seoul 두산감독 |
| 3455 | 조동혁 | Cho Dong-hyuk | $0.5B | 신유 | 상관격 | | namuwiki 조동혁(기업인), kjtimes 재계인물, namuwiki 한솔케미칼, c-journal |
| 3373 | 정몽규 | Chung Mong-gyu | $0.47B | 임자 | 정관격 | | namuwiki 정몽규, wiki 정몽규, businesspost 273667, m-joongang 축구협회 |

## Cumulative status (50 entries researched)

- **Birthday discrepancies: 5 of 50 (10.0%)** — same 5 from batches 1–3; no new ones in batches 4–5 (precisely at the 10% threshold)
- **Source-field errors: 2 of 50 (4%)** — 3142 김현태, 3307 김대일
- 5 batches × 10 entries = 50 entries done. KR coverage **44.3%** (90 of 203).
- Birthday error rate has come down to exactly 10% as more entries get checked — still recommend a birthday-audit pass but the urgency has eased.

## Manifest

Added 10 batch-5 IDs to `DEEP_BIO_V2_IDS`. Total v2 manifest now contains 90 KR billionaires + 70 globals = ~160 entries.

## 2026-04-26 — Batch 6 (Tier 3 start, $0.35B–$0.42B)

10 files written. KR coverage: 90 → 100 / 203 (49.3%) — milestone 50% reached.

| ID | 한글이름 | 영문 | NW | 일주 | 격국 | Notes | Primary sources |
|----|---------|------|----|----|----|-------|-----------------|
| 3016 | 김동관 | Kim Dong-kwan | $0.42B | 을축 | 정재격 | DB 1983-04-07 vs Wiki 1983-10-31 (7개월) | namuwiki, businesspost 383862, wiki 김동관(1983), thevaluenews |
| 3393 | 김봉진 | Kim Bong-jin | $0.4B | 을묘 | 정재격 | DB 10-30 vs Wiki 10-10 (20일) | namuwiki 김봉진, mt 우아한형제들, sidae 9조 매각 |
| 3411 | 조원태 | Cho Won-tae | $0.4B | 병자 | 상관격 | | namuwiki 조원태, businesspost 429406, news1 통합 대한항공 |
| 3439 | 정몽근 | Chung Mong-geun | $0.4B | 무인 | 편인격 | DB 05-25 vs Wiki 04-11 (6주) | wiki 정몽근, kjtimes, ehyundai 연혁 |
| 3464 | 김동녕 | Kim Dong-nyung | $0.4B | 기묘 | 건록격 | DB 01-10 vs Wiki 09-06 (8개월) | wiki 김동녕, businesspost 31446, etoday 지배구조 |
| 3465 | 임창욱 | Lim Chang-wook | $0.4B | 계유 | 상관격 | DB 02-12 vs Wiki 05-07 (3개월) | namuwiki 임창욱, businesspost, magazine.hankyung |
| 3470 | 홍석현 | Hong Seok-hyun | $0.4B | 무오 | 편재격 | DB 11-24 vs Wiki 10-20 (1개월) | namuwiki 홍석현, wiki 홍석현, businesspost 45259 |
| 3471 | 이정훈 | Lee Jung-hoon | $0.4B | 무진 | 양인격 | DB 1954-01-12 vs Wiki 1953-01-21 (12개월) | businesspost 251284, ceoscoredaily, seoul.co.kr 집념 |
| 3375 | 정몽윤 | Chung Mong-yoon | $0.36B | 무인 | 정관격 | | businesspost 330881, namuwiki 정몽윤, insightkorea 정경선 |
| 3001 | 박진영 | Park Jin-young | $0.35B | 임신 | 양인격 | | namuwiki 박진영, hankookilbo 장관급, businesspost 421400 |

## Cumulative status (60 entries researched)

- **Birthday discrepancies: 12 of 60 (20.0%)** — surge in batch 6 because Tier 2/3 entries have less precise birthday data in DB. **Trending back up above 10% threshold.**
- **Source-field errors: 2 of 60 (3.3%)** — same 2 from earlier
- KR coverage **49.3%** (100 of 203) — half-way milestone
- Recommend a focused birthday-audit pass especially for the older 2nd-gen chaebol heirs (정몽근, 정몽윤 type entries) where 1st-source DB may be unreliable.

## Manifest

Added 10 batch-6 IDs to `DEEP_BIO_V2_IDS`. Total v2 manifest now contains 100 KR billionaires + 70 globals = 170+ entries.
