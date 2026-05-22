# Cowork 메시지: deep-bios-v2 한국어 자연스럽게 + 톤 ~합니다 통일

`public/deep-bios-v2/*.json` 1,390 파일에 있는 한국어 필드(`*Ko` 키)가
두 가지 문제를 가지고 있음:

1. **톤 불일치**: 어떤 인물은 `~입니다 / ~합니다` (격식), 어떤 인물은
   `~이다 / ~한다` (논픽션 평서체). 같은 매칭 페이지에서 카드끼리 톤이
   달라서 어색함.
2. **AI 작성 흔적**: 모든 bio가 LLM으로 생성됐고, 번역투(`~에 대해`,
   `~을 통해`, `되어진다`, `가지고 있다`), 쉼표 과다, AI 유행어, 명사화
   과다 같은 자연스럽지 않은 패턴이 누적돼 있음.

목표:
- **모든 `*Ko` 필드를 `~합니다 / ~입니다 / ~됩니다` (하십시오체)로 통일.**
- **humanizer 스킬로 AI 작문 패턴 제거 — 한국어 원어민이 쓴 것처럼 만들기.**

아래 코드 블록을 복사해서 Cowork에 붙여넣으세요.

---

```
public/deep-bios-v2/ 의 1,390개 JSON 파일에 있는 한국어 텍스트를
자연스럽고 일관된 한국어로 다듬어줘.

## 필수 도구: humanizer 스킬

이 작업은 humanizer 스킬(daleseo/korean-skills@humanizer)을 반드시
사용해야 함. 스킬이 KatFishNet 논문 기반으로 AI 작문 패턴 40가지를
S1/S2/S3 심각도로 감지하고 교정함.

**스킬 호출 방법**:
- 각 파일의 모든 `*Ko` leaf string을 합쳐서 humanizer 스킬에 넘김
- 스킬이 분석 + 자연스러운 버전 + 자연도 등급(A/B/C/D) 반환
- 자연스러운 버전을 원래 path에 다시 set

humanizer 스킬을 처음 호출하기 전에 SKILL.md를 한 번 읽어서
정확한 사용법 익혀.

## 대상

- 파일: `public/deep-bios-v2/*.json` (1,390개)
- 단, `._`로 시작하는 macOS AppleDouble 파일은 무시
- 필드: 키 이름이 `Ko`로 끝나는 모든 leaf 문자열
  예: bioKo, summaryKo, explanationKo, eventKo, whyItMatteredKo,
      whatTheyRiskedKo, whoHelpedKo, lessonKo, …
  - 깊이 무관 — 중첩 객체/배열 안에 있어도 다 찾아야 함
  - 영어 필드(키가 Ko로 안 끝남), source URL, id, name 등은 손대지 마

## 처리 규칙 (humanizer 출력 위에 얹는 후처리)

humanizer 스킬은 적절한 격식 수준을 "유지" 함. 그런데 이 프로젝트는
원본 데이터가 톤이 섞여 있어서, humanizer 호출 시 **명시적으로
하십시오체(~합니다 / ~입니다)로 통일하라고 요청**해야 함.

humanizer를 호출할 때 프롬프트에 다음을 포함:

> "다음 텍스트를 자연스럽게 다듬되, 모든 문장 종결을 `~합니다 /
>  ~입니다 / ~됩니다` (하십시오체 격식 정중체)로 통일해줘. 이미
>  격식체인 문장은 그대로 두고, `~이다 / ~한다 / ~했다 / ~였다 /
>  ~된다` 같은 평서체 종결만 격식체로 바꿔. 명사구 단편(동사 없음)은
>  활용할 게 없으니 그대로 두면 됨."

### 톤 변환 보조 표 (humanizer가 놓친 경우 수동 확인)

| Before (평서/문어체) | After (하십시오체) |
|---|---|
| ~이다. | ~입니다. |
| ~다. (동사 종결) | ~합니다 / 동사에 맞게 |
| ~았다. / ~었다. | ~았습니다 / ~었습니다. |
| ~했다. | ~했습니다. |
| ~였다. | ~였습니다. |
| ~된다. | ~됩니다. |
| ~한다. | ~합니다. |
| ~있다. | ~있습니다. |
| ~없다. | ~없습니다. |
| ~함. (명사형 종결) | ~합니다. (동사로 풀어서) |

### 까다로운 케이스 (단순 regex로 깨지는 곳)

- **종속절 안의 `~다`는 변경 금지**:
  - `~다고 말했다` → `~다고 말했습니다` (앞 ~다는 인용 표지, 그대로)
  - `~다는 평가가 있다` → `~다는 평가가 있습니다` (앞 ~다는 관형형)
  - `~다면`, `~다가` → 그대로 (연결어미)
  - 즉, **문장 끝의 `~다`만 변환**

- **인용문 내부는 그대로**:
  `"나는 매일 출근한다"고 말했다.` → `"…한다"고 말했습니다.`
  (큰따옴표 안의 `~한다`는 인용이라 보존)

- **명사형 종결 `~함 / ~됨`**:
  사전식 압축 문체. humanizer가 자연스러운 동사로 풀어줌.
  예: "1971년 출생." → "1971년에 태어났습니다."
  예: "공동 창업." → "공동 창업했습니다."

- **짧은 라벨은 변환 안 함**:
  "2024년", "수상 경력", "투자자" 같은 단어/연도/섹션 제목은 그대로.

## 절대 변경 금지

- **사실·숫자·이름·연도·금액·국적·인용문**: 한 글자도 바꾸지 마.
  humanizer의 "의미 보존 자체검증 6항"을 매 파일마다 통과해야 함.
- **영어 단어/약어**: SpaceX, IPO, M&A, CEO, AGI 등 그대로.
- **소스 URL**: 손대지 마.
- **고유명사 한국어 표기**: 일론 머스크, 정주영 등 그대로.

## 작업 흐름

1. **백업**: 시작 전에 한 번
   ```bash
   git add public/deep-bios-v2/ && git stash push -u -m "pre-tone-normalize backup"
   git stash pop
   ```
   (stash apply가 아니라 pop으로 다시 가져오기 — 백업 효과만 만들고
   working tree 유지. 진짜 롤백 필요 시 `git checkout HEAD -- public/deep-bios-v2/`)

2. **Dry run 먼저**: 처음 10개 파일은 변경 사항을 stdout에 출력하고
   파일 쓰지 마. 결과를 `.cowork/normalize-dry-run.md`에 정리.
   내가 확인한 후 OK 하면 전체 실행.

3. **본 실행**:
   - 파일별로:
     a. Read JSON → 파싱
     b. 재귀적으로 모든 `*Ko` leaf string 수집 (path 보존)
     c. 각 string을 humanizer 스킬에 위 프롬프트로 전달
     d. 자연도 등급 < B면 (= AI 흔적이 많이 남음) 한 번 더 호출
     e. 결과를 같은 path에 set
     f. 임시 파일에 쓴 뒤 rename으로 교체 (원자적)
   - 5파일마다 `.cowork/normalize-bio-tone-progress.json`에 완료 basename 배열 저장
   - 재시작 시 진행 파일 보고 스킵

4. **간헐적 검증**: 100파일마다 무작위 파일 1개를 다시 읽어
   - 변환된 문장 끝이 실제로 `~다 / ~한다` 등으로 남아있는지
   - 사실 변경이 있는지 (이름·숫자·연도 spot check)
   문제 5% 이상이면 멈추고 보고.

## 비용

스킬은 로컬 실행 — 외부 API 호출 없음. cowork 세션 토큰만 사용.

## 끝나면 보고

- 변환된 파일 수 + 변환된 string 수
- 자연도 등급별 분포 (A/B/C/D 각각 몇 개)
- 스킵된 케이스 샘플 10개 (이유와 함께)
- 변경 사항을 한 commit으로:
  ```
  Normalize and humanize Korean tone across all deep bios

  Every Ko-suffixed field in public/deep-bios-v2/*.json is now in
  formal polite (~합니다 / ~입니다 / ~됩니다) and run through the
  humanizer skill to strip AI-writing markers (translation-ese,
  comma overuse, AI clichés). Facts, numbers, names, quotes,
  English terms, and source URLs untouched.
  ```
```

---

## 실행 후 검증 (내가 직접)

코워크가 끝나면 아래로 spot-check:

```bash
# 무작위 5파일에서 문장 끝 ~다/~이다/~한다 잔존 여부
for f in $(ls public/deep-bios-v2/*.json | grep -v "^._" | shuf -n 5); do
  echo "=== $f ==="
  grep -oE '"[^"]*[가-힣]+다\."' "$f" | head -5
done
```

잔존이 거의 0이면 성공. 5% 이상이면 humanizer 호출 보완 필요.

```bash
# 사실 보존 확인: 무작위 인물 1명의 careerTimeline 연도 비교
diff <(git show HEAD:public/deep-bios-v2/1.json | jq '.careerTimeline[].year') \
     <(jq '.careerTimeline[].year' public/deep-bios-v2/1.json)
```

연도가 하나라도 바뀌었으면 humanizer가 사실을 건드린 것 — 롤백.
