# Deep Bio v2 — Cowork 배치 작업 가이드

## 🎯 목표
세계 부자 Top 50의 "사주 풀이용" 깊이 있는 전기(deep biography)를 Claude.ai Cowork(웹 인터페이스)에서 웹 서치로 리서치하여 v2 스키마 JSON으로 생성.

## 📂 파일 구조

| 파일 | 용도 |
|------|------|
| `scripts/deep-bio-schema-v2.json` | v2 스키마 정의 + 라잔 미탈 완성 예시 |
| `scripts/deep-bio-v2-prompt.md` | Cowork 세션 시작 시 붙여넣을 시스템 프롬프트 |
| `scripts/deep-bio-v2-top50.md` | Top 50 부자 리스트 + 각 부자별 요청 템플릿 |
| `public/deep-bios-v2/{id}.json` | **생성된 bio 저장 위치** (병렬 폴더, v1 건드리지 않음) |

## 🔁 작업 순서 (매 세션마다)

### 1. Cowork 세션 열기
- Claude.ai 웹 → 새 대화 → **웹 검색 기능 ON 확인**

### 2. 시스템 프롬프트 주입 (세션당 1번)
`scripts/deep-bio-v2-prompt.md` 파일의 **## 시스템 프롬프트** 섹션 내용을 전부 복사해서 첫 메시지로 붙여넣기.

추가로 `scripts/deep-bio-schema-v2.json` 의 라잔 미탈 예시도 함께 첨부하면 품질 ↑.

### 3. 부자별 요청
`scripts/deep-bio-v2-top50.md` 에서 원하는 부자의 요청 블록을 복사해서 붙여넣기.

예:
```
다음 부자의 deep bio v2를 생성해줘 (웹 검색 적극 활용):

- id: 1
- name: Elon Musk
- nameKo: 일론 머스크
- birthday: 1971-06-28
- netWorth: $809B
- nationality: US
- industry: Technology
- gender: M
- 일주: 갑신, 격국: 상관격

v2 스키마 JSON만 코드블록으로 출력. 최소 요건:
- careerTimeline 최소 5개 + 각 항목에 whyItMatteredKo
- turningPoints 최소 2개
- failures 최소 3개 + howTheyOvercameKo + lessonKo
- moneyMechanics 모든 필드
- capitalOrigin 명시 (self-made / inherited / mixed / political)
- characterKo 4개 필드
- 18세 이후 5-10년 공백기 금지
- 모든 주요 주장에 source URL
```

### 4. 결과 저장
Cowork가 반환한 JSON을 복사해서 **`public/deep-bios-v2/{id}.json`** 에 저장.

예: `public/deep-bios-v2/1.json` (일론 머스크)

### 5. 체크리스트 업데이트
`scripts/deep-bio-v2-top50.md` 상단의 진행 체크리스트에 `[x]` 표시.

## ⚙️ 한 세션에서 몇 명?

- **3~5명 연속 작업 가능** (Claude 컨텍스트 여유)
- 같은 산업/국가 부자들을 묶으면 웹 캐시 효과로 빠름
- 세션 길어지면 응답이 얕아지니 5명 초과하지 말 것

## ✅ 품질 검증 (저장 전 확인)

각 bio 저장 전 아래 항목 빠르게 체크:

- [ ] careerTimeline 5개 이상, 각 항목에 `whyItMatteredKo` 있음
- [ ] turningPoints 2개 이상
- [ ] failures 3개 이상, 각각 `howTheyOvercameKo` + `lessonKo`
- [ ] moneyMechanics 모든 subfield 채워짐
- [ ] `capitalOrigin.typeKo` 명시됨
- [ ] characterKo 4개 필드 모두
- [ ] 18세 이후 5-10년 공백기 없음
- [ ] source URL 있음 (허구 URL 아님)

부족하면 Cowork에 "failures가 2개뿐인데 하나 더 찾아줘" 같이 추가 요청.

## 🚨 주의

- **Hallucination 주의**: 특히 무명에 가까운 부자는 Cowork가 소스 없이 지어낼 수 있음. `source` 필드를 꼭 검증.
- **금액·연도 오류**: 웹 서치 결과를 그대로 받아쓰므로 Forbes/Bloomberg 원문과 한 번 크로스체크.
- **Top 50 외 부자**: 정보가 적어 웹 서치로 부족할 수 있음. 상위 50 끝나면 재평가.

## 🔗 서비스 연동 (나중에 이 세션에서)

v2 bio 일부가 생성되면, 사주 풀이 API 라우트를 수정:

```ts
// src/app/api/saju-summary/route.ts (가상)
const v2Path = `public/deep-bios-v2/${id}.json`;
const v1Path = `public/deep-bios/${id}.json`;
const bio = existsSync(v2Path) ? readJson(v2Path) : readJson(v1Path);
const useV2Prompt = existsSync(v2Path);
```

이후 v2 bio 있는 부자는 풍부한 프롬프트로, v1만 있는 부자는 기존 프롬프트로 분기.
