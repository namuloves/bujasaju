/**
 * daewoon-client.ts — client-side 대운 calculation.
 *
 * Fetches the solar-terms data over HTTP (cached at module level), then
 * delegates to the pure core. Use this from React components — never
 * import daewoon.ts in client code (it requires fs).
 */

import type { Gender, SajuResult } from './types';
import {
  calculateDaeUn as calculateDaeUnCore,
  type DaeUnResult,
  type SolarTermsData,
} from './daewoon-core';

export type { DaeUnPeriod, DaeUnResult } from './daewoon-core';

let cached: SolarTermsData | null = null;
let inflight: Promise<SolarTermsData> | null = null;

export async function loadSolarTerms(): Promise<SolarTermsData> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = fetch('/saju-data/solar-terms-jie.json')
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load solar terms: ${r.status}`);
      return r.json() as Promise<SolarTermsData>;
    })
    .then((d) => {
      cached = d;
      return d;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function calculateDaeUnClient(
  birthday: string,
  gender: Gender,
  sajuResult: SajuResult,
  maxAge: number = 100,
): Promise<DaeUnResult> {
  const solarTerms = await loadSolarTerms();
  return calculateDaeUnCore(solarTerms, birthday, gender, sajuResult, maxAge);
}
