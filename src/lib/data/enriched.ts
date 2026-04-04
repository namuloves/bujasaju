import { EnrichedPerson } from '../saju/types';
import { calculateSaju, parseBirthday } from '../saju/index';
import { billionaires } from './billionaires';

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
      id: String(index + 1),
      saju,
    };
  })
  .sort((a, b) => b.netWorth - a.netWorth);

// Get unique values for filters
export function getUniqueIljus(): string[] {
  const set = new Set(enrichedPeople.map((p) => p.saju.ilju));
  return Array.from(set).sort();
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
