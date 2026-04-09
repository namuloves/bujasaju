import type { EnrichedPerson, SajuResult } from './types';

export interface MatchGroups {
  /** 🥇 Same 일주 AND same 월지 — strongest */
  iljuPlusWolji: EnrichedPerson[];
  /** 🥈 Same 일주 AND same 격국 (excluding group 1) */
  iljuPlusGyeokguk: EnrichedPerson[];
  /** 🥉 Same 일주 only (excluding groups 1 & 2) */
  iljuOnly: EnrichedPerson[];
}

/**
 * Partition `everyone` into three tiered match groups vs the user's own saju.
 * Groups are mutually exclusive — each person appears in at most one group,
 * at the narrowest tier they qualify for.
 *
 * Within each group, people are sorted by net worth (desc).
 */
export function matchBillionaires(
  me: SajuResult,
  everyone: EnrichedPerson[],
): MatchGroups {
  const g1: EnrichedPerson[] = [];
  const g2: EnrichedPerson[] = [];
  const g3: EnrichedPerson[] = [];

  for (const p of everyone) {
    if (p.saju.ilju !== me.ilju) continue;
    if (p.saju.wolji === me.wolji) {
      g1.push(p);
    } else if (p.saju.gyeokguk === me.gyeokguk) {
      g2.push(p);
    } else {
      g3.push(p);
    }
  }

  const byNetWorth = (a: EnrichedPerson, b: EnrichedPerson) => b.netWorth - a.netWorth;
  g1.sort(byNetWorth);
  g2.sort(byNetWorth);
  g3.sort(byNetWorth);

  return {
    iljuPlusWolji: g1,
    iljuPlusGyeokguk: g2,
    iljuOnly: g3,
  };
}
