'use client';

import { useEffect, useState } from 'react';
import { EnrichedPerson } from '../saju/types';
import { CHEON_GAN, JI_JI, STEM_TO_OHAENG } from '../saju/constants';

const STEM_INDEX = new Map<string, number>(CHEON_GAN.map((s, i) => [s, i]));
const BRANCH_INDEX = new Map<string, number>(JI_JI.map((b, i) => [b, i]));

// Module-level singleton: the pre-baked JSON is fetched at most once per page
// load, no matter how many components ask for it. Saju is already calculated —
// no lunar-javascript work happens in the browser.
let cachedPromise: Promise<EnrichedPerson[]> | null = null;
let cachedData: EnrichedPerson[] | null = null;

export function loadEnrichedPeople(): Promise<EnrichedPerson[]> {
  if (cachedPromise) return cachedPromise;
  cachedPromise = fetch('/enriched-billionaires.json')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load enriched billionaires: ${res.status}`);
      return res.json() as Promise<EnrichedPerson[]>;
    })
    .then((data) => {
      cachedData = data;
      return data;
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
  return Array.from(set).sort(iljuCompare);
}

// Stem-grouped ordering: all 갑 together (by 지지 order), then 을, 병, …, 계.
// Easier to scan than canonical 60갑자 sequence when the user knows the stem.
function iljuCompare(a: string, b: string): number {
  const sa = STEM_INDEX.get(a[0]) ?? 99;
  const sb = STEM_INDEX.get(b[0]) ?? 99;
  if (sa !== sb) return sa - sb;
  return (BRANCH_INDEX.get(a[1]) ?? 99) - (BRANCH_INDEX.get(b[1]) ?? 99);
}

export function getIljusGroupedByStem(
  people: EnrichedPerson[]
): Array<{ stem: string; ohaeng: string; iljus: string[] }> {
  const byStem = new Map<string, string[]>();
  for (const p of people) {
    const ilju = p.saju.ilju;
    const stem = ilju[0];
    if (!byStem.has(stem)) byStem.set(stem, []);
    const arr = byStem.get(stem)!;
    if (!arr.includes(ilju)) arr.push(ilju);
  }
  return CHEON_GAN.filter((s) => byStem.has(s)).map((stem) => ({
    stem,
    ohaeng: STEM_TO_OHAENG[stem as keyof typeof STEM_TO_OHAENG],
    iljus: byStem.get(stem)!.sort(
      (a, b) => (BRANCH_INDEX.get(a[1]) ?? 99) - (BRANCH_INDEX.get(b[1]) ?? 99)
    ),
  }));
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
