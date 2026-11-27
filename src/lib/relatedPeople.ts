import type { EnrichedPerson } from '@/lib/saju/types';

/**
 * Who RelatedPeople shows under a profile: up to six others with the same
 * 일주 and six in the same industry, richest first.
 *
 * Shared by the RelatedPeople component and the profile layout. The layout
 * seeds these people into the first render (see EnrichedSeedProvider), so
 * the server-rendered profile already links to them. Both sides must pick
 * the same people, hence one function.
 */

const LIMIT = 6;

function pick(
  people: EnrichedPerson[],
  self: EnrichedPerson,
  pred: (p: EnrichedPerson) => boolean,
): EnrichedPerson[] {
  return people
    .filter((p) => p.id !== self.id && pred(p))
    .sort((a, b) => b.netWorth - a.netWorth)
    .slice(0, LIMIT);
}

export function relatedPeople(
  people: EnrichedPerson[],
  person: EnrichedPerson,
): { sameIlju: EnrichedPerson[]; sameIndustry: EnrichedPerson[] } {
  return {
    sameIlju: person.saju ? pick(people, person, (p) => p.saju?.ilju === person.saju.ilju) : [],
    sameIndustry: pick(people, person, (p) => p.industry === person.industry),
  };
}
