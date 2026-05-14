# Saju interpretation engine — architecture + phased plan

A rule-based, deterministic JS engine that produces the user's 사주 풀이 from the JSON data we already have, replacing the OpenAI prompt in [src/app/api/saju-summary/route.ts](../src/app/api/saju-summary/route.ts) for the *self-saju* section. (LLM stays for the cross-axis matching narrative — see § "Where the LLM still earns its keep".)

Companion docs: [thegot-sample-output.md](./thegot-sample-output.md), [comparison-sites.md](./comparison-sites.md), [local-data-audit.md](./local-data-audit.md).

---

## Design goals

1. **Deterministic.** Same DOB → identical output. No `Math.random`. No LLM jitter.
2. **Specific, not generic.** Every sentence must reference a real fact about the user's chart (their 일주 id, the count of an 오행, the 십성 of their 일지, etc.). No "use what's missing" filler.
3. **Deeper than the current LLM paragraph, ≈ as deep as 포스텔러 / 사주바주.** That means ~7 sections, not one prose blob. Roughly 30-50 sentences total — 5-10× the current output.
4. **Brand-voice consistent.** 해요체, short sentences, no "제공합니다" / "탁월합니다" patterns, no English. Consistent with `src/app/api/saju-summary/route.ts` lines 233–240.
5. **Korean particles correct.** No "이(가)" parenthesized hack. No `Math.random` on 은/는. Either pick correctly via final-jamo, or restructure.
6. **Composable with the matching narrative.** The 사주 풀이 ends; then the matching narrative (still LLM) begins. They must read as one document, not two pieces glued together.

---

## Output structure (target)

7 sections, in this order:

1. **헤드 (1-2 sentences)** — 일주 id + 격국 keyword as a tagline. e.g. "갑자 일주, 정인격 — 학문과 직관으로 길을 여는 사주."
2. **일간 + 일주 풀이 (3-4 sentences)** — split style ala 포스텔러: "일간 (your 천간) gives you ~"; "일주 (your 60갑자) means specifically ~"
3. **월지 풀이 (2-3 sentences)** — your birth-season energy, personalized to your 일간 element via `wolji.forDayMaster[dayElement]`
4. **격국 풀이 (3-4 sentences)** — your 격국's `personality`, `wealthPattern`, `careerPattern` condensed
5. **오행 + 십성 분포 (2-3 sentences + a small visual bar)** — what's dominant, what's missing, what that means concretely (using `whenAbsent` / `whenExcess` from ohaeng-analysis.json)
6. **십이운성 + 신살 (2-4 sentences)** — life-stage label of 일지 + any triggered 신살 + their `inPillar` reading
7. **종합 (3-4 sentences)** — connective synthesis: how 일주 + 격국 + 오행 imbalance + 신살 read together. **This is where the LLM may still earn its keep**, gated by a feature flag — see below.

Plus optionally below the prose:
- **대운 timeline** — visual 10-year cycles + 1 sentence per cycle from `daewoon.십성별대운`. v2.
- **세운 (this year)** — 1-2 sentences from `daewoon.현재세운[2026]`. v1 cheap addition.

**Total prose target:** 15–20 sentences (vs current ~5-6). Each section is short enough to scan, but the *count* of sections + *specificity* of each is what makes it feel deep.

---

## Section-by-section assembly

### Section 1 — 헤드

**Inputs:** `iljuData.id`, `iljuData.daySipsin`, `gyeokgukData.id`, `gyeokgukData.keyword`

**Template:**
```
${ilju} 일주, ${gyeokguk} — ${gyeokguk.keyword}으로 길을 여는 사주예요.
```

**Particle:** `으로` after consonant-final / `로` after vowel-final or ㄹ-final on `gyeokguk.keyword`. Pick by inspecting last syllable's final jamo (jongseong). Implementation: `koJosa(s, '으로/로')` helper, ~10 lines. (Same helper handles 이/가, 은/는, 을/를, 와/과.)

### Section 2 — 일간 + 일주

**Inputs:** `iljuData.id`, `dayStem`, `dayElement`, `iljuData.traits`, `iljuData.daySipsin`, `sipsungData(daySipsin).keyword`

**Template (sentence list):**
```
S1: ${dayStem}(${dayElement}) 일간이라 ${dayElementShortDesc}한 본질을 가졌어요.
    // dayElementShortDesc — pick from a small static map: 목→유연하면서 곧은, 화→밝고 활동적인, etc.
S2: ${ilju} 일주는 ${iljuData.traits[0]}고 ${iljuData.traits[1]}는 사람이에요.
S3: 일지가 ${daySipsin}이라, ${sipsung[daySipsin].keyword.split(',')[0]}의 기운이 본인 안에 함께 있어요.
S4: ${iljuData.strengths[0]}이 두드러져요.
```

**Why this works:** every sentence is bound to a real field. S1 bridges abstract 일간 → concrete 일주. S2 names the user's 60갑자. S3 ties to 일지 십성 (unique to that 일주). S4 picks the strongest strength.

**Tone:** 입니다체 → 해요체 conversion: regex pre-pass on `traits[]` strings: `~함→~해요`, `~함이 강함→강해요`, etc. ~30 patterns.

### Section 3 — 월지

**Inputs:** `wolji`, `dayElement`, `woljiData.season`, `woljiData.keyword`, `woljiData.forDayMaster[dayElement]`

**Template:**
```
S1: ${woljiData.season}에 태어났어요.
S2: ${woljiData.forDayMaster[dayElement]}
   // already a complete 1-2 sentence prose from JSON
S3 (optional): ${woljiData.keyword.split(',')[0]}의 기운이 인생 전반에 흘러요.
```

The `forDayMaster` field gives a different 십성 reading per 일간, so this section is **highly personalized** — same 월지 reads differently for a 갑목 user vs a 병화 user.

### Section 4 — 격국

**Inputs:** `gyeokgukData.personality`, `gyeokgukData.wealthPattern`, `gyeokgukData.careerPattern`, `gyeokgukData.cautions[0]`

**Template:**
```
S1: 격국은 ${gyeokguk}이에요. ${gyeokgukData.personality_first_sentence}
S2: 재물 패턴은 ${gyeokgukData.wealthPattern_condensed_to_1_sentence}
S3: 적성은 ${gyeokgukData.careerPattern_first_sentence}
S4 (only if cautions[0] exists): 다만 ${gyeokgukData.cautions[0]}을 조심해요.
```

For "first_sentence" extractions — split on `다.` / `이다.` and take `[0] + '.'`. For 해요체 conversion run the same regex pass.

### Section 5 — 오행 + 십성 분포

**Inputs:**
- `counts` = `countOhaeng(saju)` — already in sajuContext.ts
- `missing` = elements with 0
- `dominant` = element with max count
- `dmNeeds` = `ohaeng.dayMasterNeeds[dayStem]`
- `ohaeng.elements[X].whenAbsent` / `whenExcess`

**Template (branching):**
```
Always:
S1: 오행은 목${counts.목} 화${counts.화} 토${counts.토} 금${counts.금} 수${counts.수}로 분포돼요.

If exactly 1 missing:
S2: ${missingEl} 기운이 없어서, ${ohaeng.elements[missingEl].whenAbsent_first_sentence}
S3: ${dmNeeds.idealSupport_paraphrased}이 도움이 돼요.

Elif 2+ missing:
S2: ${missing.join(',')} 기운이 부족해요. 그래서 ${pickWorstAbsentEffect}.
S3: ${dmNeeds.idealSupport_paraphrased}이 가장 절실해요.

Elif dominant >= 4:
S2: ${dominantEl} 기운이 ${counts[dominantEl]}개로 과해요. ${ohaeng.elements[dominantEl].whenExcess_first_sentence}
S3: ${dmNeeds.worst_paraphrased}을 경계해요.

Else (balanced):
S2: 다섯 기운이 비교적 고르게 자리잡았어요. 큰 결핍 없는 안정형이에요.
```

**The hardest bit:** the `idealSupport` and `worst` strings in `ohaeng-analysis.json` are written assuming the reader is told the metaphor ("수가 뿌리를 적셔주고, 적절한 화가 따뜻함을 주어야 한다"). For our 해요체 output we need a paraphrase pass — or **add a new field** `dayMasterNeeds[X].idealSupport_haeyo` to the JSON with hand-rewritten 해요체 versions (~30 sentences, 1-2 hour content task). Recommend adding the field; don't try to regex this.

### Section 6 — 십이운성 + 신살

**Inputs:**
- `dayBranchStage` = TWELVE_STAGE_TABLE[dayStem][dayBranch], already in sajuContext.ts
- `stageData` = twelve-stages entry
- `triggeredSinsal` = list of 신살 ids triggered for this saju (NEW — needs evaluator)
- For each triggered, `pillar` = where it landed

**Template:**
```
S1: 일지 십이운성은 ${dayBranchStage}예요. ${stageData.fortune_condensed}

For each triggered 신살 (max 3, prioritize 천을귀인 > 양인살 > 도화살 > 역마살 > 화개살 > others):
S_n: ${sinsalData.id}이 ${pillar}에 있어요. ${sinsalData.inPillar[pillar]}

If no 신살 triggered:
(skip 신살 sentences entirely — better than fake filler)
```

**The 신살 evaluator** is the heaviest piece of new code. Per-신살 rule:
- 도화살: triggered if any of 자/오/묘/유 appears in 사주, conditioned on 일지/년지 삼합 group → see `rule` field
- 역마살: same shape (장생지 of 삼합)
- 화개살: same shape (묘지 of 삼합)
- 천을귀인: 일간 → set of 지지 (table)
- 양인살: 일간 → 제왕지 (table; only for 양간)
- 문창귀인: 일간 → 지지 (table)
- 겁살: 일지 삼합 → 절지

About 80 lines of TS. Add tests for at least one triggered case per 신살.

### Section 7 — 종합

**Two implementation options:**

**Option A — rule-based concatenation.** Pick top fact from each prior section and stitch:
```
${ilju}의 ${strengthKeyword}와(과) ${gyeokguk}의 ${wealthKeyword}, 거기에 ${dominantOrMissingComment}이 더해진 사주예요. ${cautionFromGyeokguk}을 잘 다스리면, ${matchedKeywordFromMatching}으로 길이 트여요.
```
Pros: deterministic. Cons: reads like 짜집기 if the matching fields don't compose well.

**Option B — small LLM call gated to *just this paragraph*.** Pass the 6 prior sections (already deterministic) as input + the matched billionaires data + bio snippets, ask for 3-4 sentences that synthesize. **Only this paragraph uses LLM.** All preceding sections are 100% rule-based.

**Recommendation: Option B.** Cross-section synthesis is genuinely where rules struggle. The user's complaint was about "generic LLM output" — but the genericness was caused by handing the LLM *no facts* and asking for both interpretation + advice. With sections 1-6 already doing the interpretation deterministically, the LLM's only job is connection-making, which it's actually good at. Same OpenAI plumbing, drastically narrower task → much better quality at lower cost.

If Option B feels uneasy, ship A first, swap to B if A reads as 짜집기.

---

## Korean particle handling — concrete rules

**Never use these antipatterns:**
- `이(가)` parenthesized
- `은/는` parenthesized
- `Math.random` on particle choice
- `\b(이|가)\b` regex hacks

**Use one of these strategies:**

**Strategy 1 — `koJosa(word, particles)` helper.** Inspect the last char's jongseong (final consonant) using Unicode arithmetic:
```ts
function hasJongseong(s: string): boolean {
  const last = s[s.length - 1];
  if (!last) return false;
  const code = last.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return false;  // not Hangul syllable
  return code % 28 !== 0;  // jongseong index, 0 = no final consonant
}

function koJosa(word: string, [withFinal, withoutFinal]: [string, string]): string {
  return hasJongseong(word) ? withFinal : withoutFinal;
}

// Usage:
`${ilju}${koJosa(ilju, ['이', '가'])} ...`
`${ilju}${koJosa(ilju, ['은', '는'])} ...`
`${gyeokguk}${koJosa(gyeokguk, ['을', '를'])} ...`
`${gyeokguk}${koJosa(gyeokguk, ['으로', '로'])} ...`  // ㄹ-final goes to '로' — see edge case
`${name}${koJosa(name, ['과', '와'])} ...`
```

**Edge case for 으로/로:** if final jamo is ㄹ (jongseong index 8), use `로` not `으로`. So:
```ts
function koEuro(word: string): string {
  const last = word[word.length - 1];
  if (!last) return '로';
  const code = last.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return '로';
  const jong = code % 28;
  if (jong === 0) return '로';       // no final
  if (jong === 8) return '로';       // ㄹ final
  return '으로';
}
```

**Strategy 2 — restructure the sentence to avoid the issue.** Often easier than adding `koJosa` calls. e.g. instead of `${ilju}${koJosa(ilju, ['은', '는'])} ...` write `이 사주는 ...` and put the 일주 in the previous sentence.

**Strategy 3 — for proper-noun fields that vary at runtime (60갑자 ids, 12 지지 ids, 12 격국 ids):** all 60 are 한자 + 한글 syllables. **Pre-compute** a small table once, hard-code the right particle:

```ts
// 60 갑자 일주 — last syllable maps to particle table at build time
// 갑자(자) → 자: vowel-final (no jongseong). 갑술(술) → 술: jongseong present.
const ILJU_PARTICLES: Record<IljuId, IljuParticles> = {
  갑자: { 은는: '는', 이가: '가', 을를: '를', 으로로: '로' },
  갑인: { 은는: '은', 이가: '이', 을를: '을', 으로로: '으로' },
  // ... 60 rows total. Generated by script, not by hand.
};
```

This is bulletproof — the IDs never change at runtime, the table is checked into the repo, no logic runs in production. **Recommend this strategy** over `koJosa` for the 60갑자 / 12지지 / 12격국 / 10천간 / 10십성 / 12십이운성 / 신살 ids — about 130 entries total. Generation script: ~30 lines.

For dynamically-composed strings (e.g. "강한 사교성을" — could come from `traits[]`), use `koJosa()` at runtime.

---

## Where the LLM still earns its keep

After the rule-based engine is in place, three places might still benefit from an LLM call:

1. **Section 7 종합.** Cross-section synthesis. See above.
2. **Matching narrative.** The "you and these billionaires share X" section is currently a separate concern from 사주 풀이 (see `route.ts` matching prompt). It must remain LLM-driven — it's reasoning across saju + biographical data, which rules cannot do.
3. **Optional 대운 commentary.** Picking *the most relevant* of 8-10 daewoon cycles for this user (e.g. "your 35-44 cycle is when X kicks in"). Rules can pick by 십성 match to current chart; LLM might do better at picking which cycle to highlight.

For v1: do (1) with rules (Option A), keep (2) as the LLM job. v2: swap (1) to Option B if quality demands. v3 maybe (3).

---

## What new data to collect

Total: ~150 hand-written sentences. About 2-3 hours of content writing.

| What | Volume | Where |
|---|---|---|
| `dayMasterNeeds[X].idealSupport_haeyo` | 10 lines | ohaeng-analysis.json |
| `dayMasterNeeds[X].worst_haeyo` | 10 lines | ohaeng-analysis.json |
| Stem element short-description map (`목→유연하면서 곧은`) | 5 lines | new constants file |
| 8-10 more 신살 entries | ~80 lines | sinsal.json |
| 궁위 풀이 prose (4 pillars × 2 sentences) | 8 lines | new file `gungwi.json` |
| 60-row 일주 particle table | 60 lines | generated by script |
| 60-row 일주 short tagline (1 sentence each) | optional, only if section 1 needs it | ilju.json (could add `tagline` field) |

---

## Phased build plan

### Phase 0 — verify existing scaffolding (1-2 hours, no new code)

- Open and grok: `tenGods.ts`, `gyeokguk.ts`, `daewoon.ts`, `relationships.ts`, `solarTerms.ts`. Confirm what's already callable. (Did not do this in research session — left for build session.)
- If `daewoon.ts` already has cycle calculation, much of phase 4 is free.
- If `relationships.ts` already returns 충/합/형/파/해 for a saju, much of phase 1's section 6 is free.

### Phase 1 — minimum-viable engine (ship-ready, MVP) (1-2 days)

Goal: replace the LLM 사주 풀이 paragraph with rule-based output. **Sections 1, 2, 3, 4, 5 only.** Skip 신살 and 종합 for v1; ship at section 5's "balanced" branch as the closer for now.

Deliverables:
- `src/lib/saju/engine/josa.ts` — the particle helpers + 60갑자 / 12지지 / 12격국 / 10천간 hardcoded tables.
- `src/lib/saju/engine/build.ts` — `buildInterpretation(saju): { sections: Section[] }` returning the 5 sections as `{ id, title, sentences: string[] }`.
- `src/lib/saju/engine/templates/` — 5 files, one per section, each a function `(inputs) → sentences`.
- Tone normalizer pass — small regex set, call on JSON-sourced strings before insertion.
- Wire into `route.ts` — replace the LLM body with `buildInterpretation()` for the 사주 풀이 portion. **Keep the matching narrative as LLM.**
- 5 unit tests: known DOBs (e.g. user's own + 4 different combos covering missing-element / dominant-element / balanced cases) snapshotted against expected output.

Stop conditions for phase 1:
- All 60 일주 produce sensible output without runtime errors.
- No "이(가)", no `Math.random`, no English bleed-through.
- Output reads at least as natural as the current LLM paragraph (subjective, user-validated).
- Output is at minimum 12 sentences vs current 5-6.

### Phase 2 — 신살 + 종합 (2-3 days)

- Build the 신살 evaluator (per-신살 rule fns, dispatcher, returns `Triggered[]`).
- Add the 8-10 missing 신살 to `sinsal.json`.
- Add Section 6 (십이운성 + 신살).
- Decide on 종합 strategy (rules A vs LLM B). Implement Section 7.
- Add 4-6 more snapshot tests covering 신살-heavy charts.

### Phase 3 — 대운 + 세운 (2-3 days)

- Verify / complete the 대운 cycle calculator in `daewoon.ts`.
- Render 대운 timeline as a visual + 1-sentence-per-cycle commentary.
- Add 세운 1-paragraph (current year from `현재세운[2026]`).
- Optional: LLM annotation of "the cycle to watch" if rules-pick feels arbitrary.

### Phase 4 — content polish (ongoing)

- Walk through 5-10 real DOBs with the user, transcribe what reads "off."
- Fix per-pattern: usually a bad regex in tone normalizer or a JSON sentence that didn't translate cleanly.
- If volume of fixes is high, consider Option C (rewrite all 60 ilju summaries in 해요체).
- Add `tagline` to `ilju.json` (60 short lines) if section 1 needs it for the heading.

### Phase 5 (optional) — 궁위, 납음, 사주 등급 SSS-D

Only if competitive pressure or user requests. Per [comparison-sites.md](./comparison-sites.md) §6, none of these are essential for our positioning. Skip unless a real user need surfaces.

---

## What this **doesn't** address

- Frontend rendering of the section structure. The engine returns structured `Section[]`; the UI work to render it as cards / accordions / scroll-anchored sections is a separate task. (User mentioned existing uncommitted `DeepInterpretation.tsx` + `buildSajuInterpretation` — those should be examined when starting Phase 1, since they may already cover some of this.)
- The `Math.random` issue the user referenced — it's not in committed code per a quick grep; it must be in the uncommitted prior attempt. Phase 1's clean implementation should not reintroduce it.
- Deep changes to the matching narrative — that stays LLM, separate concern.
- Internationalization. Engine assumes Korean output. If we ever need EN, treat as a separate engine with its own templates.

---

## Risks + open questions

1. **Voice mismatch (입니다체 vs 해요체).** If the regex normalizer produces awkward output, we ship feeling textbookish. Mitigation: agree with user on Option A/B/C tradeoff before starting Phase 1.
2. **종합 풀이 quality.** If both rule-A and LLM-B feel off, 사주 풀이 ends without a synthesizing paragraph. May still be better than today's pure-LLM version, but verify with user.
3. **신살 rule disputes.** Different 명리학 schools disagree on some 신살 trigger rules (esp. 백호살). Stay with the rules already documented in `sinsal.json`; cite the rule prose to the user if questioned.
4. **No verbatim thegot capture.** Tone calibration relies on inference. When the Chrome extension is available, do a real capture and compare to our output, refine.
5. **격국 fallback.** Some 사주 won't cleanly match one of 12 격국 (e.g. 종격, 화격). Engine needs a fallback: either compute 비견격 by default if month-branch matches 일간 element, or surface "특수격" with a generic line. Decide before phase 1.

---

## Recommended next step

After the user reviews these four reports:

1. **User runs a real capture** on thegot (or someone else does) for tone calibration.
2. **Spike Phase 0** for 1-2 hours — read existing `daewoon.ts` / `gyeokguk.ts` / etc. and update this plan with what's already callable. May shrink Phase 1 by half.
3. **Decision points** before coding:
   - Voice: Option A, B, or C? (default: A, normalize per-string with regex pass)
   - 종합: rules A or LLM B? (default: A for v1, swap if needed)
   - Particle: per-id table or `koJosa` runtime? (default: per-id table for known IDs, runtime for free-form strings)
   - 격국 fallback: which? (default: 비견격 + warning if no match)
4. **Build Phase 1**, ship, iterate.

The existing uncommitted `DeepInterpretation.tsx` / `buildSajuInterpretation` work should be **examined first** in Phase 0 — depending on what's there, the v1 may be 50% closer to done than this plan assumes.
