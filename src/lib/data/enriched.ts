'use client';

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { EnrichedPerson } from '../saju/types';
import { CHEON_GAN, JI_JI, STEM_TO_OHAENG } from '../saju/constants';

const STEM_INDEX = new Map<string, number>(CHEON_GAN.map((s, i) => [s, i]));
const BRANCH_INDEX = new Map<string, number>(JI_JI.map((b, i) => [b, i]));

// Module-level singleton: the pre-baked JSON is fetched at most once per page
// load, no matter how many components ask for it. Saju is already calculated —
// no lunar-javascript work happens in the browser.
let cachedPromise: Promise<EnrichedPerson[]> | null = null;
let cachedData: EnrichedPerson[] | null = null;

// Drop entries with netWorth=0 (or missing): mostly deceased founders we kept
// for historical reasons, plus celebrities who don't belong in a "richest"
// ranking. Hiding them site-wide keeps matching, browsing, and direct profile
// links consistent.
function isVisible(p: EnrichedPerson): boolean {
  const nw = p.netWorth;
  return typeof nw === 'number' && nw > 0;
}

// Bios (`bio` / `bioKo`) arrive in a second request — see /api/people/bios.
// Keeping them out of the first response roughly halves what the home page
// has to download before it can render. Once they land they're merged into
// the same person objects and every useEnrichedPeople() caller re-renders.
let biosPromise: Promise<void> | null = null;
const bioListeners = new Set<() => void>();

function loadBios(people: EnrichedPerson[]): Promise<void> {
  if (biosPromise) return biosPromise;
  biosPromise = fetch('/api/people/bios')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load bios: ${res.status}`);
      return res.json() as Promise<Record<string, [string | null, string | null]>>;
    })
    .then((map) => {
      for (const p of people) {
        const b = map[p.id];
        if (!b) continue;
        if (b[0]) p.bio = b[0];
        if (b[1]) p.bioKo = b[1];
      }
      // New array identity so hooks/memos keyed on `people` recompute.
      cachedData = [...people];
      bioListeners.forEach((fn) => fn());
    })
    .catch((err: unknown) => {
      // Bios are an enhancement — cards just render without them. Allow a
      // retry on the next ensureBios() call.
      biosPromise = null;
      console.warn('[enriched] bios unavailable:', err);
    });
  return biosPromise;
}

export function loadEnrichedPeople(): Promise<EnrichedPerson[]> {
  if (cachedPromise) return cachedPromise;
  // Served by /api/people rather than a file in public/: static assets bypass
  // proxy.ts entirely, so the raw JSON was downloadable with no rate limit.
  cachedPromise = fetch('/api/people')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load enriched billionaires: ${res.status}`);
      return res.json() as Promise<EnrichedPerson[]>;
    })
    .then((data) => {
      const filtered = data.filter(isVisible);
      cachedData = filtered;
      void loadBios(filtered);
      return filtered;
    });
  return cachedPromise;
}

/**
 * Resolves once bios are merged in (or failed to load). Await this before
 * sending a person's bio somewhere it can't be filled in later — e.g. the
 * AI summary request or the results email.
 */
export function ensureBios(): Promise<void> {
  return loadEnrichedPeople().then((people) => loadBios(people));
}

/**
 * People the server already has, handed to the first render.
 *
 * Without this, a hard load of /profile/[id] server-renders only a spinner:
 * the dataset comes from /api/people in an effect, and effects don't run on
 * the server. Crawlers that read HTML (Naver's Yeti for one: its guide asks
 * for the main content to be server-rendered,
 * https://searchadvisor.naver.com/guide/seo-advanced-javascript) saw a page
 * with no name, bio or chart in it. robots.txt also keeps them off /api/,
 * so even a crawler that runs JS could not fetch the data.
 *
 * The profile layout wraps the page in this provider with that one person.
 * The server render and hydration both start from the seed, so they match;
 * the full list still loads in the background and replaces it.
 */
const EnrichedSeedContext = createContext<EnrichedPerson[] | null>(null);

export function EnrichedSeedProvider({
  people,
  children,
}: {
  people: EnrichedPerson[];
  children: ReactNode;
}) {
  return createElement(EnrichedSeedContext.Provider, { value: people }, children);
}

/**
 * The /api/people list has no bios (they follow from /api/people/bios), but
 * seeded people arrive with theirs. Copy them across so the profile's bio
 * doesn't vanish between the list landing and the bios landing.
 */
function keepSeedBios(seed: EnrichedPerson[], people: EnrichedPerson[]): void {
  for (const s of seed) {
    if (!s.bio && !s.bioKo) continue;
    const p = people.find((x) => x.id === s.id);
    if (!p) continue;
    if (!p.bio && s.bio) p.bio = s.bio;
    if (!p.bioKo && s.bioKo) p.bioKo = s.bioKo;
  }
}

/**
 * React hook: fetch + enrich billionaires on mount. Returns an empty array
 * while loading so callers can render skeletons / spinners, or the seeded
 * people when an EnrichedSeedProvider is above (see its note).
 *
 * Once any component has kicked off the fetch, further `useEnrichedPeople`
 * calls resolve instantly from the module cache. When bios arrive the hook
 * returns a new array so consumers re-render with them.
 */
export function useEnrichedPeople(): { people: EnrichedPerson[]; loading: boolean } {
  const seed = useContext(EnrichedSeedContext);
  const [people, setPeople] = useState<EnrichedPerson[]>(() => cachedData ?? seed ?? []);
  const [loading, setLoading] = useState<boolean>(
    () => cachedData === null && !(seed && seed.length > 0),
  );

  useEffect(() => {
    const onBios = () => {
      if (cachedData) setPeople(cachedData);
    };
    bioListeners.add(onBios);
    let cancelled = false;
    loadEnrichedPeople().then(() => {
      if (cancelled || !cachedData) return;
      if (seed) keepSeedBios(seed, cachedData);
      setPeople(cachedData);
      setLoading(false);
    });
    return () => {
      cancelled = true;
      bioListeners.delete(onBios);
    };
  }, [seed]);

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
