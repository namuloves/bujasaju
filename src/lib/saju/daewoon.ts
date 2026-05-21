/**
 * daewoon.ts — server-side 대운 calculation.
 *
 * Pure math lives in ./daewoon-core.ts. This file is the server entry point:
 * it loads the solar-terms data from disk (fs) once, caches it, and forwards
 * to the core function. Client code should not import this file — use
 * ./daewoon-client.ts instead (HTTP fetch loader + same core).
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { Gender, SajuResult } from './types';
import {
  calculateDaeUn as calculateDaeUnCore,
  type DaeUnResult,
  type SolarTermsData,
} from './daewoon-core';

export type {
  DaeUnPeriod,
  DaeUnResult,
  SolarTermsData,
} from './daewoon-core';
export {
  getDaeUnAtAge,
  getDaeUnSipSin,
  isDaeUnForward,
} from './daewoon-core';

let _solarTerms: SolarTermsData | null = null;

function loadSolarTerms(): SolarTermsData {
  if (_solarTerms) return _solarTerms;
  const filePath = join(process.cwd(), 'public', 'saju-data', 'solar-terms-jie.json');
  _solarTerms = JSON.parse(readFileSync(filePath, 'utf8')) as SolarTermsData;
  return _solarTerms;
}

export function calculateDaeUn(
  birthday: string,
  gender: Gender,
  sajuResult: SajuResult,
  maxAge: number = 100,
): DaeUnResult {
  return calculateDaeUnCore(loadSolarTerms(), birthday, gender, sajuResult, maxAge);
}

export function formatDaeUnList(result: DaeUnResult, limit: number = 8): string {
  const direction = result.isForward ? '순행' : '역행';
  const lines = result.periods.slice(0, limit).map(p =>
    `${p.startAge}~${p.endAge}세: ${p.pillar} (${p.stemElement}/${p.branchElement})`,
  );
  return `대운 ${direction} · 시작 ${result.startAge}세\n${lines.join('\n')}`;
}
