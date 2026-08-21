# bujasaju.com 사주풀이 프로젝트 — 인수인계 문서

> 작성 시점: 2026-08-21. Claude 세션에서 ChatGPT로 넘기기 위한 문서.
> 이 문서 하나만 읽으면 이어서 작업할 수 있도록 썼습니다.

---

## 1. 프로젝트

**bujasaju.com** — 전 세계 부자 3,053명의 사주(四柱)를 보여주는 한국어 사이트.

- Next.js 16.2.2 / Vercel 배포
- 로컬 리포: `/Volumes/moona cloud/CODE/sajubuja` (macOS 네트워크 볼륨)
- GitHub: `namuloves/bujasaju`
- 애드센스 `ca-pub-5850602718784942` 적용됨

### 핵심 데이터 파일

| 파일 | 내용 |
|---|---|
| `private-data/enriched-billionaires.json` | **사주 원본(진실의 출처)**. 3,053명의 생년월일 + 사주 8자. 사이트가 실제로 렌더링하는 것은 이 파일. |
| `private-data/deep-bios-v2/{id}.json` | 인물별 딥바이오 1,853개. 유년기·자본출처·커리어연표·전환점·실패·성격 등 + `sajuConnection`(사주풀이) |

### 관련 코드

| 파일 | 역할 |
|---|---|
| `src/lib/deepBio.ts` | `SajuConnection` 타입 정의, `hasStructuredReading()` |
| `src/components/deep-bio/DeepBioContent.tsx` | 사주풀이 렌더링. `basis`를 회색 글자로 표시, 대운 천간/지지 오행별 색상 |
| `scripts/verify-saju.ts` | 검증기 (TypeScript, `npx tsx`) |
| `scripts/verify-saju.mjs` | 검증기 (순수 node — **맥에서는 이걸 쓸 것**) |
| `scripts/daeun-helper.py` | 대운 계산기 (절기·순행역행·십성) |

---

## 2. 지금까지 한 일 (요약)

### 2-1. 데이터 오염 발견 및 수정 (완료)

`deep-bios-v2`의 `ilju`(일주)·`gyeokguk`(격국) 필드가 **생성기가 계산한 게 아니라 지어낸 값**이었습니다.
672개 중 **일주 14개, 격국 402개(60%)가 틀림**. 아무도 못 잡은 이유는 아무도 검사하지 않았고, 그 필드를 화면에 안 쓰기 때문(컴포넌트는 `person.saju`를 읽음).

→ 전부 수정 완료. `enriched-billionaires.json`은 100% 정확함을 확인.
→ 재발 방지용으로 `scripts/verify-saju.ts` (+ `.mjs`) 작성.

**교훈: 사주 관련 필드는 절대 LLM이 "채우게" 두면 안 됨. 반드시 계산하거나 원본에서 복사.**

### 2-2. 스키마 교체 (완료)

기존 `sajuConnection`은 자유 서술 한 문단(`summaryKo`)이었습니다. 그래서 풀이가 전부 뻔했습니다 —
**한 문단짜리 필드는 구체적으로 쓸 자리가 없습니다.** 이게 "여기 알맹이가 없다"의 구조적 원인이었습니다.

새 스키마 (`src/lib/deepBio.ts`):

```ts
interface SajuClaim { textKo: string; basis: string[] }
interface SajuDaeun { range: string; pillar: string; years?: string; textKo: string; linkedEvents?: string[] }

interface SajuConnection {
  summary?: string; summaryKo?: string;        // 레거시 (구형 기록용)
  chart?: { ilgan?; ilju?; wolji?; gyeokguk?; pillars? };
  johuKo?: SajuClaim;      // 조후 — 계절과 일간, 이 사주에 급한 것
  structureKo?: SajuClaim; // 격국·구조 — 어떤 사람인가
  wealthKo?: SajuClaim;    // 재물 구조 — 돈이 어디서 어떻게 오는가
  riskKo?: SajuClaim;      // 리스크 — 합충형, 취약점
  daeunKo?: SajuDaeun[];   // 대운 + 실제 사건 연결
  oneLineKo?: string;      // 한 줄 요약
}
```

**`basis`가 핵심 장치입니다.** 모든 주장은 사주 글자를 근거로 대야 하고, 검증기가 그 글자가 실제로 그 사람 사주에 있는지 자동 확인합니다. 근거를 못 대면 그 문장은 그 사주에서 나온 게 아니라는 뜻입니다.

### 2-3. 손으로 쓴 풀이 169명 (완료)

**한국인 172명 중 167명 완료.** 나머지 5명은 생일 출처가 의심스러워 보류.

작업 순서는 트래픽 기준이었습니다 (한국인 페이지가 제일 많이 조회됨):
최태원 → 재계 오너 → BTS 6명 + 손흥민 → 연예인 → 대기업 전문경영인 → 오너 가문.

마지막 커밋: `a8bdcfd`
검증기 결과: **CHART 3053/0 · MIRROR 671/0 · BASIS 2236/0 전부 통과**

---

## 3. 지금 직면한 문제 — 결정이 필요한 지점

### 남은 물량

```
전체 3,053명 (bio 파일 1,853개)
├─ new    169명  ← 새 스키마 풀이 완료
├─ empty  397명  ← 딥바이오는 있는데 사주풀이가 아예 없음
├─ legacy 1,183명 ← 옛날 한 문단짜리 풀이만 있음
└─ nobio  1,304명 ← 딥바이오 자체가 없음
```

**손으로 6명씩 쓰면 2,500명 = 400배치 이상. 물리적으로 불가능합니다.**

### 그런데 데이터를 보니 답이 나옵니다

**세계 자산 순위 상위 100명 중 98명이 사주풀이가 없습니다.** 그것도 대부분 `empty` —
**딥바이오(커리어연표·전환점·실패)는 이미 다 있고 사주풀이만 비어 있는 상태**입니다.

```
244B  래리 페이지     [empty]
225B  세르게이 브린    [empty]
223B  제프 베조스     [empty]
197B  마크 저커버그    [empty]
188B  래리 엘리슨     [empty]
141B  워런 버핏      [empty]
104B  빌 게이츠      [empty]
94B   무케시 암바니    [legacy]
...
```

이건 최태원 때와 **똑같은 문제**입니다. 이름은 제일 유명하고, 자료는 이미 있고, 풀이만 없습니다.

### 권장안: 글로벌 톱 100

1. **유한합니다.** 6명씩 17배치. 지금 속도면 끝이 보입니다.
2. **자료가 이미 있습니다.** `empty`라서 careerTimeline·turningPoints가 그대로 있어, 대운↔사건 연결이 한국인 때와 같은 품질로 나옵니다. `nobio` 1,304명은 차트만으로 써야 해서 품질이 확 떨어집니다.
3. **검색어가 실재합니다.** "베조스 사주", "머스크 사주", "저커버그 사주" — 한국에서 찾는 말이고, 이 각도로 쓴 곳이 거의 없습니다.
4. **legacy 1,183명은 급하지 않습니다.** 한 문단이라도 있어서 페이지가 비어 보이진 않습니다.

### 대안

- **톱 30만 먼저** 쓰고 조회수 반응 보고 결정 (5배치)
- **보류 5명 해결** — 구광모·송치형·유정현·이동채·이채윤. 생일 출처 웹 확인 후 작성. 구광모(LG 회장)는 트래픽이 큼
- **글쓰기 멈추고 SEO/블로그** — 167명을 실제 트래픽으로 바꾸는 작업
- **생성기 재시도** — 169개 예시 + 엄격한 스키마 + BASIS 자동 검증이 갖춰졌으므로, 예전 생성기가 실패했던 조건(자유서술 한 문단)은 이제 없음. 톱 100을 손으로 쓴 뒤 그 169+100개를 few-shot으로 써서 tail을 생성하는 게 현실적인 마지막 수단.

---

## 4. 작업 절차 (그대로 따라하면 됨)

### 4-1. 사주 + 대운 뽑기

```bash
cd "/Volumes/moona cloud/CODE/sajubuja"
python3 - <<'PY'
import json,sys,os,datetime as dt
sys.path.insert(0,'scripts'); import importlib.util
spec=importlib.util.spec_from_file_location('dae','scripts/daeun-helper.py')
dae=importlib.util.module_from_spec(spec); spec.loader.exec_module(dae)

E=json.load(open('private-data/enriched-billionaires.json',encoding='utf-8'))
people=E if isinstance(E,list) else E.get('people',[])
by={str(p.get('id')):p for p in people}
TZ=dt.timezone.utc

for pid in ['4','5','11']:          # ← 여기에 대상 id
    p=by[pid]; s=p.get('saju',{}); sj=s.get('saju',{})
    b=p['birthday'][:10]; y,m,d=int(b[:4]),int(b[5:7]),int(b[8:10])
    birth=dt.datetime(y,m,d,3,0,tzinfo=TZ)      # 12:00 KST
    mp=sj['month']['stem']+sj['month']['branch']; ys=sj['year']['stem']
    dirn,start,out=dae.daeun(birth,p.get('gender','M'),mp,ys)
    ds=sj['day']['stem']
    ss=lambda st: dae.sipsin(ds,dae.EL_S[st],'양' if st in dae.YANG_STEM else '음')
    sb=lambda br: dae.sipsin(ds,dae.EL_B[br],dae.BR_POL[br])
    print('='*60)
    print(pid,p.get('nameKo'),b,p.get('gender'),'|',s.get('ilju'),s.get('gyeokguk'),'|',dirn,f'{start}세')
    for k in ['year','month','day','hour']:
        ju=sj.get(k)
        if ju: print(f"   {k}: {ju['stem']}{ju['branch']}  {ss(ju['stem'])}/{sb(ju['branch'])}")
    for r,pl,yr in out[:7]:
        print(f"   대운 {r} {pl} {yr}  {ss(pl[0])}/{sb(pl[1])}")
PY
```

**주의:** `dae.daeun()`은 tz-aware datetime을 요구합니다. naive를 넣으면 `TypeError`.

### 4-2. 딥바이오 읽기 (사건 연결용)

```bash
python3 -c "
import json
for pid in [4,5,11]:
    d=json.load(open(f'private-data/deep-bios-v2/{pid}.json',encoding='utf-8'))
    print('='*70); print(pid, d.get('nameKo'), d.get('birthday'), d.get('netWorth'))
    for k in ['capitalOrigin','careerTimeline','turningPoints','failures','characterKo']:
        v=d.get(k)
        if not v: continue
        print('--',k)
        if isinstance(v,list):
            for e in v[:9]: print('   ', json.dumps(e,ensure_ascii=False)[:320])
        else: print('   ', json.dumps(v,ensure_ascii=False)[:500])
"
```

### 4-3. 쓰기 (한 번에 3명씩)

```python
cd "/Volumes/moona cloud/CODE/sajubuja" && python3 - <<'PY'
import json
def w(pid, sc):
    P=f'private-data/deep-bios-v2/{pid}.json'
    d=json.load(open(P,encoding='utf-8')); d['sajuConnection']=sc
    open(P,'w',encoding='utf-8').write(json.dumps(d,ensure_ascii=False,indent=2)+"\n")
    print('OK',pid,d.get('nameKo'))
def C(t,b): return {"textKo":t,"basis":b}
def D(r,p,y,t,e): return {"range":r,"pillar":p,"years":y,"textKo":t,"linkedEvents":e}

w(4, {
 "chart":{"ilgan":"…","ilju":"…","wolji":"…","gyeokguk":"…",
          "pillars":{"year":"…","month":"…","day":"…","hour":None}},
 "johuKo":C("…", ["일간 X","월지 Y"]),
 "structureKo":C("…", ["…"]),
 "wealthKo":C("…", ["…"]),
 "riskKo":C("…", ["…"]),
 "daeunKo":[ D("31~40","경신","2001~2010","…", ["2003 …"]) ],
 "oneLineKo":"…"})
PY
```

**한 번에 6명 이상 넣으면 device_bash가 타임아웃 나고 아무것도 안 써집니다. 3명씩 두 번이 안전합니다.**

### 4-4. 검증 → 커밋

```bash
cd "/Volumes/moona cloud/CODE/sajubuja"
node scripts/verify-saju.mjs
# CHART 3053/0 · MIRROR 671/0 · BASIS N/0  전부 0이어야 함

mkdir -p _to_delete && mv .git/*.lock _to_delete/ 2>/dev/null
git add -A private-data/deep-bios-v2
git commit -m "saju: hand-written structured readings for N profiles"
mv .git/*.lock _to_delete/ 2>/dev/null
rm -rf _to_delete
git push origin main
```

---

## 5. 글쓰기 기준 (품질의 핵심)

169명을 쓰면서 잡힌 규칙입니다. **이걸 안 지키면 예전처럼 뻔한 글이 나옵니다.**

### 반드시 지킬 것

1. **모든 주장에 사주 글자 근거를 댈 것.** `basis`에 못 넣을 문장이면 그 문장은 지운다.
2. **합·충·형·원진을 반드시 찾을 것.** 이게 글의 뼈대다. 삼합(신자진·해묘미·인오술·사유축), 육합, 육충, 삼형(축술미·인사신), 원진(자미·축오·인유·묘신·진해·사술), 복음(같은 간지 반복).
3. **대운마다 실제 사건을 붙일 것.** `linkedEvents`가 비면 그 대운 문단은 점성술이 된다. 연도가 딥바이오에 있는 것만 쓴다 — **없는 사건을 지어내면 안 됨.**
4. **없는 것을 말할 것.** 무재(재성 없음), 무관, 화 부재 — 없는 오행이 그 사람 인생을 가장 잘 설명하는 경우가 많다. 지금까지 제일 좋은 풀이는 전부 결핍에서 나왔다.
5. **오행 개수를 세고 신강/신약을 판단할 것.** 재다신약, 관살과다, 비겁과다, 인성과다(도식), 설기과다 — 이게 그 사람이 왜 그렇게 살았는지를 설명한다.
6. **경어체, 한 문단 4~8문장.** 한자는 처음 나올 때만 괄호로: `사해충(巳亥沖)`.

### 잘 나온 패턴 (반복해서 써먹을 것)

| 패턴 | 예시 |
|---|---|
| 원국에 없던 글자가 대운에서 옴 | 무재사주가 재성 대운에 부를 확정 |
| 합으로 없던 오행이 생성됨 | 박세창 무계합화로 재성 만들어짐 |
| 복음(대운=원국 간지) | 정국 병오 복음 10년이 인생 전체의 정점 |
| 삼합 완성 | 김정완 사유축, 배용준 신자진 |
| 형(刑)은 갈아내는 것 | 지민 축술미 삼형 — 성취와 소모가 같은 10년 |
| 원진은 오래된 관계가 원한이 됨 | 최윤범 묘신 원진 = 75년 동업 가문과의 분쟁 |
| 식신제살 | 최수연·송인준 — 압박을 실력으로 제압 |
| 살인상생 | 차석용·이경하 — 압박을 배움으로 전환 |
| 재생살 | 김영섭·임종룡 — 벌수록 규제가 무거워짐 |
| 군겁쟁재 | 허명수·허연수 — 형제가 하나의 재물을 나눔 |
| 같은 사주 짝 비교 | 배용준↔방시혁 (년월주 동일), 이주성↔이태성 (동갑 사촌, 정반대) |

### 완성 예시 (배용준, id 3441)

```json
{
  "chart": { "ilgan": "임", "ilju": "임진", "wolji": "신", "gyeokguk": "편인격",
             "pillars": {"year":"임자","month":"무신","day":"임진","hour":null} },
  "johuKo": {
    "textKo": "임수는 시내가 아니라 강이고 바다입니다. … 월지 신, 년지 자, 일지 진이 신자진(申子辰) 삼합 수국을 완성합니다. 사주 여섯 글자 중 다섯이 물 하나로 수렴합니다. 이렇게 한 기운으로 쏠린 사주는 세상이 그 사람을 한 가지 이미지로만 기억합니다.",
    "basis": ["일간 임","월지 신","년지 자","일지 진"]
  },
  "structureKo": {
    "textKo": "편인격입니다. … 흥미로운 것은 방시혁의 사주와 년주·월주가 임자·무신으로 글자 하나 다르지 않다는 점입니다. 다른 것은 일지 하나 — 방시혁은 신금이 한 번 더 와서 편인이 두 겹이 되고, 배용준은 진토가 와서 신자진 수국을 완성합니다. 만드는 사람과 보여지는 사람이 여기서 갈립니다.",
    "basis": ["월지 신","일지 진","일간 임","년지 자"]
  },
  "wealthKo": {
    "textKo": "이 사주에는 재성(財星)이 한 글자도 없습니다. … 재물이 원국에 없는 사주는 현금흐름으로 부를 쌓지 않습니다 — 흐르는 것을 한 번에 가둬서 자산으로 바꿉니다. 2006년 KeyEast를 세워 자기 이름을 회사라는 그릇에 담고, 2018년 그 회사를 SM C&C에 넘겨 지분으로 환원한 경로가 정확히 그 방식입니다.",
    "basis": ["월간 무","일간 임","일지 진"]
  },
  "riskKo": { "textKo": "…", "basis": ["년주 임자","월간 무","일간 임"] },
  "daeunKo": [
    { "range":"23~32","pillar":"신해","years":"1995~2004",
      "textKo":"신금 정인과 해수 비견, 물이 더 불어나는 자리입니다. 이미 수국으로 쏠린 사주에 물이 더 오면 그 한 가지 이미지가 걷잡을 수 없이 커집니다.",
      "linkedEvents":["1994 KBS 드라마 데뷔","2002 '겨울연가' 일본 NHK 방영","2003 일본 '욘사마' 정체성 정립"] }
  ],
  "oneLineKo": "여섯 글자 중 다섯이 물로 쏠려 한 시대의 이미지가 되어버린 사람이, 마흔셋에 처음 만난 흙으로 그 물을 가둬 자산으로 바꾼 사주."
}
```

---

## 6. 함정 (반드시 읽을 것)

### 6-1. 맥 네트워크 볼륨 관련

- **AppleDouble 사이드카**: `deep-bios-v2`에 `._1234.json` 파일이 1,751개 있습니다. `.json`으로 끝나지만 바이너리라서 파싱하면 터집니다. Python `glob`은 숨기지만 **Node `readdirSync`는 반환합니다.** 반드시 `!name.startsWith('.')` 필터를 넣으세요.
- **`.git/*.lock` 잔존**: 네트워크 마운트 위에서 커밋하면 락 파일이 남습니다. git 명령 전후로 `_to_delete/`로 옮기고 나중에 `rm -rf _to_delete`.

### 6-2. 사주 계산

- `dae.daeun(birth, gender, month_pillar, year_stem)` — birth는 **tz-aware** datetime. KST 정오는 `dt.datetime(y,m,d,3,0,tzinfo=timezone.utc)`.
- 대운 방향: 년간이 양간(갑병무경임)이고 남자 → 순행. 음간이고 여자 → 순행. 나머지 역행.
- 지지 음양 관례가 이 프로젝트는 **자=음, 해=양, 사=양, 오=음**입니다 (사이트 렌더링과 대조해서 확인함). 일반 교재와 다를 수 있으니 `daeun-helper.py`의 `BR_POL`을 따르세요.
- 일주 검산: 2000-01-01 = 무오. `verify-saju.mjs`가 이걸 시작할 때 assert 합니다.

### 6-3. 딥바이오 신뢰도

일부 인물(특히 전문경영인)의 딥바이오는 **템플릿으로 생성된 뻔한 문장**입니다. 예: 박정호의 "1996년 SK스퀘어·SK하이닉스 본업이 카테고리 1위 자리로 단계적 도약" — 사실과 안 맞습니다.

→ **연도가 애매하거나 표현이 일반적이면 `linkedEvents`에 넣지 마세요.** 차트 기반으로만 쓰고 대운 문단은 사건 없이 갑니다. 지어내는 것보다 비우는 게 낫습니다.

### 6-4. 푸시

Claude 세션에서는 네트워크 제약으로 `git push`가 안 됐습니다. 로컬에서 직접 하세요:

```bash
cd "/Volumes/moona cloud/CODE/sajubuja" && rm -rf _to_delete && git push origin main
```

---

## 7. 보류된 5명

생일 출처를 웹에서 확인한 뒤에 작성해야 합니다. (생일이 틀리면 사주 전체가 틀립니다.)

| id | 이름 | 저장된 생일 | 비고 |
|---|---|---|---|
| 1691 | 유정현 | 1969-01-01 | 1월 1일 = 자리표시자 의심 |
| 1728 | 송치형 | 1979-09-01 | 9월 1일 = 자리표시자 의심 |
| 1798 | 이동채 | 1959-12-10 | |
| 2111 | 이채윤 | 1950-08-06 | |
| 2156 | 구광모 | 1978-02-09 | LG 회장. 트래픽 큼. 우선 확인 권장 |

`enriched-billionaires.json`에서 `birthday`가 `MM-01` 또는 `01-01`인 레코드는 전부 의심 대상입니다.

---

## 8. 미해결 / 하면 좋은 것

- `/privacy`, `/terms` 페이지에 `<CleanNav />` 헤더 추가 (`/about`은 이미 함)
- `bujasaju.com/blog` 구축 — 노출 극대화용
- GA4 커스텀 디멘션 등록 (퀴즈 응시자 vs 프로필 열람자 비교. `src/lib/analytics.ts`의 `trackEvent`가 이미 이벤트는 쏘고 있으나, GA4에서 Custom Dimension으로 등록해야 조회 가능)
- 톱 100 작업 후 조회수 변화 측정 → 계속할지 결정

---

## 9. 현재 상태 한 줄 요약

> 사주 데이터 오염은 잡혔고 재발 방지 검증기가 있음. 새 스키마로 손으로 쓴 풀이 169명 완료(한국인 사실상 전부). 남은 2,500명은 손으로 불가능. **세계 톱 100이 딥바이오는 있는데 풀이만 비어 있는 상태라 그게 다음 타깃으로 가장 합리적.**
