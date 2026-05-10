# Cowork 채팅 메시지 템플릿

## 단일 부자 리서치 (한 명씩 보낼 때)

아래 메시지를 그대로 복사해서 Cowork 채팅에 붙여넣으면 됩니다. `{이름}`, `{id}`, `{birthday}` 등 변수만 바꿔서.

---

```
{이름} ({nameKo})의 deep bio JSON을 작성해줘.

부자 정보:
- id: {id}
- 이름: {name} / {nameKo}
- 생년월일: {birthday}
- 국적: {nationality}
- 산업: {industry}
- 순자산: {netWorth}B USD

저장 위치: public/deep-bios-v2/{id}.json

스키마는 public/deep-bios-v2/ 안의 기존 파일들과 같은 형식. 필수 필드:
childhood, capitalOrigin, moneyMechanics, personalTraits, characterKo,
careerTimeline (5-10개, 18세 이후 5-10년 공백 없게), turningPoints, wealthHistory,
failures (최소 2개, 각각 lessonKo 포함), quotes (있으면), sajuConnection.

작성 규칙:
1. 모든 한국어 필드는 단정형 어미 ("~합니다 / ~입니다") 베이스. "~예요" 한 문단 1번 이하.
2. 한자 표기 출력 금지 — "傷官格" 같은 괄호 한자 X. 한국어 풀이만.
3. 이모지 금지.
4. 사자성어(식상생재·탐재괴인 등) 한 단락 1개 초과 금지. 자연어로 풀이.
5. 금지 표현: "방랑기", "권력욕", "이상을 쫓아", "구설", "바람기", "호탕",
   "에너지를 강화", "잘 활용해야", "기회를 잘 잡아", "큰 변화 없는 시기",
   "당신을 살립니다", "당신도 같은 잠재력을 가진 사주" 같은 일반론.
6. 영어 직번역체 금지 — "X에서는 Y가 있으며" → "X엔 Y이며" / "X로 인해" → "X라서".
7. 텍스트 짧게. 새 디자인은 카드/표 위주라 산문 단락 길면 안 들어감.

리서치 소스 우선순위:
- 한국 부자 → 네이버 인물검색 / 나무위키 / 한국경제·매일경제 / 재벌닷컴
- 중국·아시아 → 한국어 기사 + 영어 위키
- 미국·유럽 → Wikipedia + Forbes + Bloomberg + 회사 공식

필수 체크:
- 생년월일이 billionaires.json과 일치
- 가족 관계 (재벌가) 정확 — cross-check 필수
- 모든 주요 주장에 source URL
- failures 최소 2개, 각각 lessonKo
- sajuConnection.summaryKo는 사주 차트 구체 요소 (일주·월지·격국·대운)와
  사건을 명시 연결, 일반론 금지

부자의 사주는 다음 명령으로 확인 후 sajuConnection 작성:

  npx tsx -e "
  import { calculateSaju, parseBirthday } from './src/lib/saju';
  const d = parseBirthday('{birthday}');
  const r = calculateSaju(d);
  console.log('사주:', r.saju.year.stem+r.saju.year.branch, r.saju.month.stem+r.saju.month.branch, r.saju.day.stem+r.saju.day.branch);
  console.log('일주:', r.ilju, '/ 월지:', r.wolji, '/ 격국:', r.gyeokguk);
  "

작성 후 검증:
- grep -E '[一-龥]' public/deep-bios-v2/{id}.json  → 한자 없어야
- 필수 필드 다 채워졌는지 확인

완료되면 commit:
git commit -m "Add deep bio: {nameKo} ({nationality}, {industry})"

자세한 규칙은 .cowork/billionaire-bio-research.md 참고.
```

---

## 빈 부자 한 명 골라 메시지 자동 생성

아래 명령으로 무작위 빈 부자 1명의 정보를 추출 → 위 템플릿에 붙여 채팅으로 던지면 됨:

```bash
node -e "
const all = require('./public/billionaires.json');
const fs = require('fs');
const have = new Set([
  ...fs.readdirSync('./public/deep-bios'),
  ...fs.readdirSync('./public/deep-bios-v2')
].map(f => f.replace('.json','')));

// 1순위: 한국·아시아 부자 중 빈 것
const targets = all.filter(p =>
  !have.has(p.id) &&
  ['KR','CN','JP','HK','TW','SG','TH','IN','ID','VN','MY','PH'].includes(p.nationality)
);

if (targets.length === 0) {
  console.log('한국·아시아 빈 부자 없음. 전체에서 고를게요.');
  // 2순위: 순자산 큰 부자 중 빈 것
  const fallback = all.filter(p => !have.has(p.id) && p.netWorth >= 5)
    .sort(() => Math.random() - 0.5);
  console.log(JSON.stringify(fallback[0], null, 2));
} else {
  const pick = targets.sort(() => Math.random() - 0.5)[0];
  console.log(JSON.stringify(pick, null, 2));
}
"
```

이 출력에서 id·name·nameKo·birthday·nationality·industry·netWorth를 위 템플릿 변수에 끼워서 채팅으로 던지세요.

---

## 여러 명 한 번에 던지기 (배치)

Cowork worker가 동시 처리 가능하면 5-10명을 한 메시지에 리스트로:

```
다음 부자들 deep bio JSON을 한 명씩 작성해줘 (각자 public/deep-bios-v2/{id}.json):

1. {nameKo1} ({id1}) — {birthday1}, {nationality1}, {industry1}
2. {nameKo2} ({id2}) — {birthday2}, {nationality2}, {industry2}
...

작성 규칙·스키마는 .cowork/billionaire-bio-research.md 따라줘.
한 명 끝날 때마다 commit (메시지: "Add deep bio: {nameKo}").
```
