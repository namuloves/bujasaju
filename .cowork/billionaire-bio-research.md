# Cowork 인스트럭션: 부자 Deep Bio 리서치 (간소화 v3)

이 문서는 **AI 리서처 (Claude/GPT/사람 worker)** 가 부자 한 명의 deep bio를 만들 때 따라야 할 규칙입니다. 결과 디자인이 짧은 카드 + 짧은 풀이 중심으로 바뀌었으니, **풍부한 산문보다 압축된 사실** 위주로 채워주세요.

---

## 작업 배경

부자사주(BujaSaju)는 한국·아시아 사용자에게 "내 사주와 비슷한 부자 5명"을 보여주는 서비스입니다. 새 디자인은:

- **결과 페이지 상단** — 비슷한 부자 얼굴 5개 가로 줄 (사진·이름·국가·산업·재산만)
- **얼굴 클릭 시** — 그 부자의 짧은 풀이 + Deep Bio 모달
- **Deep Bio 모달** — 사진 + 키 팩트 카드 (라벨-값 표) + 짧은 어록 + 실패 카드 + 사주 매칭

따라서 리서치 결과는 **카드·표·짧은 카피에 잘 맞아야** 합니다.

---

## 우선순위 (어떤 부자부터?)

`public/billionaires.json` 의 3080명 중 약 2256명이 deep bio가 비어 있습니다. 다음 순서로 채우세요:

### 1순위 — 한국·아시아 부자 (Korean/Asian focus)

서비스 사용자가 한국·아시아인이라 **국적이 KR/CN/JP/HK/TW/SG/TH/IN/ID/VN/MY/PH** 인 부자를 먼저. 이들은 영어 위키가 빈약하니 한국어·중국어·일본어 소스 우선.

### 2순위 — 순자산 큰 부자 (Net worth ≥ $5B)

전 세계 기준 영향력 큰 부자.

### 3순위 — 사주 매칭에서 자주 노출되는 일주

일주가 흔한 갑자·을축·병인 등은 매칭 노출 빈도 높음. 데이터 cover율 높이려면 일주별로 균형있게.

리서치 작업 시작 전에 이 명령으로 빈 부자 목록 확인 가능:

```bash
node -e "
const all = require('./public/billionaires.json');
const fs = require('fs');
const haveBio = new Set(fs.readdirSync('./public/deep-bios').map(f => f.replace('.json','')));
const haveBioV2 = new Set(fs.readdirSync('./public/deep-bios-v2').map(f => f.replace('.json','')));
const empty = all.filter(p => !haveBio.has(p.id) && !haveBioV2.has(p.id));
console.log('빈 부자:', empty.length);
console.log('한국/아시아 + 빈:', empty.filter(p => ['KR','CN','JP','HK','TW','SG','TH','IN','ID','VN','MY','PH'].includes(p.nationality)).length);
"
```

---

## 작업 단위

**한 번에 한 명만 처리하세요.** 한 명당 하나의 JSON 파일을 `public/deep-bios-v2/{id}.json`에 작성. (v1 디렉토리 `public/deep-bios/` 는 이전 포맷, 신규 생성은 모두 v2 사용)

---

## 출력 스키마 (필수 필드)

```json
{
  "id": "{billionaires.json의 id}",
  "name": "{영어 이름}",
  "nameKo": "{한국어 이름}",
  "nationality": "{2자리 국가코드, 예: KR, US}",
  "industry": "{billionaires.json의 industry 그대로}",
  "netWorth": {숫자, billionaires.json의 netWorth 그대로},

  "childhood": {
    "birthPlace": "City, Country",
    "birthPlaceKo": "도시, 국가",
    "familyBackground": "1-2 sentence English",
    "familyBackgroundKo": "1-2 문장 한국어",
    "education": "School name(s), degree(s)",
    "educationKo": "학교명, 학위",
    "earlyLife": "2-3 sentences English",
    "earlyLifeKo": "2-3 문장 한국어",
    "source": "출처 URL"
  },

  "capitalOrigin": {
    "typeKo": "self-made | inherited | mixed",
    "explanationKo": "한 줄 설명 — 자수성가/상속 비율, 가족 자본 유무"
  },

  "moneyMechanics": {
    "primaryRevenueKo": "이 사람이 돈을 버는 핵심 메커니즘 한 줄 (예: 'X 회사 지분 60% 보유, 배당+주가 상승')",
    "industryKo": "산업 한국어",
    "businessModelKo": "비즈니스 모델 한 줄"
  },

  "personalTraits": {
    "knownFor": "Known for X, Y, Z (English, 1 line)",
    "knownForKo": "X, Y, Z로 유명 (한국어, 1줄)",
    "philanthropy": "Philanthropy summary (English, optional)",
    "philanthropyKo": "자선 활동 (한국어, optional)",
    "controversies": "Major controversies (English, optional)",
    "controversiesKo": "주요 논란 (한국어, optional)"
  },

  "characterKo": {
    "summaryKo": "2-3 문장 — 인터뷰/기사에서 드러난 실제 성격, 일하는 방식",
    "tagsKo": ["태그1", "태그2", "태그3"]
  },

  "careerTimeline": [
    {
      "year": 1990,
      "age": 30,
      "event": "1-line English",
      "eventKo": "1줄 한국어",
      "whyItMatteredKo": "왜 결정적인지 1-2 문장",
      "source": "출처"
    }
  ],

  "turningPoints": [
    {
      "year": 1995,
      "ageAtTime": 35,
      "decisionKo": "결정 한 줄",
      "alternativeKo": "다른 선택지였다면 어땠을지",
      "outcomeKo": "결과 한 줄"
    }
  ],

  "wealthHistory": [
    { "year": 2010, "netWorth": 1.2 },
    { "year": 2020, "netWorth": 5.8 }
  ],
  "wealthHistorySource": "Forbes Real-Time Billionaires archive",

  "failures": [
    {
      "year": 2008,
      "description": "1-2 sentence English",
      "descriptionKo": "1-2 문장 한국어",
      "lesson": "Lesson learned (English)",
      "lessonKo": "교훈 한국어",
      "source": "출처"
    }
  ],

  "quotes": [
    {
      "text": "English quote",
      "textKo": "한국어 번역",
      "context": "When/where said",
      "contextKo": "언제/어디서",
      "source": "출처"
    }
  ],

  "books": {
    "authored": [
      { "title": "책 제목", "year": 2015, "noteKo": "한 줄 설명" }
    ],
    "recommended": [
      { "title": "추천 도서", "author": "저자", "whyKo": "왜 추천하는지" }
    ]
  },

  "sajuConnection": {
    "summary": "1-2 sentence English",
    "summaryKo": "사주 차트(일주·격국·대운)와 인생 사건의 연결을 한국어 1-2 문장. **명리 용어를 자연어로 풀어** 사용자가 이해하게."
  }
}
```

---

## 글쓰기 톤 (중요)

새 디자인은 **카드·표·짧은 카피** 위주이므로:

- **각 한국어 텍스트는 짧게** — 산문 단락보다 1-2 문장이 좋음
- **단정형 어미** ("~합니다 / ~입니다") 베이스, "~예요" 한 단락 1번 이하
- **한자어 직역체 금지** — "X에서는 Y가 있으며" → "X엔 Y이며", "X로 인해" → "X라서"
- **이모지 금지** — 어떤 필드에도 이모지 출력 안 함
- **사자성어 폭격 금지** — "식상생재(食傷生財)" 같은 한자 표기 출력 금지. 한국어 풀이만
- **금지 표현**: "방랑기", "권력욕", "이상을 쫓아", "한곳에 정착하지 못하는", "구설", "바람기", "호탕"
- **금지 표현 2**: "에너지를 강화", "잘 활용해야", "기회를 잘 잡아", "큰 변화 없는 시기"
- **금지 표현 3**: "당신을 살립니다", "당신도 같은 잠재력을 가진 사주" 같은 모든 부자에 적용 가능한 일반론

---

## 리서치 소스 우선순위

### 한국 부자
1. 네이버 인물검색: `https://search.naver.com/search.naver?query={이름}`
2. 나무위키: `https://namu.wiki/w/{이름}`
3. 한국어 위키백과
4. 한국경제·매일경제·조선일보·중앙일보·동아일보 인물 기사
5. 재벌닷컴
6. Forbes Korea, Bloomberg, 회사 공식 사이트, DART 공시

### 중국·아시아 부자
1. 한국어 검색 ("{이름}" + "회장" / "창업자" / "재산")
2. 영어 위키백과 + 영어 Bloomberg/Forbes
3. 중국어 위키백과 (참조만)

### 미국·유럽 부자
1. Wikipedia (영어)
2. Forbes Profile / Bloomberg Billionaires Index
3. 회사 공식 사이트 / SEC 공시
4. 한국어 정리 기사 (있으면) — 이름 한국어 표기 확인용

---

## 정확성 체크리스트

- [ ] 생년월일이 `billionaires.json`의 birthday와 일치?
- [ ] 국적·산업·순자산도 `billionaires.json` 그대로 (사주 계산 일관성 위해)
- [ ] 가족 관계 (재벌가) 정확히 cross-check?
- [ ] 모든 주요 주장에 source URL?
- [ ] careerTimeline 18세 이후 5-10년 공백 없음?
- [ ] failures 최소 2개 (3개 권장)?
- [ ] quotes 최소 1개 (있으면)?
- [ ] sajuConnection.summaryKo가 자연어로 풀려 있음?

---

## 검증 명령

JSON 파일 작성 후:

```bash
# 스키마 유효성
node -e "
const bio = require('./public/deep-bios-v2/{id}.json');
const required = ['id', 'name', 'nameKo', 'nationality', 'industry', 'childhood', 'careerTimeline', 'failures'];
const missing = required.filter(k => !bio[k]);
if (missing.length) console.error('Missing:', missing);
else console.log('OK', bio.nameKo, '— careerTimeline:', bio.careerTimeline.length, '/ failures:', bio.failures.length, '/ quotes:', bio.quotes?.length || 0);
"

# 한자 표기 검사 (출력 텍스트에 한자 없어야)
grep -E '[一-龥]' public/deep-bios-v2/{id}.json && echo "한자 발견 — 제거 필요" || echo "한자 없음"

# 이모지 검사
node -e "
const fs = require('fs');
const text = fs.readFileSync('./public/deep-bios-v2/{id}.json', 'utf8');
const emoji = text.match(/\p{Emoji_Presentation}/gu);
if (emoji) console.log('이모지 발견:', emoji);
else console.log('이모지 없음');
"
```

---

## 사주 정보 활용

`sajuConnection.summaryKo` 작성 시, 부자의 사주는 다음 명령으로 확인:

```bash
npx tsx -e "
import { calculateSaju, parseBirthday } from './src/lib/saju';
const d = parseBirthday('{birthday}');
const r = calculateSaju(d);
console.log('사주:', r.saju.year.stem+r.saju.year.branch, r.saju.month.stem+r.saju.month.branch, r.saju.day.stem+r.saju.day.branch);
console.log('일주:', r.ilju, '/ 월지:', r.wolji, '/ 격국:', r.gyeokguk);
"
```

이 사주를 인생 사건과 연결해서 1-2 문장으로 풀이.

예시:
> "찰스 어건의 신해 일주 + 인목 월지는 분석형 두뇌 + 정재의 끈기를 보여줍니다. 위성 TV 한 분야를 30년간 파고든 그의 끈기는 정재의 전형이고, 1992년 FCC 라이선스 입찰 같은 정밀한 결단은 신금의 예리함과 통합니다."

명리 용어(상관·정재·편재·정관 등)는 한 번 쓸 때마다 짧은 한국어 풀이를 괄호로 추가하세요. 예: "정재(고정 수입·실용적 재물)"

---

## 작업 흐름 (한 명 처리 시)

1. **billionaires.json에서 부자 찾기** — id, name, nameKo, birthday, nationality, industry, netWorth 확인
2. **사주 계산** — 위 명령으로 일주·월지·격국 확인
3. **리서치** — 우선순위 소스 순서대로
4. **JSON 작성** — 위 스키마 따라 `public/deep-bios-v2/{id}.json`에 저장
5. **검증** — 위 검증 명령 실행
6. **커밋** — 한 명당 한 커밋, 메시지: "Add deep bio: {nameKo} ({nationality}, {industry})"

---

## 자주 나오는 실수

- 한국 부자인데 영어 Wikipedia만 보고 작성 → 가족 관계 틀림 (이부진/이서현 헷갈림 등)
- 산문 단락이 너무 길어 카드에 안 들어감
- 사자성어를 한자 그대로 노출
- "방랑기" 같은 모든 부자에 적용 가능한 일반 표현 사용
- careerTimeline에 18세 이후 5-10년 공백
- failures가 1개 또는 0개 — 인터뷰·기사에서 실패 사례 더 찾기
- sajuConnection이 일반론 ("재능이 있어 사업 성공") — 사주 차트의 구체 요소(일주·월지·대운)와 사건을 명시 연결

---

## 빈 부자 한 명 추천 명령

```bash
# 한국·아시아 부자 중 빈 1명 무작위
node -e "
const all = require('./public/billionaires.json');
const fs = require('fs');
const have = new Set([...fs.readdirSync('./public/deep-bios'), ...fs.readdirSync('./public/deep-bios-v2')].map(f => f.replace('.json','')));
const targets = all.filter(p => !have.has(p.id) && ['KR','CN','JP','HK','TW','SG','TH','IN','ID','VN','MY','PH'].includes(p.nationality));
const pick = targets.sort(() => Math.random() - 0.5)[0];
console.log(JSON.stringify(pick, null, 2));
"
```

이 출력을 다음 작업 인풋으로 사용.
