import type { EnrichedPerson, SajuResult, Ju } from './types';

export interface MatchGroups {
  /**
   * 🥇 Same 일주 AND at least one additional pillar (월주 · 년주 · 시주)
   * completely matches stem+branch. Sorted by number of shared pillars
   * (desc) so the most chart-similar person is first, then by net worth.
   * People in this group always include 일주, so a 2/4 match means
   * "일주 + one other", a 4/4 means all four pillars identical.
   */
  chartTwins: EnrichedPerson[];
  /**
   * Same 일주 AND exactly-matching 월주 (stem+branch). Strictly a subset
   * of chartTwins that guarantees the month pillar (not just 월지) lines
   * up. Kept as its own section so we can surface "같은 일주 · 같은 월주"
   * even when chartTwins is dominated by 월지-only matches.
   */
  iljuPlusMonthJu: EnrichedPerson[];
  /** 🥈 Same 일주 AND same 월지 (excluding chartTwins / monthJu) */
  iljuPlusWolji: EnrichedPerson[];
  /** 🥉 Same 일주 AND same 격국 (excluding above) */
  iljuPlusGyeokguk: EnrichedPerson[];
  /** (last) Same 일주 only (excluding above) */
  iljuOnly: EnrichedPerson[];
}

function pillarsEqual(a: Ju | null, b: Ju | null): boolean {
  if (!a || !b) return false;
  return a.stem === b.stem && a.branch === b.branch;
}

/**
 * Count how many of 월주 / 년주 / 시주 match exactly between two saju.
 * 일주 is assumed to already match and is not counted here. Hour pillar
 * only counts if both sides know it.
 */
function countExtraPillarMatches(me: SajuResult, p: EnrichedPerson): number {
  let n = 0;
  if (pillarsEqual(me.saju.month, p.saju.saju.month)) n++;
  if (pillarsEqual(me.saju.year, p.saju.saju.year)) n++;
  if (pillarsEqual(me.saju.hour, p.saju.saju.hour)) n++;
  return n;
}

/**
 * Partition `everyone` into tiered match groups vs the user's own saju.
 * Groups are mutually exclusive — each person appears in at most one group,
 * at the narrowest tier they qualify for.
 *
 * Tier priority (a person enters the first group they qualify for):
 *   1. chartTwins       : same 일주 + ≥1 other full pillar matches
 *   2. iljuPlusWolji    : same 일주 + same 월지
 *   3. iljuPlusGyeokguk : same 일주 + same 격국
 *   4. iljuOnly         : same 일주 only
 *
 * Within chartTwins, people are sorted by number of shared pillars (desc)
 * so a 4/4 identical chart always lands at the very top. Others are sorted
 * by net worth.
 */
export function matchBillionaires(
  me: SajuResult,
  everyone: EnrichedPerson[],
): MatchGroups {
  const twins: Array<{ person: EnrichedPerson; shared: number }> = [];
  const monthJu: EnrichedPerson[] = [];
  const g1: EnrichedPerson[] = [];
  const g2: EnrichedPerson[] = [];
  const g3: EnrichedPerson[] = [];

  for (const p of everyone) {
    if (p.saju.ilju !== me.ilju) continue;

    // Strictest additional match: full 월주 (both stem and branch). This
    // is a subset of chartTwins but we track it separately so the UI can
    // always show a dedicated "같은 일주 · 같은 월주" section.
    if (pillarsEqual(me.saju.month, p.saju.saju.month)) {
      monthJu.push(p);
    }

    const extra = countExtraPillarMatches(me, p);
    if (extra >= 1) {
      twins.push({ person: p, shared: extra });
    } else if (p.saju.wolji === me.wolji) {
      g1.push(p);
    } else if (p.saju.gyeokguk === me.gyeokguk) {
      g2.push(p);
    } else {
      g3.push(p);
    }
  }

  const byNetWorth = (a: EnrichedPerson, b: EnrichedPerson) => b.netWorth - a.netWorth;

  // Twins: shared pillars (desc), then net worth (desc).
  twins.sort((a, b) => {
    if (b.shared !== a.shared) return b.shared - a.shared;
    return b.person.netWorth - a.person.netWorth;
  });

  monthJu.sort(byNetWorth);
  g1.sort(byNetWorth);
  g2.sort(byNetWorth);
  g3.sort(byNetWorth);

  return {
    chartTwins: twins.map((t) => t.person),
    iljuPlusMonthJu: monthJu,
    iljuPlusWolji: g1,
    iljuPlusGyeokguk: g2,
    iljuOnly: g3,
  };
}
