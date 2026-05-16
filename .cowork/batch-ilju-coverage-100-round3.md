# Cowork 메시지: 일주 커버리지 100명 배치 (3rd round)

2차 배치(100명, 8fc0536) 이후 갱신된 커버리지 기준 다음 100명.
전체 커버리지 50.6% → 53.8% 목표.

아래 코드 블록을 복사해서 Cowork에 붙여넣으세요.

---

```
다음 100명의 부자에 대해 deep bio JSON을 한 명씩 작성해줘.
각자 public/deep-bios-v2/{id}.json 위치에 저장.

작성 규칙·스키마·검증 명령은 .cowork/billionaire-bio-research.md 그대로 따라줘.

이번 배치 목적: 일주 커버리지가 여전히 낮은 30개 일주를 추가로 채움.
일주별로 묶여 있으니 한 그룹씩 처리하면 됩니다.

** 반드시 지킬 규칙 **
- 한자 표기 절대 금지. sajuConnection.summaryKo에 "정관격(正官格, ...)" 같은 한자 괄호 X.
  "정관격(공식 권위·규제 아래에서 일하는 구조)" 처럼 한국어 풀이만.
- "故 X" 대신 "고 X". 漢字 이름 괄호도 금지.
- 격국 용어는 첫 등장 시 한국어로 짧은 풀이 추가.
  예: "편관(강한 외부 압박·권력 충돌)"
- failures 최소 2개 (각각 lessonKo).
- careerTimeline 18세 이후 5-10년 공백 없게.
- sajuConnection.summaryKo는 일주/월지/격국을 사건과 명시 연결, 일반론 금지.

** 커밋 **
Claude가 일괄로 commit할테니 한 명씩 별도 commit 안 해도 됨.
파일만 public/deep-bios-v2/{id}.json 위치에 저장하면 됩니다.

## 무오 일주 (25/53 (47%) → +4 → 55%)
- id=943 | Winifred J. Marquart (위니프레드 J. 마르콰르트) | 1959-04-06 | US | Manufacturing | $4.3B
- id=955 | Aristotelis Mistakidis (아리스토텔리스 미스타키디스) | 1961-11-21 | GR | Metals & Mining | $4.3B
- id=1074 | Behdad Eghbali (베흐다드 에그발리) | 1976-05-06 | US | Finance & Investments | $3.9B
- id=1077 | Margaret Baker (마가렛 베이커) | 1965-09-01 | US | Healthcare | $3.9B

## 을유 일주 (25/53 (47%) → +4 → 55%)
- id=1019 | David Blitzer (데이비드 스콧 블리처) | 1969-09-07 | US | Sports | $4B
- id=1055 | Jed McCaleb (제드 맥케일럽) | 1975-06-08 | US | Finance & Investments | $3.9B
- id=1084 | Daniel Sundheim (다니엘 선드하임) | 1977-03-29 | US | Finance & Investments | $3.8B
- id=1162 | Jonathan Nelson (조너선 밀턴 넬슨) | 1956-05-18 | US | Finance & Investments | $3.6B

## 무자 일주 (25/53 (47%) → +4 → 55%)
- id=461 | Jim Kavanaugh (제임스 P. 캐버노) | 1962-10-17 | US | Technology | $7.7B
- id=693 | Marisa Del Vecchio (마리사 델 베키오) | 1958-07-10 | IT | Fashion & Retail | $5.7B
- id=797 | Isaac Perlmutter (아이작 펄머터) | 1942-12-01 | US | Media & Entertainment | $5.2B
- id=1247 | Brian Venturo (브라이언 벤투로) | 1984-10-21 | US | Technology | $3.3B

## 임진 일주 (27/57 (47%) → +4 → 54%)
- id=1139 | John Bicket (존 비켓) | 1980-03-20 | US | Technology | $3.6B
- id=1170 | Remo Ruffini (레모 루피니) | 1961-08-27 | IT | Fashion & Retail | $3.5B
- id=1515 | Jay Hennick (제이 헤닉) | 1957-01-20 | CA | Finance & Investments | $2.7B
- id=1545 | Anthony Langley (앤서니 존 랭글리) | 1954-12-02 | GB | Diversified | $2.6B

## 임인 일주 (23/48 (48%) → +4 → 56%)
- id=726 | Naguib Sawiris (나기브 온시 사위리스) | 1954-06-15 | EG | Telecom | $5.5B
- id=738 | Don Vultaggio (도메닉) | 1952-02-26 | US | Food & Beverage | $5.5B
- id=859 | Jorge Mas (호르헤 마스 산토스) | 1963-02-28 | US | Construction & Engineering | $4.8B
- id=872 | Jennifer Gilbert (제니퍼 길버트) | 1968-06-01 | US | Finance & Investments | $4.7B

## 기묘 일주 (24/50 (48%) → +4 → 56%)
- id=257 | Ernesto Bertarelli (에르네스토 실비오 마우리치오 베르타렐리) | 1965-09-22 | CH | Healthcare | $11.5B
- id=764 | Michael Intrator (마이클 인트레이터) | 1969-03-05 | US | Technology | $5.4B
- id=821 | Robert Faith (로버트 페이스) | 1963-10-03 | US | Real Estate | $5B
- id=1003 | Todd Christopher (토드 크리스토퍼) | 1962-10-08 | US | Fashion & Retail | $4.1B

## 신축 일주 (25/52 (48%) → +4 → 56%)
- id=529 | Philip Ng (필립 응) | 1959-09-16 | SG | Real Estate | $7B
- id=535 | Dario Amodei (다리오 아모데이) | 1983-01-13 | US | Technology | $7B
- id=1143 | Hemant Taneja (헤만트 타네자) | 1975-02-24 | US | Technology | $3.6B
- id=1210 | Bill Alfond (빌 알폰드) | 1948-05-16 | US | Fashion & Retail | $3.4B

## 병자 일주 (25/52 (48%) → +4 → 56%)
- id=1054 | Ugur Sahin (우우르 샤힌) | 1965-09-19 | DE | Healthcare | $3.9B
- id=1112 | Jonathan Kwok (조너선 곽) | 1992-03-01 | HK | Real Estate | $3.7B
- id=1221 | Alan Trefler (앨런 트레플러) | 1956-03-10 | US | Technology | $3.4B
- id=1405 | Karthik Sarma (카르티크 사르마) | 1974-12-01 | IN | Finance & Investments | $2.9B

## 갑진 일주 (32/66 (48%) → +4 → 55%)
- id=1482 | Massimo Doris (마시모 도리스) | 1967-06-09 | IT | Finance & Investments | $2.7B
- id=1512 | Jeff Sutton (제프 서턴) | 1960-01-17 | US | Real Estate | $2.7B
- id=1567 | Bruce Karsh (브루스 카시) | 1955-10-10 | US | Finance & Investments | $2.6B
- id=1576 | Emad Al Muhaidib (에마드 알 무하이디브) | 1957-02-01 | SA | Diversified | $2.6B

## 계묘 일주 (20/41 (49%) → +4 → 59%)
- id=628 | Robert Bass (로버트 배스) | 1948-03-19 | US | Energy | $6.3B
- id=789 | Mario Verrocchi (마리오 베로키) | 1957-07-30 | AU | Fashion & Retail | $5.2B
- id=951 | Beatriz Davila de Santo Domingo (베아트리츠 다빌라 데 산토 도밍고) | 1939-03-07 | CO | Food & Beverage | $4.3B
- id=1093 | Meg Whitman (마거릿 쿠싱 휘트먼) | 1956-08-04 | US | Technology | $3.8B

## 계해 일주 (21/43 (49%) → +3 → 56%)
- id=1273 | Thomas James (토머스 제임스) | 1942-05-10 | US | Finance & Investments | $3.2B
- id=1370 | Joel Greenberg (조엘 그린버그) | 1957-08-19 | US | Finance & Investments | $3B
- id=1412 | Sybill Storz (지빌 슈토르츠) | 1937-04-06 | DE | Healthcare | $2.9B

## 을해 일주 (26/53 (49%) → +3 → 55%)
- id=678 | Lutz Mario Helmig (루츠 마리오 헬미히) | 1946-08-29 | DE | Healthcare | $5.8B
- id=968 | Hamilton James (해밀턴 제임스) | 1951-08-03 | US | Finance & Investments | $4.3B
- id=1156 | James Packer (제임스 더글러스 패커) | 1967-09-08 | AU | Finance & Investments | $3.6B

## 갑신 일주 (27/55 (49%) → +3 → 55%)
- id=889 | Wendy Abrams (웬디 에이브럼스) | 1964-12-01 | US | Healthcare | $4.6B
- id=992 | Penny Pritzker (페니 수 프리츠커) | 1959-05-02 | US | Finance & Investments | $4.1B
- id=1081 | Edward DeBartolo Jr (에드워드 드바르톨로 주니어) | 1946-11-06 | US | Real Estate | $3.9B

## 정유 일주 (27/55 (49%) → +3 → 55%)
- id=672 | Leonardo Maria Del Vecchio (레오나르도 마리아 델 베키오) | 1995-05-06 | IT | Fashion & Retail | $5.9B
- id=842 | Steven Klinsky (스티븐 클린스키) | 1956-05-30 | US | Finance & Investments | $4.9B
- id=920 | James Chao (제임스 차오) | 1947-09-15 | US | Manufacturing | $4.5B

## 기미 일주 (29/59 (49%) → +3 → 54%)
- id=640 | Donald Trump (Donald John Trump) | 1946-06-14 | US | Real Estate | $6.2B
- id=663 | John Sall (존 샐) | 1948-04-04 | US | Technology | $6B
- id=735 | Jayshree Ullal (제이슈리 V. 울랄) | 1961-03-27 | US | Technology | $5.5B

## 정사 일주 (29/59 (49%) → +3 → 54%)
- id=281 | Mikhail Prokhorov (미하일 드미트리예비치 프로호로프) | 1965-05-03 | RU | Finance & Investments | $11B
- id=479 | Ronda Stryker (Ronda E. Stryker) | 1954-05-01 | US | Healthcare | $7.6B
- id=620 | Stefan Reimann-Andersen (슈테판 라이만-안데르센) | 1963-07-13 | DE | Fashion & Retail | $6.4B

## 정축 일주 (30/61 (49%) → +3 → 54%)
- id=1259 | Wolfgang Leitner (볼프강 라이트너) | 1953-03-27 | AT | Construction & Engineering | $3.3B
- id=1589 | George Joseph (조지 조지프) | 1921-09-11 | US | Finance & Investments | $2.5B
- id=1658 | Manuel Villar (마누엘 비야르) | 1949-12-13 | PH | Real Estate | $2.4B

## 병진 일주 (32/65 (49%) → +3 → 54%)
- id=245 | Pierre Omidyar (피에르 모라드 오미디아르) | 1967-06-21 | US | Technology | $11.9B
- id=323 | Daniel Kretinsky (다니엘 크르제틴스키) | 1975-07-09 | CZ | Energy | $9.9B
- id=342 | Dustin Moskovitz (Dustin Aaron Moskovitz) | 1984-05-22 | US | Technology | $9.6B

## 경신 일주 (23/46 (50%) → +3 → 57%)
- id=790 | Ian Livingstone (이언 리빙스턴) | 1962-05-22 | GB | Real Estate | $5.2B
- id=832 | Arturo Moreno (아르투로 모레노) | 1946-08-14 | US | Sports | $5B
- id=985 | Daniel Och (대니얼 오크) | 1961-01-27 | US | Finance & Investments | $4.2B

## 신묘 일주 (29/58 (50%) → +3 → 55%)
- id=1142 | Issad Rebrab (이사드 레브라브) | 1944-05-27 | DZ | Food & Beverage | $3.6B
- id=1145 | Fernando Chico Pardo (페르난도 치코 파르도) | 1952-02-15 | MX | Service | $3.6B
- id=1309 | E. Joe Shoen (에드워드 조지프 쇼언) | 1949-10-28 | US | Automotive | $3.2B

## 경오 일주 (28/56 (50%) → +3 → 55%)
- id=837 | Shen Guojun (선궈쥔) | 1962-07-31 | CN | Fashion & Retail | $4.9B
- id=1044 | Joao Roberto Marinho (João Roberto Marinho) | 1953-09-16 | BR | Media & Entertainment | $4B
- id=1138 | Dennis Bastas (데니스 바스타스) | 1966-09-08 | AU | Healthcare | $3.6B

## 계사 일주 (26/52 (50%) → +3 → 56%)
- id=1183 | Kommer Damen (코머르 다멘) | 1944-03-30 | NL | Manufacturing | $3.5B
- id=1196 | Michael Latifi (마이클 메르다드 라티피) | 1962-10-22 | CA | Food & Beverage | $3.5B
- id=1252 | Jack Gance (잭 갠스) | 1946-03-20 | AU | Healthcare | $3.3B

## 무진 일주 (28/56 (50%) → +3 → 55%)
- id=634 | Emanuele (Lino) Saputo (에마누엘레(리노) 사푸토) | 1937-06-10 | CA | Food & Beverage | $6.3B
- id=642 | Franz Viegener (프란츠 비게너) | 1983-02-09 | DE | Manufacturing | $6.2B
- id=655 | Robert Hale Jr (로버트 헤일 주니어) | 1966-07-08 | US | Telecom | $6B

## 병인 일주 (31/62 (50%) → +3 → 55%)
- id=871 | N. Murray Edwards (노먼 머리 에드워즈) | 1959-12-10 | CA | Energy | $4.7B
- id=954 | S. Curtis Johnson (S. 커티스 존슨) | 1955-05-05 | US | Manufacturing | $4.3B
- id=1010 | Bob Parsons (로버트 랄프 파슨스) | 1950-11-27 | US | Technology | $4.1B

## 을묘 일주 (26/52 (50%) → +3 → 56%)
- id=1209 | Ted Alfond (테드 알폰드) | 1944-08-19 | US | Fashion & Retail | $3.4B
- id=1416 | Glenn Dubin (글렌 러셀 듀빈) | 1957-04-13 | US | Finance & Investments | $2.9B
- id=1459 | Ted Turner (로버트 에드워드 터너 3세) | 1938-11-19 | US | Media & Entertainment | $2.8B

## 갑인 일주 (28/56 (50%) → +3 → 55%)
- id=187 | Shahid Khan (샤히드 라피크 칸) | 1950-07-18 | US | Automotive | $14.5B
- id=217 | J. Christopher Reyes (J. 크리스토퍼 레예스) | 1953-12-29 | US | Food & Beverage | $13.1B
- id=272 | John Malone (존 칼 말론) | 1941-03-07 | US | Media & Entertainment | $11.1B

## 을사 일주 (22/44 (50%) → +3 → 57%)
- id=858 | Gail Miller (캐런 게일 밀러) | 1943-10-14 | US | Automotive | $4.8B
- id=885 | Drayton McLane Jr (드레이턴 매클레인 주니어) | 1936-07-22 | US | Fashion & Retail | $4.7B
- id=986 | Baiju Bhatt (바이주 프라풀쿠마르 바트) | 1984-05-11 | US | Finance & Investments | $4.2B

## 정미 일주 (25/50 (50%) → +3 → 56%)
- id=1407 | Ge Weidong (거웨이둥) | 1969-02-01 | HK | Finance & Investments | $2.9B
- id=1591 | Eugene Murtagh (유진 머타) | 1942-06-23 | IE | Manufacturing | $2.5B
- id=1838 | Surya Midha (수리야 미다) | 2003-06-03 | US | Technology | $2.2B

## 무인 일주 (25/50 (50%) → +3 → 56%)
- id=1100 | Giorgio Perfetti (조르조 페르페티) | 1967-03-15 | IT | Food & Beverage | $3.8B
- id=1158 | Brian Acton (브라이언 액턴) | 1972-02-17 | US | Technology | $3.6B
- id=1167 | Lorenzo Fertitta (로렌초 페르티타) | 1969-01-03 | US | Sports | $3.5B

## 병오 일주 (22/44 (50%) → +3 → 57%)
- id=1119 | Danny Harris (대니 해리스) | 1972-05-15 | US | Fashion & Retail | $3.7B
- id=1206 | Ankur Jain (앙쿠르 자인) | 1990-02-10 | US | Finance & Investments | $3.4B
- id=1270 | P.V. Ramprasad Reddy (P.V. 람프라사드 레디) | 1958-03-30 | IN | Healthcare | $3.2B

```

---

## 진행 상황 확인

```bash
node -e '
const fs = require("fs");
const ids = fs.readFileSync("scripts/bio-targets-ilju-coverage-batch3.tsv","utf8")
  .split("\n").slice(1).filter(Boolean).map(l => l.split("\t")[0]);
const have = new Set([...fs.readdirSync("./public/deep-bios"), ...fs.readdirSync("./public/deep-bios-v2")]
  .filter(f => !f.startsWith("._")).map(f => f.replace(".json","")));
const done = ids.filter(id => have.has(id));
console.log(`${done.length}/${ids.length} done (${(done.length/ids.length*100).toFixed(1)}%)`);
'
```
