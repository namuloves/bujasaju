/**
 * Saju relationship analysis: 충 (clash), 합 (harmony), 형 (punishment),
 * and comprehensive chart reading for use in 사주풀이 prompts.
 */

import type { CheonGan, JiJi, OHaeng, Saju, SajuResult } from './types';
import {
  STEM_TO_OHAENG,
  BRANCH_TO_OHAENG,
  STEM_EUMYANG,
  OHAENG_SANGSAENG,
  OHAENG_SANGGEUK,
  getBongi,
} from './constants';
import { getSipSin } from './tenGods';

// ─── 지지충 (Earthly Branch Clashes) ───
// Pairs that are directly opposite on the 12-branch wheel (6 apart)
const JIJI_CHUNG_PAIRS: [JiJi, JiJi][] = [
  ['자', '오'], // 수↔화
  ['축', '미'], // 토↔토
  ['인', '신'], // 목↔금
  ['묘', '유'], // 목↔금
  ['진', '술'], // 토↔토
  ['사', '해'], // 화↔수
];

// ─── 천간합 (Heavenly Stem Combinations) ───
// Each pair combines to produce a specific element
const CHEONGAN_HAP: [CheonGan, CheonGan, OHaeng][] = [
  ['갑', '기', '토'],
  ['을', '경', '금'],
  ['병', '신', '수'],
  ['정', '임', '목'],
  ['무', '계', '화'],
];

// ─── 지지육합 (Six Earthly Branch Harmonies) ───
const JIJI_YUKHAP: [JiJi, JiJi, OHaeng][] = [
  ['자', '축', '토'],
  ['인', '해', '목'],
  ['묘', '술', '화'],
  ['진', '유', '금'],
  ['사', '신', '수'],
  ['오', '미', '토'],
];

// ─── 지지삼합 (Three-Branch Harmonies) ───
const JIJI_SAMHAP: [JiJi, JiJi, JiJi, OHaeng][] = [
  ['인', '오', '술', '화'], // 화국
  ['신', '자', '진', '수'], // 수국
  ['사', '유', '축', '금'], // 금국
  ['해', '묘', '미', '목'], // 목국
];

// ─── 지지방합 (Directional Harmonies) ───
const JIJI_BANGHAP: [JiJi, JiJi, JiJi, OHaeng][] = [
  ['인', '묘', '진', '목'], // 동방 목국
  ['사', '오', '미', '화'], // 남방 화국
  ['신', '유', '술', '금'], // 서방 금국
  ['해', '자', '축', '수'], // 북방 수국
];

// ─── 지지형 (Earthly Branch Punishments) ───
const JIJI_HYEONG_PAIRS: [JiJi, JiJi, string][] = [
  ['인', '사', '무례지형'],   // 무례의 형
  ['사', '신', '무례지형'],
  ['인', '신', '무례지형'],
  ['축', '술', '무은지형'],   // 은혜 없는 형
  ['술', '미', '무은지형'],
  ['축', '미', '무은지형'],
  ['자', '묘', '무례지형'],   // 무례의 형
  ['진', '진', '자형'],       // 자형 (self-punishment)
  ['오', '오', '자형'],
  ['유', '유', '자형'],
  ['해', '해', '자형'],
];

// ─── Analysis types ───

export interface ChungRelation {
  type: '지지충';
  branch1: JiJi;
  branch2: JiJi;
  pillar1: string; // e.g. '일지', '월지', '년지'
  pillar2: string;
  element1: OHaeng;
  element2: OHaeng;
  description: string;
}

export interface HapRelation {
  type: '천간합' | '육합' | '삼합' | '방합';
  elements: string[];
  pillars: string[];
  resultElement: OHaeng;
  description: string;
}

export interface HyeongRelation {
  type: '형';
  branch1: JiJi;
  branch2: JiJi;
  pillar1: string;
  pillar2: string;
  subType: string;
  description: string;
}

export interface OHaengBalance {
  element: OHaeng;
  count: number;
  stems: string[];
  branches: string[];
}

export interface SajuAnalysis {
  // Basic info
  ilgan: CheonGan;
  ilganElement: OHaeng;
  ilganEumyang: string;

  // Relationships found
  clashes: ChungRelation[];
  harmonies: HapRelation[];
  punishments: HyeongRelation[];

  // Element balance
  elementBalance: OHaengBalance[];
  strongElements: OHaeng[];
  weakElements: OHaeng[];
  missingElements: OHaeng[];

  // Key observations for prompt
  supportingElements: string[]; // elements that help the 일간
  challengingElements: string[]; // elements that challenge the 일간

  // Summary text for LLM prompt (Korean)
  summaryKo: string;
}

const PILLAR_NAMES = ['년', '월', '일', '시'];

function getPillarBranches(saju: Saju): { branch: JiJi; pillar: string }[] {
  const result: { branch: JiJi; pillar: string }[] = [];
  if (saju.year) result.push({ branch: saju.year.branch as JiJi, pillar: '년지' });
  if (saju.month) result.push({ branch: saju.month.branch as JiJi, pillar: '월지' });
  if (saju.day) result.push({ branch: saju.day.branch as JiJi, pillar: '일지' });
  if (saju.hour) result.push({ branch: saju.hour.branch as JiJi, pillar: '시지' });
  return result;
}

function getPillarStems(saju: Saju): { stem: CheonGan; pillar: string }[] {
  const result: { stem: CheonGan; pillar: string }[] = [];
  if (saju.year) result.push({ stem: saju.year.stem as CheonGan, pillar: '년간' });
  if (saju.month) result.push({ stem: saju.month.stem as CheonGan, pillar: '월간' });
  if (saju.day) result.push({ stem: saju.day.stem as CheonGan, pillar: '일간' });
  if (saju.hour) result.push({ stem: saju.hour.stem as CheonGan, pillar: '시간' });
  return result;
}

function findClashes(saju: Saju): ChungRelation[] {
  const branches = getPillarBranches(saju);
  const clashes: ChungRelation[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const isClash = JIJI_CHUNG_PAIRS.some(
        ([a, b]) => (b1.branch === a && b2.branch === b) || (b1.branch === b && b2.branch === a)
      );
      if (isClash) {
        const e1 = BRANCH_TO_OHAENG[b1.branch];
        const e2 = BRANCH_TO_OHAENG[b2.branch];
        clashes.push({
          type: '지지충',
          branch1: b1.branch,
          branch2: b2.branch,
          pillar1: b1.pillar,
          pillar2: b2.pillar,
          element1: e1,
          element2: e2,
          description: `${b1.pillar}(${b1.branch})와 ${b2.pillar}(${b2.branch})가 충 — ${e1}과 ${e2}의 충돌로 변화와 긴장이 따르지만, 이를 극복하면 큰 전환점이 될 수 있음`,
        });
      }
    }
  }
  return clashes;
}

function findHarmonies(saju: Saju): HapRelation[] {
  const branches = getPillarBranches(saju);
  const stems = getPillarStems(saju);
  const harmonies: HapRelation[] = [];

  // 천간합
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const s1 = stems[i];
      const s2 = stems[j];
      const hap = CHEONGAN_HAP.find(
        ([a, b]) => (s1.stem === a && s2.stem === b) || (s1.stem === b && s2.stem === a)
      );
      if (hap) {
        harmonies.push({
          type: '천간합',
          elements: [s1.stem, s2.stem],
          pillars: [s1.pillar, s2.pillar],
          resultElement: hap[2],
          description: `${s1.pillar}(${s1.stem})과 ${s2.pillar}(${s2.stem})의 천간합 → ${hap[2]}의 기운이 강화되어 안정과 조화를 이룸`,
        });
      }
    }
  }

  // 육합
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const hap = JIJI_YUKHAP.find(
        ([a, b]) => (b1.branch === a && b2.branch === b) || (b1.branch === b && b2.branch === a)
      );
      if (hap) {
        harmonies.push({
          type: '육합',
          elements: [b1.branch, b2.branch],
          pillars: [b1.pillar, b2.pillar],
          resultElement: hap[2],
          description: `${b1.pillar}(${b1.branch})과 ${b2.pillar}(${b2.branch})의 육합 → ${hap[2]}의 기운으로 융합, 대인관계와 협력에 유리`,
        });
      }
    }
  }

  // 삼합 (check if 3 branches present)
  const branchSet = new Set(branches.map((b) => b.branch));
  for (const [a, b, c, element] of JIJI_SAMHAP) {
    const present = [a, b, c].filter((x) => branchSet.has(x));
    if (present.length >= 2) {
      const pillarsInvolved = present.map((br) => {
        const found = branches.find((x) => x.branch === br);
        return found ? `${found.pillar}(${br})` : br;
      });
      const isFull = present.length === 3;
      harmonies.push({
        type: '삼합',
        elements: present,
        pillars: pillarsInvolved,
        resultElement: element,
        description: isFull
          ? `${present.join('·')} 삼합 완성 → ${element}국이 형성되어 강력한 ${element}의 기운이 사주를 지배함`
          : `${present.join('·')}로 삼합의 일부가 형성 → ${element}의 기운이 부분적으로 작용`,
      });
    }
  }

  // 방합
  for (const [a, b, c, element] of JIJI_BANGHAP) {
    const present = [a, b, c].filter((x) => branchSet.has(x));
    if (present.length >= 2) {
      const pillarsInvolved = present.map((br) => {
        const found = branches.find((x) => x.branch === br);
        return found ? `${found.pillar}(${br})` : br;
      });
      if (present.length === 3) {
        harmonies.push({
          type: '방합',
          elements: present,
          pillars: pillarsInvolved,
          resultElement: element,
          description: `${present.join('·')} 방합 → ${element}의 방위 기운이 강하게 집중됨`,
        });
      }
    }
  }

  return harmonies;
}

function findPunishments(saju: Saju): HyeongRelation[] {
  const branches = getPillarBranches(saju);
  const punishments: HyeongRelation[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const b1 = branches[i];
      const b2 = branches[j];
      const hyeong = JIJI_HYEONG_PAIRS.find(
        ([a, b]) => (b1.branch === a && b2.branch === b) || (b1.branch === b && b2.branch === a)
      );
      if (hyeong) {
        punishments.push({
          type: '형',
          branch1: b1.branch,
          branch2: b2.branch,
          pillar1: b1.pillar,
          pillar2: b2.pillar,
          subType: hyeong[2],
          description: `${b1.pillar}(${b1.branch})과 ${b2.pillar}(${b2.branch})의 ${hyeong[2]} — 시련이 따르지만 이를 통해 성장의 기회를 얻음`,
        });
      }
    }
    // Self-punishment
    const selfPun = JIJI_HYEONG_PAIRS.find(
      ([a, b, t]) => a === b && a === branches[i].branch && t === '자형'
    );
    // Only check once per branch (avoid duplicate if same branch appears)
    if (selfPun) {
      const duplicates = branches.filter((b) => b.branch === branches[i].branch);
      if (duplicates.length >= 2 && i === branches.indexOf(duplicates[0])) {
        punishments.push({
          type: '형',
          branch1: duplicates[0].branch,
          branch2: duplicates[1].branch,
          pillar1: duplicates[0].pillar,
          pillar2: duplicates[1].pillar,
          subType: '자형',
          description: `${duplicates[0].branch}가 ${duplicates[0].pillar}과 ${duplicates[1].pillar}에 중복 — 자형으로 내적 갈등이 있으나 자기 극복의 힘이 됨`,
        });
      }
    }
  }

  return punishments;
}

function analyzeElementBalance(saju: Saju, ilgan: CheonGan): {
  balance: OHaengBalance[];
  strong: OHaeng[];
  weak: OHaeng[];
  missing: OHaeng[];
} {
  const counts: Record<OHaeng, { stems: string[]; branches: string[] }> = {
    '목': { stems: [], branches: [] },
    '화': { stems: [], branches: [] },
    '토': { stems: [], branches: [] },
    '금': { stems: [], branches: [] },
    '수': { stems: [], branches: [] },
  };

  const stems = getPillarStems(saju);
  const branches = getPillarBranches(saju);

  for (const s of stems) {
    const oh = STEM_TO_OHAENG[s.stem];
    counts[oh].stems.push(`${s.pillar}(${s.stem})`);
  }
  for (const b of branches) {
    const oh = BRANCH_TO_OHAENG[b.branch];
    counts[oh].branches.push(`${b.pillar}(${b.branch})`);
  }

  const all: OHaeng[] = ['목', '화', '토', '금', '수'];
  const balance: OHaengBalance[] = all.map((el) => ({
    element: el,
    count: counts[el].stems.length + counts[el].branches.length,
    stems: counts[el].stems,
    branches: counts[el].branches,
  }));

  const strong = balance.filter((b) => b.count >= 3).map((b) => b.element);
  const weak = balance.filter((b) => b.count === 1).map((b) => b.element);
  const missing = balance.filter((b) => b.count === 0).map((b) => b.element);

  return { balance, strong, weak, missing };
}

/**
 * Analyze a saju chart for 충, 합, 형, element balance, and generate
 * a Korean summary suitable for LLM prompts.
 */
export function analyzeSaju(sajuResult: SajuResult): SajuAnalysis {
  const { saju } = sajuResult;
  const ilgan = saju.day.stem as CheonGan;
  const ilganElement = STEM_TO_OHAENG[ilgan];
  const ilganEumyang = STEM_EUMYANG[ilgan];

  const clashes = findClashes(saju);
  const harmonies = findHarmonies(saju);
  const punishments = findPunishments(saju);
  const { balance, strong, weak, missing } = analyzeElementBalance(saju, ilgan);

  // What helps the 일간?
  // 일간을 생해주는 오행 (인성) = the element that produces 일간's element
  const producesMe = (['목', '화', '토', '금', '수'] as OHaeng[]).find(
    (el) => OHAENG_SANGSAENG[el] === ilganElement
  );
  // 일간과 같은 오행 (비겁) = same element
  const supporting: string[] = [];
  if (producesMe) {
    const pCount = balance.find((b) => b.element === producesMe);
    if (pCount && pCount.count > 0)
      supporting.push(`${producesMe}(인성)이 ${pCount.count}개로 학문·지원 운이 있음`);
  }
  const sameCount = balance.find((b) => b.element === ilganElement);
  if (sameCount && sameCount.count >= 2)
    supporting.push(`${ilganElement}(비겁)이 ${sameCount.count}개로 자기 힘이 강함`);

  // What challenges the 일간?
  const challenging: string[] = [];
  // 일간을 극하는 오행 (관성)
  const controlsMe = (['목', '화', '토', '금', '수'] as OHaeng[]).find(
    (el) => OHAENG_SANGGEUK[el] === ilganElement
  );
  if (controlsMe) {
    const cCount = balance.find((b) => b.element === controlsMe);
    if (cCount && cCount.count >= 2)
      challenging.push(`${controlsMe}(관성)이 ${cCount.count}개로 압박과 책임감이 강함`);
  }
  // 일간이 극하는 오행 (재성) — too much drains the 일간
  const iControl = OHAENG_SANGGEUK[ilganElement];
  const iControlCount = balance.find((b) => b.element === iControl);
  if (iControlCount && iControlCount.count >= 3)
    challenging.push(`${iControl}(재성)이 ${iControlCount.count}개로 재물 욕심이 크나 에너지 소모가 많음`);

  // Build Korean summary
  const lines: string[] = [];
  lines.push(`일간: ${ilgan}(${ilganElement}·${ilganEumyang}) — 격국: ${sajuResult.gyeokguk}`);

  if (harmonies.length > 0) {
    lines.push(`[합] ${harmonies.map((h) => h.description).join('. ')}`);
  }
  if (clashes.length > 0) {
    lines.push(`[충] ${clashes.map((c) => c.description).join('. ')}`);
  }
  if (punishments.length > 0) {
    lines.push(`[형] ${punishments.map((p) => p.description).join('. ')}`);
  }

  const elSummary = balance
    .filter((b) => b.count > 0)
    .map((b) => `${b.element}:${b.count}`)
    .join(', ');
  lines.push(`[오행 분포] ${elSummary}`);
  if (strong.length > 0) lines.push(`[강한 오행] ${strong.join(', ')}`);
  if (missing.length > 0) lines.push(`[없는 오행] ${missing.join(', ')} — 이 기운을 보충하면 균형이 잡힘`);
  if (supporting.length > 0) lines.push(`[유리한 점] ${supporting.join('. ')}`);
  if (challenging.length > 0) lines.push(`[주의할 점] ${challenging.join('. ')}`);

  return {
    ilgan,
    ilganElement,
    ilganEumyang,
    clashes,
    harmonies,
    punishments,
    elementBalance: balance,
    strongElements: strong,
    weakElements: weak,
    missingElements: missing,
    supportingElements: supporting,
    challengingElements: challenging,
    summaryKo: lines.join('\n'),
  };
}
