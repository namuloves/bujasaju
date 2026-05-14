# Local saju-data audit

Audit of every JSON file under [public/saju-data/](../public/saju-data). For each: what's there, what's the prose quality, what's missing. Then a gap analysis vs the engine plan.

**TL;DR.** Our static data is **already as deep as 사주바주's** for 일주, 십성, 격국, 십이운성, 신살, 합·충·형·파·해, and 오행. The big gaps are **runtime calculators** (대운 / 세운 / 신살 trigger / 격국 derivation), not prose data. We have ~3,500 lines of Korean prose written; we need to add maybe **150 more sentences total** to fill the missing slots, plus build the calculators.

---

## File-by-file

### [ilju.json](../public/saju-data/ilju.json) — 60 entries, 133 KB ✅

The 60 갑자 일주, full coverage, average summary length ~191 chars (149–242 range).

**Per entry:**
- `id` (e.g. `갑자`), `stem`, `branch`, `stemElement`, `branchElement`
- `stemDescription`, `branchDescription` — 1 sentence each, hanja-style ("갑목은 큰 나무, 우뚝 솟은 거목으로...")
- `daySipsin` — what 십성 the 일지 represents (정인/식신/etc.)
- `traits[4-5]`, `strengths[4]`, `weaknesses[4]`, `careers[6]` — short noun phrases
- `male`, `female` — 2 sentences each, gendered analysis
- `summary` — 4-sentence prose paragraph

**Prose quality:** Strong. Mostly 입니다체 ("갑자일주는 ... 일주이다"). Hanja-rich. Slightly more textbook than our brand voice (we're 해요체) — see voice issue below.

**Issues:**
1. **Voice mismatch.** All `summary`, `male`, `female` are 입니다체. Our LLM prompt forces 해요체. The engine will need either (a) write a tone-converter, (b) accept the slight mismatch, or (c) rewrite the prose. Recommend (b) for v1, (c) over time as a content task.
2. **Two oblique 비유 we'd ideally avoid:** "큰 나무", "깊은 물" appear in many entries' `stemDescription`. The current LLM prompt explicitly bans these biases ("큰 나무, 깊은 물 같은 오행 자연물 비유 금지"). Engine should **not** use `stemDescription` in user-facing prose — use it as input for derivation only, or hide behind a "more detail" toggle.

### [gyeokguk.json](../public/saju-data/gyeokguk.json) — 12 entries, 16.5 KB ✅

Covers all 10 십성 격 + 건록격 + 양인격. Good coverage for the most common 격국 derivations.

**Per entry:** `id`, `hanja`, `sipsung`, `keyword`, `description`, `personality`, `wealthPattern`, `careerPattern`, `lifePath`, `strengths[3]`, `cautions[3]`. Each prose field is 2-3 sentences.

**Prose quality:** Same 입니다체 textbook tone as ilju.json. Useful, accurate.

**Issues:**
1. We don't have **종격, 화격, 잡격** (special patterns) — these are rare and probably out of scope for v1.
2. The 격국 derivation logic itself isn't here — we'd need: month-branch本氣 → which 십성 it is to 일간 → match to one of the 12 entries. This is implementable in ~30 lines (`tenGods.ts` likely already has the building blocks; see [src/lib/saju/gyeokguk.ts](../src/lib/saju/gyeokguk.ts)).

### [sipsung.json](../public/saju-data/sipsung.json) — 10 entries, 12 KB ✅

The full set of 10 십성 (비견/겁재/식신/상관/편재/정재/편관/정관/편인/정인).

**Per entry:** `id`, `hanja`, `category` (자아/표현/재성/관성/인성), `yinYang`, `element` (relative to day master), `keyword`, `personality`, `strengths[4]`, `weaknesses[4]`, `wealthStyle`, `careerStyle`, `relationshipStyle`.

**Prose quality:** Good. 1-2 sentences per prose field.

**Used for:** 일지 십성 풀이 (already in `buildSajuContext`). Could also drive a **십성 분포 풀이** — counting which 십성 the user has the most of across all 8 글자, then describing the dominant one. This is a section thegot/포스텔러/사주바주 all do; we don't yet.

### [wolji.json](../public/saju-data/wolji.json) — 12 entries, 12 KB ✅

All 12 지지 (인/묘/진/사/오/미/신/유/술/해/자/축).

**Per entry:** `id`, `hanja`, `animal`, `element`, `season`, `month`, `nature`, `keyword`, `personality`, **`forDayMaster`** (5-key map: how this branch reads for each of the 5 element day-masters).

**Prose quality:** Good. The `forDayMaster` field is the **most useful piece** — it personalizes the 월지 풀이 by the user's 일간 element, which is exactly what 포스텔러 splits into a separate paragraph.

### [twelve-stages.json](../public/saju-data/twelve-stages.json) — 12 entries, 7 KB ✅

All 12 십이운성 stages (장생/목욕/관대/건록/제왕/쇠/병/사/묘/절/태/양).

**Per entry:** `id`, `hanja`, `stage` (1-12), `lifeCycle`, `keyword`, `description`, `personality`, `fortune`. ~2 sentences per prose field.

**Used for:** mapping 일간 × 일지/월지/etc. → stage label. The mapping table is already in `sajuContext.ts` lines 97–107 (`TWELVE_STAGE_TABLE`). Currently we only compute it for 일지; should also compute for the other 3 지지 to give a per-pillar 운성 stamp (one of thegot's signals).

### [sinsal.json](../public/saju-data/sinsal.json) — 8 신살 ⚠️ partial

Has 도화살, 역마살, 화개살, 귀문관살, 천을귀인, 양인살, 문창귀인, 겁살.

**Per entry:** `id`, `hanja`, `keyword`, `triggerBranches`, `rule` (Korean prose describing the trigger), `positive`, `negative`, **`inPillar`** (4-key map — how it reads in 년주 vs 월주 vs 일주 vs 시주).

**The `inPillar` field is our differentiator** — sajubaju doesn't personalize 신살 by pillar position, but we can.

**Issues:**
1. **No JS rule-evaluator yet.** The `rule` field is Korean prose ("일지 또는 년지 기준으로 삼합의 목욕지가 사주에 있을 때..."). To detect 신살 in code we need to translate each rule into a function `(saju, dayStem, dayBranch, yearBranch) → boolean`. Doable — the rules are mechanical — but it's fresh code. Estimate: ~80 lines of TS for all 8 신살.
2. **Missing common 신살:** 백호살, 월공, 공망, 천덕귀인, 월덕귀인, 괴강살, 금여, 학당귀인, 십악대패. About 8-10 more to be on parity with thegot. Each needs (rule, positive, negative, inPillar) — about 12 lines of JSON each. Probably a 1-2 hour content task.

### [hapchung.json](../public/saju-data/hapchung.json) — full coverage 10.5 KB ✅

All the relationship operators:
- **천간합** (5 pairs): 갑기, 을경, 병신, 정임, 무계 → result element + 인의지합 etc. character
- **지지육합** (6 pairs): 자축, 인해, 묘술, 진유, 사신, 오미
- **지지삼합** (4 groups): 인오술/사유축/신자진/해묘미
- **지지방합** (4 groups): 인묘진/사오미/신유술/해자축
- **지지육충** (6 pairs): 자오, 축미, 인신, 묘유, 진술, 사해
- **지지형** (4 groups): 인사신, 축술미, 자묘, 자형
- **지지파** (6 pairs)
- **지지해** (6 pairs)
- `analysisGuide` — how to read the totality

This is **complete** for our needs. There's already a `relationships.ts` (referenced in `route.ts`) that consumes some of this. Would need to verify it covers 형/파/해 too.

### [ohaeng-analysis.json](../public/saju-data/ohaeng-analysis.json) — 7 KB ✅

For each of 5 elements: `name`, `nature`, `season`, `direction`, `organ`, `color`, `generates`, `isControlledBy`, `controls`, `whenExcess`, `whenDeficient`, **`whenAbsent`**. Plus `dayMasterNeeds` (per-천간 ideal support / worst combo) and `analysisTemplate` (5-step procedure).

**The `whenAbsent` prose for each element is high-quality concrete advice** ("뿌리 없는 나무처럼 안정감이 부족하다. 시작하는 힘이 약하고...") — which is exactly the kind of thing the user complained the LLM was failing at. We already have it in JSON; we just need to use it directly instead of letting the LLM paraphrase it.

### [daewoon.json](../public/saju-data/daewoon.json) — 7.5 KB ⚠️ rules-only

Includes `대운규칙` (forward/reverse rule, start age formula), `대운해석원칙` (5-step analysis), `십성별대운` (10 십성, each with `keyword`/`positive`/`negative`/`wealth`/`career`), `세운해석원칙`, and `현재세운` for 2025/2026/2027.

**What's there:** prose templates for each 십성 운.

**What's missing:** the **대운 calculator itself**. We have:
- The rule prose (양남음녀 순행, 음남양녀 역행)
- The start-age formula (절기까지 일수 / 3)
- The current 세운 entries

What we don't have:
- A function that takes `(saju, gender, birthDate) → DaewoonCycle[]` returning 8-10 cycles each with start age + stem + branch + 십성 label
- The 절기 timestamps to compute the start age (we have `solar-terms-jie.json` already — 42 KB of 절기 timestamps from 1900 onward, so this is achievable)
- Hook into 십성별대운 prose by matching the cycle's 십성 to the data

Estimate: ~120 lines of TS for the calculator. There's already a `daewoon.ts` in `src/lib/saju/` — it likely has scaffolding.

### [solar-terms-jie.json](../public/saju-data/solar-terms-jie.json) — 42 KB ✅ infrastructure

Per-year array of 12 절입 timestamps starting 1900. Used by 대운 calculator. Already has `solarTerms.ts` consumer.

---

## Existing TS support code (audit by name)

From `ls src/lib/saju/`:
- `constants.ts` — likely 60갑자, 5 elements, 10 stems, 12 branches mappings
- `daewoon.ts` — probably partial 대운 calculator
- `gyeokguk.ts` — 격국 derivation
- `match.ts` — billionaire matching
- `relationships.ts` — already imported in `route.ts` for 충/합/형/오행 analysis (`analyzeSaju`)
- `sajuContext.ts` — current LLM context builder, the foundation we'd evolve
- `solarTerms.ts` — 절기 lookup
- `tenGods.ts` — 십성 calculator
- `types.ts` — `SajuResult`, `CheonGan`, `JiJi`

Most of the math we need either exists or has scaffolding. The work is mostly **prose assembly + Korean particles + per-pillar personalization + new 대운 cycles renderer**, not new math.

---

## Gap analysis vs proposed engine sections

| Engine section | Data ready? | TS calc ready? | Gap |
|---|---|---|---|
| 사주 원국 (chart render) | ✅ | likely ✅ | none |
| 일간 풀이 | ✅ (derivable from `ilju.stem` + `ohaeng.elements[el]`) | trivial | none |
| 일주 풀이 | ✅ ilju.json | ✅ | tone (입니다체 → 해요체) |
| 월지 풀이 | ✅ wolji.json `forDayMaster` | trivial | none |
| 격국 풀이 | ✅ gyeokguk.json (12) | likely ✅ `gyeokguk.ts` | check special-pattern fallback |
| 십성 분포 풀이 | ✅ sipsung.json | ✅ `tenGods.ts` | new: write template that names dominant 십성 |
| 오행 분포 + 부재 | ✅ ohaeng-analysis.json `whenAbsent` | ✅ count function in sajuContext | none |
| 용신 추천 | ✅ ohaeng-analysis.json `dayMasterNeeds` | trivial | new: simple selection logic |
| 십이운성 (per-pillar) | ✅ twelve-stages.json + table in sajuContext | ✅ extend for all 4 pillars | trivial |
| 신살 풀이 | ⚠️ data partial (8/~16) | ❌ **needs JS rule-evaluator** | the biggest data + code gap |
| 합·충·형·파·해 풀이 | ✅ hapchung.json | ✅ `relationships.ts` | verify all 5 covered |
| 대운 cycles | ⚠️ rules+prose ready, 십성 prose ready | ❌ **needs cycle calculator** | the second-biggest code gap |
| 세운 (current year) | ✅ daewoon.json `현재세운` | trivial lookup | none for v1 |
| 종합 풀이 | ❌ no template | ❌ rule-based synthesis is hard | LLM still earns its keep here |
| 궁위 풀이 (4 pillars as life stages) | ❌ no data | trivial | new: ~16 sentences of static prose |
| 사주 등급 SSS-D | ❌ — | — | **don't build** (gimmick, see comparison-sites.md) |

**Summary of gaps:**
1. **신살 rule-evaluator** (~80 lines TS) + **8 more 신살 entries** (~100 lines JSON, content task)
2. **대운 cycle calculator** (~120 lines TS, but `daewoon.ts` may already cover this)
3. **궁위 prose data** (~16 sentences static JSON, content task)
4. **Cross-section synthesis (종합 풀이)** — see engine plan for whether to keep LLM or write rules.

The total content-write task is ~150 sentences. The total new code is ~200 lines (signed) plus making `relationships.ts` / `daewoon.ts` / `gyeokguk.ts` callable from the engine.

---

## Tone reconciliation

All our prose is 입니다체 / 합니다체 + hanja-rich. Our brand voice (per `route.ts` lines 233-240) is 해요체 + plain Korean. Three options:

**Option A** — **Use the JSON prose verbatim, accept the tone shift.** Saves work. Risk: feels textbook-ish next to the bujasaju matchmaking voice. This is what 포스텔러/사주바주 do.

**Option B** — **Build a pre-processor that swaps `입니다 → 이에요`, `합니다 → 해요`, drops parenthesized hanja in body text.** ~50 lines of regex. Imperfect but cheap. Risk: regex misses edge cases ("이루어진다" → ?, "있다" → "있어요"?).

**Option C** — **Rewrite all 60 ilju summaries + 12 gyeokguk entries + 12 wolji entries in 해요체 by hand.** ~500-600 sentences. Highest quality, most effort.

**Recommendation:** Start with Option A for v1 (ship fast, see if user complaints decrease). If users still complain about tone, do Option B. Only do Option C if Option B is judged insufficient. Given that the user's actual complaint was about *generic LLM filler* not *tone* per se, Option A may be enough — the data prose is **specific** even if it's 입니다체.
