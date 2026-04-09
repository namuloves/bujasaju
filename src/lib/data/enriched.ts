import { EnrichedPerson } from '../saju/types';
import { calculateSaju, parseBirthday } from '../saju/index';
import { billionaires } from './billionaires';
import { nameKoMap } from './nameKoMap';
import { GABIA_60 } from '../saju/constants';

// Canonical 60갑자 ordering: 갑자 → 을축 → 병인 → ... → 계해
const GABIA_ORDER = new Map<string, number>(
  GABIA_60.map((g, i) => [g.stem + g.branch, i])
);

// De-duplicate by name (case-insensitive)
const uniqueBillionaires = billionaires.filter(
  (person, index, self) => index === self.findIndex((p) => p.name.toLowerCase() === person.name.toLowerCase())
);

// Pre-compute saju data for all billionaires
export const enrichedPeople: EnrichedPerson[] = uniqueBillionaires
  .filter((p) => {
    // Only include people with valid birthdays
    const date = parseBirthday(p.birthday);
    return !isNaN(date.getTime()) && date.getFullYear() > 1900;
  })
  .map((person, index) => {
    const birthday = parseBirthday(person.birthday);
    const saju = calculateSaju(birthday);
    return {
      ...person,
      // Fall back to a curated transliteration map when the source record
      // doesn't already provide a Korean name.
      nameKo: person.nameKo ?? nameKoMap[person.name],
      id: String(index + 1),
      saju,
    };
  })
  .sort((a, b) => b.netWorth - a.netWorth);

// Get unique values for filters
export function getUniqueIljus(): string[] {
  const set = new Set(enrichedPeople.map((p) => p.saju.ilju));
  // Sort by canonical 60갑자 order so users see 갑자 → 을축 → 병인 → … → 계해
  return Array.from(set).sort(
    (a, b) => (GABIA_ORDER.get(a) ?? 999) - (GABIA_ORDER.get(b) ?? 999)
  );
}

export function getUniqueGyeokguks(): string[] {
  const set = new Set(enrichedPeople.map((p) => p.saju.gyeokguk));
  return Array.from(set).sort();
}

export function getUniqueWoljis(): string[] {
  const set = new Set(enrichedPeople.map((p) => p.saju.wolji));
  return Array.from(set).sort();
}

export function getUniqueIlgans(): string[] {
  const set = new Set(enrichedPeople.map((p) => p.saju.saju.day.stem));
  return Array.from(set).sort();
}

export function getUniqueNationalities(): string[] {
  const set = new Set(enrichedPeople.map((p) => p.nationality));
  return Array.from(set).sort();
}

export function getUniqueIndustries(): string[] {
  const set = new Set(enrichedPeople.map((p) => p.industry));
  return Array.from(set).sort();
}
