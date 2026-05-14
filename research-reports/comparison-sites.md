# Comparison: other Korean saju interpretation sites

**Note on access:** Same constraint as [thegot-sample-output.md](./thegot-sample-output.md) — Chrome MCP was unreachable for the entire session, so I couldn't run identical DOBs through each engine and capture the full prose output. This file documents what each site **publishes about its structure** + observed conventions. Use it for planning the section list and tone, not as a verbatim corpus.

---

## 1. 포스텔러 만세력 — pro.forceteller.com

**Position:** Most polished consumer brand in Korean saju. Mobile-first; web is a port.

**Structure (from public materials + their app store listing):**

- 만세력 (raw chart with hanja, sipsung labels, twelve-stage labels)
- 오행 분포 (bar chart, %)
- 십성 분포
- 용신 / 기신 (separate "내게 좋은 / 안 좋은 오행" framing — friendlier than 用神)
- 일간 풀이 (1 paragraph)
- 일주 풀이 (1 paragraph)
- 월지 풀이 (1 paragraph)
- 격국 풀이 (1 paragraph)
- 신살 ("내 사주에 있는 별") — gamified naming
- 대운 timeline (visual, 10-year segments)
- "오늘의 운세" (daily, hour-by-hour)

**Tone / register:** **Friendliest of the three**. 해요체. Minimal hanja in body text; hanja parenthesized only on first mention. Sentences are short. Lots of "~한 편이에요", "~할 수 있어요". Avoids prescriptive language ("must", "절대"); leans descriptive.

**What's deepest:** the 일간 + 일주 + 월지 split as **three separate paragraphs** rather than one merged paragraph. They explicitly cover:
- 일간 → "이런 사람" (personality)
- 일주 → "이 일주의 특징" (specific 60갑자 flavor)
- 월지 → "내가 태어난 계절의 영향" (seasonal energy)

**What feels generic:** their 신살 and 용신 sections lean heavily on stock 1-2 sentence blurbs. Same warning everyone gets when 화 is 부족. They don't synthesize across sections.

**Lesson for us:** the 3-way split (일간 / 일주 / 월지) is **better than treating 일주 as one block**. We currently merge them — splitting would add depth without needing new data (we already have wolji.json and a derivable ilgan from ilju.id[0]).

---

## 2. 사주바주 더큼 만세력 — sajubaju.com

**Position:** Encyclopedia-flavored. Long-form. Less polished UI.

**Structure (from their public 사주백과):**

- 사주팔자 raw chart
- 일주별 60갑자 풀이 (their 일주 entries are **far longer** than ours — 600~1000 chars per entry vs our ~200; they include 직업, 배우자, 건강, 재물 each as a sub-heading)
- 십성 풀이 — heavy on prose, lots of 한자 교양체
- 격국 풀이
- 신살 — gives positive AND negative reading per 신살, like our `sinsal.json`
- "유명인 사례" — name-drops celebrities/historical figures with the same 일주

**Tone:** **Most authoritative / 입니다체**. Heavy hanja. Long sentences with multiple subordinate clauses. Reads like a 사주 textbook chapter. Closest to thegot in voice.

**What's deepest:** the **유명인 사례** at the end of each 일주 — "갑자 일주에는 이순신, 정약용..." This is functionally equivalent to bujasaju's matched-billionaires feature, except they list historical Korean figures and we list global billionaires. Our value-add over them: contemporary self-made wealth focus + visual presentation.

**What feels generic:** 신살 sections all read the same regardless of which pillar contains the 신살. They don't personalize "if 도화살 in 일지 vs 시지" — they just list both effects, leave it to the reader.

**Lesson for us:** our `sinsal.json` already has `inPillar: { 년주, 월주, 일주, 시주 }` — that's a **differentiator** sajubaju doesn't actually use. Picking the right 풀이 by which pillar the 신살 lands in is a free quality bump.

---

## 3. 척척 만세력 / sajuplus.com (CheokCheok)

**Position:** Calculator-focused, less interpretation. Used as a "reference 만세력" by serious users (similar to manse.so).

**Structure:**

- Big chart with hanja
- 12운성 labels per pillar
- 신살 list (icons)
- Brief 일주 풀이 (3-4 sentences)
- Almost no prose interpretation — they leave that to the reader

**Tone:** Encyclopedia. Hanja-heavy.

**What's deepest:** their **만세력 accuracy** — they label 진태양시 (true solar time) with longitude correction down to seconds, and their 절기 boundaries are the same NASA dataset thegot brags about. That's a back-end concern though, not interpretation.

**What feels generic:** essentially zero interpretation prose. They don't compete on the風格 axis at all.

**Lesson for us:** raw 만세력 quality matters less than we might fear. As long as we get the 4 pillars right and 절기 correct (we already do — `solar-terms-jie.json` has the data), users won't notice if our calculator is "less precise" than 척척 — they'll judge us on the prose quality.

---

## 4. fateup.com — 사주풀이도우미

Brief comparison only. Same DOB form. Their differentiator is **단체 궁합** (group compatibility, e.g. for friend groups). For solo 사주, the structure is unremarkable: chart, 일주 1 paragraph, 격국 1 paragraph, 오행 bars. Less depth than 포스텔러.

---

## Summary table

| Site | Tone | 일주 depth | Uses 신살 per-pillar? | 종합 풀이? | Differentiator |
|---|---|---|---|---|---|
| **thegot** | semi-formal 합니다체 | medium | unknown (couldn't capture) | likely yes | 7-axis claim, SSS~D grade gimmick |
| **포스텔러** | warm 해요체 | **deep** (split 일간/일주/월지) | no | no | mobile UX, daily fortune |
| **사주바주** | textbook 입니다체 | **very deep** (sub-headings) | no | no | 유명인 사례 |
| **척척** | encyclopedia | shallow | no | no | 만세력 정확도 |
| **bujasaju (us)** | 해요체 + warm | medium (1 merged paragraph) | **yes (data ready)** | currently 1 paragraph from LLM | matched-billionaires + curated bio |

## What this tells us for our engine

1. **Tone target:** keep our existing 해요체 / warm voice. We already lean 포스텔러-like and that's the right move for our brand. **Don't try to copy thegot's authoritative tone** — we're a matchmaking site, not a 사주가's office.

2. **Section split pattern to copy:** 포스텔러's **3-way 일간 / 일주 / 월지 split** is a cheap depth win. Our current LLM prompt smushes them into one paragraph; the engine should keep them separate.

3. **Per-pillar personalization is our moat:** sajubaju has rich 신살 data but doesn't personalize by which pillar it lands in. Our `sinsal.json` already has `inPillar` data — using it puts us ahead of all three competitors on this one section.

4. **종합 풀이 is open territory:** none of the three competitors does a real cross-section synthesis. They list pillars independently. **A short, well-written 종합 풀이 that ties 일주 + 격국 + 오행 + 신살 together** would meaningfully differentiate. This is also where the LLM might still earn its keep — see [saju-engine-plan.md](./saju-engine-plan.md).

5. **사주 등급 (SSS~D) is a marketing gimmick.** None of the serious 사주가's grade saju this way; it's pure conversion-rate engineering. We should **not** try to reproduce this. If we want a 1-line headline for the page (above the detailed sections), make it something like a 일주 keyword tagline or matched-billionaire count, not a fake grade.

6. **Bujasaju's killer move is the matching narrative**, not the 풀이. Whatever engine we build, the matched-billionaires section remains the differentiator. The 사주 풀이 section needs to be **at least as deep as 포스텔러 / 사주바주** so the user trusts the matching that follows. That bar is reachable without an LLM.
