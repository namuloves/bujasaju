# thegot.co.kr — verbatim output capture

**Date of attempt:** 2026-05-03
**Target DOB:** 1990-01-01 12:00, 양력, 남성, all advanced toggles default
**Target URL:** https://thegot.co.kr/saju → submit → /saju-result

## ⚠️ Capture failed

I was **not able to capture the dynamic interpretation text** for the requested DOB. Both attempts failed:

1. **Claude in Chrome MCP** — extension was unreachable for the entire session. Repeated `tabs_context_mcp` calls returned `"Claude in Chrome is not connected"`. The user will need to reconnect the extension (or run the capture themselves) for a full verbatim transcript.
2. **WebFetch fallback** — `/saju` is a static landing page with the form, and `/saju-result` without the right query string returns `⚠️ 잘못된 요청입니다. 필수 정보가 누락되었거나 올바르지 않습니다.` thegot's 만세력 + interpretation engine is **100% client-side JS** (the user already knew this). WebFetch only sees pre-render HTML, so the actual prose is not reachable this way.

For the engine plan, I'm working from:
- the static page chrome WebFetch did surface,
- thegot's own self-description (search results + page meta),
- generic Korean saju site conventions, which thegot largely follows,
- my own knowledge of how these engines are usually structured.

If/when the user can run the capture, the engine plan ([saju-engine-plan.md](./saju-engine-plan.md)) should be revisited against the actual prose for tone calibration — every section / input mapping in the plan is independently justified, so the plan is still useful, but the **tone and sentence cadence** will need a verbatim sample to match thegot's voice precisely.

---

## What we *did* capture from thegot

### Self-description (from page metadata + headings)

- Page title (saju): **"사주팔자 만세력 일간확인 무료보기"**
- Site name: **신묘하당** (Sinmyohadan)
- Tagline (search result): **"NASA 천문데이터 기반 만세력 무료 사주 서비스. SSS부터 D까지 등급 분석. 일주·격국·용신부터 대운 흐름까지 완벽 분석"**
- Form analyzing message: **"사주를 분석하고 있어요..."**

The matching page (`/match`, same engine) advertises:

> 시간축·십성·용신교차·일주·궁위·연운·납음 **7축** 전통 명리학 궁합

So thegot's stated analytical axes are:

| Axis (Korean) | Meaning |
|---|---|
| 시간축 | Time axis (year/month/day/hour pillar comparison) |
| 십성 | Ten gods |
| 용신교차 | Useful-god crossing |
| 일주 | Day pillar |
| 궁위 | Palace position (year=조상/parents, month=parents/social, day=self/spouse, hour=children/late life) |
| 연운 | Annual / great fortune cycles |
| 납음 | 60갑자 sound element (e.g. 갑자=해중금) |

This is broader than what we currently have in `buildSajuContext` — we lack 궁위 and 납음.

### Form inputs (verbatim from /saju)

- 양력/음력 (calendar type)
- 윤달 toggle (leap month)
- 년/월/일/시/분 (with 시 = "모름" option for unknown hour)
- 야자시 toggle (ya-ja-si: shifts dates after 11 PM to next day)
- 경도보정 toggle (longitude correction, Seoul-based, with historical offsets)
- 서머타임 toggle (DST adjustment)
- 성별 (male/female)
- Submit: **"운명 보기"**

### Common form / page strings

- "운명 보기" — submit
- "사주를 분석하고 있어요..." — loading
- "다시 입력하기" — back-to-input link
- Error: "⚠️ 잘못된 요청입니다 필수 정보가 누락되었거나 올바르지 않습니다."

### Inferred section structure (educated guess based on standard Korean saju layout + thegot's self-description)

This is **not verbatim** — these are the sections any 만세력 + 풀이 site of this calibre publishes, and which thegot's "7축" claim covers. Use as a planning aid, not as truth:

1. **사주 원국 (raw chart)** — 4 pillars, hanja, sipsung labels under each glyph
2. **만세력 정보** — 양/음력 변환, 24절기 기준 월주, 절입일까지의 일수 (used by 대운 start age)
3. **사주 등급 (SSS~D)** — thegot's signature gimmick, a 1-letter "tier" derived from 일간 강약 + 용신 적합도
4. **일주 분석** — single 60갑자 entry (we have this — `ilju.json`)
5. **십성 분포 / 십성 풀이** — count of each 십성 across all pillars, plus interpretation of dominants
6. **격국 (chart pattern)** — derived from 월지 + 일간; we have 12 entries
7. **오행 분포 + 용신** — count, dominant, missing, recommended useful-god
8. **십이운성** — 일간 vs each 지지 → 12-stage label per pillar
9. **신살** — list of triggered 신살 with effects per pillar (we have 8)
10. **합·충·형·파·해** — list per pillar pair (we have all of these)
11. **궁위 (palace) 분석** — what each pillar means: 년주=祖上, 월주=parents/social, 일주=self/spouse, 시주=children/late life
12. **대운** — 10 cycles forward from current age, each labeled with 십성 + 오행
13. **세운** — current year + next 1-2 years
14. **종합 풀이 (overall summary)** — 1-2 paragraphs synthesizing pillars together

Items 1, 4, 5, 6, 7, 8, 9, 10 we can already produce from the local JSON. Items 2, 11, 12, 13, 14 we cannot yet (12+13 need a 절기/대운 calculator; 11 needs a small data file; 14 needs the rule engine itself).

### Tone notes (from thegot's static copy)

The headlines are **comma-light, dot-heavy**, e.g. "무료 명리엔진으로 만세력을 확인해보세요." and "사주를 분석하고 있어요..." Short sentences. 해요/이에요 is mixed with 합니다/입니다 (closer to 입니다체 in their button copy: "운명 보기", "다시 입력하기"). Heavy use of hanja parentheticals: 시간축, 십성, 용신교차, 일주, 궁위, 연운, 납음 — every term appears with hanja in parens at first mention. Their tone is **less "친구 같은 상담" than thegot saying "I'm 신묘하당"** — more authoritative.

This is **inverted from our codebase preference** for 해요체 + warm tone (see `src/app/api/saju-summary/route.ts` lines 233–240). When we write our engine we should keep our existing tone (해요체, 짧은 문장, no "제공합니다") rather than copying thegot's slightly more formal voice — bujasaju.com's brand is matchmaking warmth, not 전문 사주가 권위.

---

## Open questions for next capture pass

When the Chrome extension is back, the capture should specifically extract:

1. **Section headers** — what exact words does thegot use? (e.g. "사주팔자" vs "사주원국", "오행분석" vs "오행 밸런스", "용신" vs "필요한 오행")
2. **Sentence templates** — for an arbitrary 일간/월지 combination, what's the exact prose pattern? Especially: do they reference earlier sections in later sections? (e.g. does 격국 풀이 say "앞서 본 일주의 ~한 기질이 격국에서 ~로 발현됩니다"?)
3. **Imbalance handling** — when an 오행 is missing or a 십성 is dominant, what's the **specific wording** of the warning + remedy? Avoid "이를 보충하는 용신을 활용하세요" placeholder advice.
4. **Length of each section** — number of sentences, paragraph vs bullet, hanja density.
5. **Cross-section synthesis** — is there a final 종합 풀이 that ties everything together, or is each section independent?
6. **사주 등급 derivation** — what inputs produce SSS vs A vs C? (Their SEO copy implies it exists but the math is opaque.)

Without the verbatim sample, the engine plan in [saju-engine-plan.md](./saju-engine-plan.md) intentionally **does not** try to reproduce thegot's grading or palace logic — those would be guess-work. It focuses on what we can do as well or better than thegot using the data we already have.
