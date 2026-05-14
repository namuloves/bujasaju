/**
 * 신살(神殺) evaluator — 24종 트리거 룰.
 *
 * 데이터: public/saju-data/sinsal-rules.json
 *
 * 트리거 기준 종류:
 *   - dayStem: 일간 기준 (천을귀인, 문창귀인, 학당귀인, 양인살, 홍염살, 암록, 금여)
 *   - yearBranchOrDayBranch: 년지 또는 일지의 삼합국 기준 (도화, 역마, 화개, 겁살, 망신, 장성, 반안, 육해)
 *   - iljuPillar: 일주 60갑자 기준 (괴강, 백호)
 *   - pillarPair: 사주에 두 지지 쌍 동시 존재 (원진, 귀문)
 *   - monthBranch: 월지 기준 (천덕, 월덕)
 *   - chartHasBranches: 사주에 특정 글자 (현침)
 *   - iljuPillar+chartBranches: 일주의 갑자순 + 공망 지지 (공망)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { CheonGan, JiJi, Saju } from '../types';

export interface SinsalMatch {
  id: string;
  hanja: string;
  good: string; // "길" | "흉" | "중립..."
  category: string;
  meaning: string;
  /** 어느 자리에 있는지 (트리거된 자리) */
  position?: '년' | '월' | '일' | '시' | '일주' | '사주';
}

interface SinsalRule {
  id: string;
  hanja: string;
  basis: string;
  rule: unknown;
  ruleDesc: string;
  good: string;
  category: string;
  meaning: string;
}

let _rulesCache: SinsalRule[] | null = null;

function loadRules(): SinsalRule[] {
  if (_rulesCache) return _rulesCache;
  const filePath = join(process.cwd(), 'public', 'saju-data', 'sinsal-rules.json');
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  _rulesCache = raw.sinsal as SinsalRule[];
  return _rulesCache;
}

// ─── helpers ────────────────────────────────────────────────────────────

function allPillars(saju: Saju): Array<{ pillar: '년' | '월' | '일' | '시'; stem: CheonGan; branch: JiJi }> {
  const out: Array<{ pillar: '년' | '월' | '일' | '시'; stem: CheonGan; branch: JiJi }> = [
    { pillar: '년', stem: saju.year.stem, branch: saju.year.branch },
    { pillar: '월', stem: saju.month.stem, branch: saju.month.branch },
    { pillar: '일', stem: saju.day.stem, branch: saju.day.branch },
  ];
  if (saju.hour) out.push({ pillar: '시', stem: saju.hour.stem, branch: saju.hour.branch });
  return out;
}

function allBranches(saju: Saju): JiJi[] {
  const out: JiJi[] = [saju.year.branch, saju.month.branch, saju.day.branch];
  if (saju.hour) out.push(saju.hour.branch);
  return out;
}

function findBranchPosition(saju: Saju, target: JiJi): '년' | '월' | '일' | '시' | null {
  if (saju.year.branch === target) return '년';
  if (saju.month.branch === target) return '월';
  if (saju.day.branch === target) return '일';
  if (saju.hour?.branch === target) return '시';
  return null;
}

// 어느 삼합국에 속하는지
function getSamhapGroup(branch: JiJi): '인오술' | '사유축' | '신자진' | '해묘미' {
  if (['인', '오', '술'].includes(branch)) return '인오술';
  if (['사', '유', '축'].includes(branch)) return '사유축';
  if (['신', '자', '진'].includes(branch)) return '신자진';
  return '해묘미';
}

// ─── evaluators per basis ─────────────────────────────────────────────

function evalDayStem(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  const map = rule.rule as Record<string, JiJi[]>;
  const triggers = map[saju.day.stem];
  if (!triggers) return [];

  const matches: SinsalMatch[] = [];
  for (const branch of triggers) {
    const pos = findBranchPosition(saju, branch);
    if (pos) {
      matches.push({
        id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
        meaning: rule.meaning, position: pos,
      });
      break; // 한 신살은 한 번만 카운트
    }
  }
  return matches;
}

function evalSamhap(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  // 년지 또는 일지의 삼합국 기준
  const map = rule.rule as Record<string, JiJi[]>;

  const checkFrom = (basisBranch: JiJi, basisPos: '년' | '월' | '일' | '시'): SinsalMatch | null => {
    const group = getSamhapGroup(basisBranch);
    const triggers = map[group];
    if (!triggers) return null;

    for (const branch of triggers) {
      const pos = findBranchPosition(saju, branch);
      if (pos && pos !== basisPos) {
        return {
          id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
          meaning: rule.meaning, position: pos,
        };
      }
    }
    return null;
  };

  const seen = new Set<string>();
  const out: SinsalMatch[] = [];
  const m1 = checkFrom(saju.year.branch, '년');
  if (m1 && !seen.has(m1.position!)) { seen.add(m1.position!); out.push(m1); }
  const m2 = checkFrom(saju.day.branch, '일');
  if (m2 && !seen.has(m2.position!)) { seen.add(m2.position!); out.push(m2); }

  return out.slice(0, 1); // 한 신살은 한 번만 카운트
}

function evalIljuPillar(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  const list = rule.rule as string[];
  const ilju = `${saju.day.stem}${saju.day.branch}`;
  if (list.includes(ilju)) {
    return [{
      id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
      meaning: rule.meaning, position: '일주',
    }];
  }
  return [];
}

function evalPillarPair(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  const pairs = rule.rule as JiJi[][];
  const branches = allBranches(saju);

  for (const [a, b] of pairs) {
    if (branches.includes(a) && branches.includes(b)) {
      return [{
        id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
        meaning: rule.meaning, position: '사주',
      }];
    }
  }
  return [];
}

function evalMonthBranch(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  const map = rule.rule as Record<string, string[]>;

  // 천덕귀인: 월지 → 특정 천간/지지 1개
  // 월덕귀인: 월지 삼합 → 특정 양간 1개
  let triggers: string[] | undefined;

  if (rule.id === '월덕귀인') {
    const group = getSamhapGroup(saju.month.branch);
    triggers = map[group];
  } else {
    triggers = map[saju.month.branch];
  }
  if (!triggers || triggers.length === 0) return [];

  // 사주 천간 또는 지지에 해당 글자 있는지
  const allStems: CheonGan[] = [saju.year.stem, saju.month.stem, saju.day.stem];
  if (saju.hour) allStems.push(saju.hour.stem);
  const allBs = allBranches(saju);

  for (const t of triggers) {
    // 천간 글자거나 지지 글자거나
    if (allStems.includes(t as CheonGan) || allBs.includes(t.replace(/[()].*$/, '') as JiJi)) {
      return [{
        id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
        meaning: rule.meaning, position: '사주',
      }];
    }
  }
  return [];
}

function evalStemTriple(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  // 삼기귀인 — 사주 천간 4개 중 한 세트(3개)가 모두 있어야 트리거
  const triples = rule.rule as CheonGan[][];
  const allStems: CheonGan[] = [saju.year.stem, saju.month.stem, saju.day.stem];
  if (saju.hour) allStems.push(saju.hour.stem);

  for (const triple of triples) {
    if (triple.every(stem => allStems.includes(stem))) {
      return [{
        id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
        meaning: rule.meaning + ` (${triple.join('')})`,
        position: '사주',
      }];
    }
  }
  return [];
}

function evalChartHasBranches(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  // 현침살 — 한자 글자(갑·신·묘·오·신) 카운트
  const targets = (rule.rule as string[]).map(s => s.replace(/\(.*\)/g, ''));
  const allStems: CheonGan[] = [saju.year.stem, saju.month.stem, saju.day.stem];
  if (saju.hour) allStems.push(saju.hour.stem);
  const allBs = allBranches(saju);

  let count = 0;
  for (const t of targets) {
    count += allStems.filter(s => s === t).length;
    count += allBs.filter(b => b === t).length;
  }

  if (count === 0) return [];
  return [{
    id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
    meaning: rule.meaning + (count >= 2 ? ` (${count}곳에 있어 강화)` : ''),
    position: '사주',
  }];
}

function evalGongmang(rule: SinsalRule, saju: Saju): SinsalMatch[] {
  // 일주 → 갑자순 → 공망 두 지지 → 사주에 그 지지 있는지
  const groups = rule.rule as Record<string, { from: string[]; kong: JiJi[] }>;
  const ilju = `${saju.day.stem}${saju.day.branch}`;
  const branches = allBranches(saju);

  for (const group of Object.values(groups)) {
    if (group.from.includes(ilju)) {
      const hits = group.kong.filter(k => branches.includes(k));
      if (hits.length === 0) return [];
      const pos = findBranchPosition(saju, hits[0]);
      return [{
        id: rule.id, hanja: rule.hanja, good: rule.good, category: rule.category,
        meaning: rule.meaning + ` (공망 지지: ${hits.join('·')})`,
        position: pos ?? '사주',
      }];
    }
  }
  return [];
}

// ─── 통합 ──────────────────────────────────────────────────────────────

export function evaluateSinsal(saju: Saju): SinsalMatch[] {
  const rules = loadRules();
  const out: SinsalMatch[] = [];

  for (const rule of rules) {
    let matches: SinsalMatch[] = [];

    switch (rule.basis) {
      case 'dayStem':
        matches = evalDayStem(rule, saju);
        break;
      case 'yearBranchOrDayBranch':
        matches = evalSamhap(rule, saju);
        break;
      case 'iljuPillar':
        matches = evalIljuPillar(rule, saju);
        break;
      case 'pillarPair':
        matches = evalPillarPair(rule, saju);
        break;
      case 'monthBranch':
        matches = evalMonthBranch(rule, saju);
        break;
      case 'chartHasBranches':
        matches = evalChartHasBranches(rule, saju);
        break;
      case 'iljuPillar+chartBranches':
        matches = evalGongmang(rule, saju);
        break;
      case 'stemTriple':
        matches = evalStemTriple(rule, saju);
        break;
    }

    out.push(...matches);
  }

  return out;
}

/**
 * 신살 카테고리별 카운트.
 */
export function categorizeSinsal(matches: SinsalMatch[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const m of matches) {
    counts[m.category] = (counts[m.category] ?? 0) + 1;
  }
  return counts;
}
