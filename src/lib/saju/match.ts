import type { EnrichedPerson, SajuResult, Ju } from './types';

export interface MatchGroups {
  /**
   * 🏅 Strictest tier: same 일주 AND exactly-matching 월주 (stem+branch).
   * This is the most specific "chart twin" you can get from two pillars
   * alone, so we promote it above the more general chartTwins group.
   */
  iljuPlusMonthJu: EnrichedPerson[];
  /**
   * 🥇 Same 일주 AND same 월지 AND at least one additional pillar
   * (년주 · 시주) matches — excluding people already in iljuPlusMonthJu.
   */
  chartTwins: EnrichedPerson[];
  /** 🥈 Same 일주 AND same 월지 (excluding above) */
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
 *   1. iljuPlusMonthJu  : same 일주 + exact 월주 match (stem+branch)
 *   2. chartTwins       : same 일주 + ≥1 other full pillar AND same 월지
 *   3. iljuPlusWolji    : same 일주 + same 월지
 *   4. iljuPlusGyeokguk : same 일주 + same 격국
 *   5. iljuOnly         : same 일주 only
 *
 * 월지 (month branch) is the most important factor in 사주 after 일주,
 * so 같은 월지 always outranks matches that only share 년주 or 시주.
 * chartTwins captures people who share 월지 PLUS additional pillars.
 *
 * Within chartTwins, people are sorted by number of shared pillars (desc)
 * so a 4/4 identical chart always lands at the very top. Others are sorted
 * by net worth.
 */
export function matchBillionaires(
  me: SajuResult,
  everyone: EnrichedPerson[],
): MatchGroups {
  const monthJu: EnrichedPerson[] = [];
  const twins: Array<{ person: EnrichedPerson; shared: number }> = [];
  const g1: EnrichedPerson[] = [];
  const g2: EnrichedPerson[] = [];
  const g3: EnrichedPerson[] = [];

  for (const p of everyone) {
    if (p.saju.ilju !== me.ilju) continue;

    const sameMonthJu = pillarsEqual(me.saju.month, p.saju.saju.month);
    const sameWolji = p.saju.wolji === me.wolji;

    // Strictest tier: exact 월주 match (stem AND branch).
    if (sameMonthJu) {
      monthJu.push(p);
      continue;
    }

    // Chart twins: same 월지 AND at least one other pillar (년주/시주).
    // 월지 is the most important factor, so people who only share
    // 년주/시주 without 월지 fall to lower tiers.
    const extra = countExtraPillarMatches(me, p);
    if (sameWolji && extra >= 1) {
      twins.push({ person: p, shared: extra });
    } else if (sameWolji) {
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
    iljuPlusMonthJu: monthJu,
    chartTwins: twins.map((t) => t.person),
    iljuPlusWolji: g1,
    iljuPlusGyeokguk: g2,
    iljuOnly: g3,
  };
}
