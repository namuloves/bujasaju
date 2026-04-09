'use client';

import { useEffect, useState } from 'react';
import { EnrichedPerson, Person } from '../saju/types';
import { calculateSaju, parseBirthday } from '../saju/index';
import { nameKoMap } from './nameKoMap';
import { GABIA_60 } from '../saju/constants';

// Canonical 60갑자 ordering: 갑자 → 을축 → 병인 → ... → 계해
const GABIA_ORDER = new Map<string, number>(
  GABIA_60.map((g, i) => [g.stem + g.branch, i])
);

/**
 * Enrich raw Person records with pre-computed saju data, de-dup, filter, sort.
 * Pulled out so it can run once, after the JSON payload arrives.
 */
function enrich(raw: Person[]): EnrichedPerson[] {
  // De-duplicate by name (case-insensitive)
  const unique = raw.filter(
    (person, index, self) =>
      index === self.findIndex((p) => p.name.toLowerCase() === person.name.toLowerCase())
  );

  return unique
    .filter((p) => {
      const date = parseBirthday(p.birthday);
      return !isNaN(date.getTime()) && date.getFullYear() > 1900;
    })
    .map((person, index) => {
      const birthday = parseBirthday(person.birthday);
      const saju = calculateSaju(birthday);
      return {
        ...person,
        nameKo: person.nameKo ?? nameKoMap[person.name],
        id: String(index + 1),
        saju,
      };
    })
    .sort((a, b) => b.netWorth - a.netWorth);
}

// Module-level singleton: the 2MB JSON is fetched at most once per page
// load, no matter how many components ask for it. Subsequent callers get
// the same resolved promise (and the same enriched array reference).
let cachedPromise: Promise<EnrichedPerson[]> | null = null;
let cachedData: EnrichedPerson[] | null = null;

export function loadEnrichedPeople(): Promise<EnrichedPerson[]> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = fetch('/billionaires.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load billionaires: ${res.status}`);
      return res.json() as Promise<Person[]>;
    })
    .then((raw) => {
      const enriched = enrich(raw);
      cachedData = enriched;
      return enriched;
    });
  return cachedPromise;
}

/**
 * React hook: fetch + enrich billionaires on mount. Returns an empty array
 * while loading so callers can render skeletons / spinners.
 *
 * Once any component has kicked off the fetch, further `useEnrichedPeople`
 * calls resolve instantly from the module cache.
 */
export function useEnrichedPeople(): { people: EnrichedPerson[]; loading: boolean } {
  const [people, setPeople] = useState<EnrichedPerson[]>(() => cachedData ?? []);
  const [loading, setLoading] = useState<boolean>(() => cachedData === null);

  useEffect(() => {
    if (cachedData) {
      setPeople(cachedData);
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadEnrichedPeople().then((data) => {
      if (cancelled) return;
      setPeople(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { people, loading };
}

// ---------------------------------------------------------------------------
// Filter option helpers
//
// These used to run at import time off a static array. Now they derive from
// whatever enriched array you pass in (typically the hook's `people`). When
// the fetch hasn't resolved yet, callers get empty arrays — the filter panel
// just shows no options for a beat, which is fine.
// ---------------------------------------------------------------------------

export function getUniqueIljus(people: EnrichedPerson[]): string[] {
  const set = new Set(people.map((p) => p.saju.ilju));
  return Array.from(set).sort(
    (a, b) => (GABIA_ORDER.get(a) ?? 999) - (GABIA_ORDER.get(b) ?? 999)
  );
}

export function getUniqueGyeokguks(people: EnrichedPerson[]): string[] {
  const set = new Set(people.map((p) => p.saju.gyeokguk));
  return Array.from(set).sort();
}

export function getUniqueWoljis(people: EnrichedPerson[]): string[] {
  const set = new Set(people.map((p) => p.saju.wolji));
  return Array.from(set).sort();
}

export function getUniqueIlgans(people: EnrichedPerson[]): string[] {
  const set = new Set(people.map((p) => p.saju.saju.day.stem));
  return Array.from(set).sort();
}

export function getUniqueNationalities(people: EnrichedPerson[]): string[] {
  const set = new Set(people.map((p) => p.nationality));
  return Array.from(set).sort();
}

export function getUniqueIndustries(people: EnrichedPerson[]): string[] {
  const set = new Set(people.map((p) => p.industry));
  return Array.from(set).sort();
}
