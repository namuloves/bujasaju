/**
 * sajuContext.ts
 *
 * Loads the saju interpretation database (JSON files in public/saju-data/)
 * and builds a rich context string for a given saju result. This context
 * is fed into the Claude/OpenAI prompt so the AI can generate deeply
 * informed 사주풀이 narratives.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import type { SajuResult, CheonGan } from './types';

// ── Types ──────────────────────────────────────────────────────────────

interface IljuEntry {
  id: string;
  stem: string;
  branch: string;
  stemElement: string;
  branchElement: string;
  daySipsin: string;
  traits: string[];
  strengths: string[];
  weaknesses: string[];
  careers: string[];
  summary: string;
}

interface GyeokgukEntry {
  id: string;
  hanja: string;
  keyword: string;
  description: string;
  personality: string;
  wealthPattern: string;
  careerPattern: string;
  lifePath: string;
}

interface SipsungEntry {
  id: string;
  hanja: string;
  keyword: string;
  personality: string;
  wealthStyle: string;
  careerStyle: string;
  relationshipStyle: string;
}

interface WoljiEntry {
  id: string;
  hanja: string;
  animal: string;
  element: string;
  nature: string;
  keyword: string;
  forDayMaster: Record<string, string>;
}

interface OhaengData {
  elements: Record<string, {
    name: string;
    whenExcess: string;
    whenDeficient: string;
    whenAbsent: string;
  }>;
  dayMasterNeeds: Record<string, {
    element: string;
    idealSupport: string;
    worst: string;
  }>;
}

interface TwelveStageEntry {
  id: string;
  hanja: string;
  keyword: string;
  description: string;
  personality: string;
  fortune: string;
}

// ── Element mappings ───────────────────────────────────────────────────

const STEM_ELEMENT: Record<string, string> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};

const BRANCH_BONGI: Record<string, string> = {
  자: '계', 축: '기', 인: '갑', 묘: '을', 진: '무', 사: '병',
  오: '정', 미: '기', 신: '경', 유: '신', 술: '무', 해: '임',
};

// 십이운성 table: stem → branch → stage name
const TWELVE_STAGE_TABLE: Record<string, Record<string, string>> = {
  갑: { 해: '장생', 자: '목욕', 축: '관대', 인: '건록', 묘: '제왕', 진: '쇠', 사: '병', 오: '사', 미: '묘', 신: '절', 유: '태', 술: '양' },
  을: { 오: '장생', 사: '목욕', 진: '관대', 묘: '건록', 인: '제왕', 축: '쇠', 자: '병', 해: '사', 술: '묘', 유: '절', 신: '태', 미: '양' },
  병: { 인: '장생', 묘: '목욕', 진: '관대', 사: '건록', 오: '제왕', 미: '쇠', 신: '병', 유: '사', 술: '묘', 해: '절', 자: '태', 축: '양' },
  정: { 유: '장생', 신: '목욕', 미: '관대', 오: '건록', 사: '제왕', 진: '쇠', 묘: '병', 인: '사', 축: '묘', 자: '절', 해: '태', 술: '양' },
  무: { 인: '장생', 묘: '목욕', 진: '관대', 사: '건록', 오: '제왕', 미: '쇠', 신: '병', 유: '사', 술: '묘', 해: '절', 자: '태', 축: '양' },
  기: { 유: '장생', 신: '목욕', 미: '관대', 오: '건록', 사: '제왕', 진: '쇠', 묘: '병', 인: '사', 축: '묘', 자: '절', 해: '태', 술: '양' },
  경: { 사: '장생', 오: '목욕', 미: '관대', 신: '건록', 유: '제왕', 술: '쇠', 해: '병', 자: '사', 축: '묘', 인: '절', 묘: '태', 진: '양' },
  신: { 자: '장생', 해: '목욕', 술: '관대', 유: '건록', 신: '제왕', 미: '쇠', 오: '병', 사: '사', 진: '묘', 묘: '절', 인: '태', 축: '양' },
  임: { 신: '장생', 유: '목욕', 술: '관대', 해: '건록', 자: '제왕', 축: '쇠', 인: '병', 묘: '사', 진: '묘', 사: '절', 오: '태', 미: '양' },
  계: { 묘: '장생', 인: '목욕', 축: '관대', 자: '건록', 해: '제왕', 술: '쇠', 유: '병', 신: '사', 미: '묘', 오: '절', 사: '태', 진: '양' },
};

// ── Load JSON data (cached at module level) ────────────────────────────

function loadJson<T>(filename: string): T {
  const filePath = join(process.cwd(), 'public', 'saju-data', filename);
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

let _ilju: IljuEntry[];
let _gyeokguk: GyeokgukEntry[];
let _sipsung: SipsungEntry[];
let _wolji: WoljiEntry[];
let _ohaeng: OhaengData;
let _stages: TwelveStageEntry[];

function ensureLoaded() {
  if (!_ilju) {
    _ilju = loadJson<IljuEntry[]>('ilju.json');
    _gyeokguk = loadJson<GyeokgukEntry[]>('gyeokguk.json');
    _sipsung = loadJson<SipsungEntry[]>('sipsung.json');
    _wolji = loadJson<WoljiEntry[]>('wolji.json');
    _ohaeng = loadJson<OhaengData>('ohaeng-analysis.json');
    _stages = loadJson<TwelveStageEntry[]>('twelve-stages.json');
  }
}

// ── Ohaeng balance ─────────────────────────────────────────────────────

function countOhaeng(saju: SajuResult['saju']): Record<string, number> {
  const counts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const pillars = [saju.year, saju.month, saju.day];
  if (saju.hour) pillars.push(saju.hour);

  for (const p of pillars) {
    counts[STEM_ELEMENT[p.stem]]++;
    const bongi = BRANCH_BONGI[p.branch];
    counts[STEM_ELEMENT[bongi]]++;
  }
  return counts;
}

// ── Main export ────────────────────────────────────────────────────────

/**
 * Build a rich 명리학 context string for a given saju result.
 * This is meant to be injected into the AI prompt.
 */
export function buildSajuContext(sajuResult: SajuResult): string {
  ensureLoaded();

  const { saju, gyeokguk, ilju, wolji } = sajuResult;
  const dayStem = saju.day.stem;
  const dayBranch = saju.day.branch;
  const dayElement = STEM_ELEMENT[dayStem];

  // Look up data
  const iljuData = _ilju.find(x => x.id === ilju);
  const gyeokgukData = _gyeokguk.find(x => x.id === gyeokguk);
  const woljiData = _wolji.find(x => x.id === wolji);
  const sipsungData = iljuData ? _sipsung.find(x => x.id === iljuData.daySipsin) : null;
  const dmNeeds = _ohaeng.dayMasterNeeds[dayStem as string];

  // 십이운성 of 일지
  const dayBranchStage = TWELVE_STAGE_TABLE[dayStem]?.[dayBranch];
  const stageData = dayBranchStage ? _stages.find(x => x.id === dayBranchStage) : null;

  // 오행 balance
  const counts = countOhaeng(saju);
  const missing = Object.entries(counts).filter(([, v]) => v === 0).map(([k]) => k);
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const strongest = sorted[0];

  // ── Build context string ─────────────────────────────────────────────

  const sections: string[] = [];

  // 1. 일주
  if (iljuData) {
    sections.push(`# ${ilju} 일주 해석
${iljuData.summary}
성격: ${iljuData.traits.join(', ')}
강점: ${iljuData.strengths.join(', ')}
약점: ${iljuData.weaknesses.join(', ')}
적합 직업: ${iljuData.careers.join(', ')}`);
  }

  // 2. 일지 십성
  if (sipsungData) {
    sections.push(`# 일지 십성: ${iljuData?.daySipsin}(${sipsungData.hanja})
${sipsungData.personality}
재물 스타일: ${sipsungData.wealthStyle}
직업 스타일: ${sipsungData.careerStyle}
관계 스타일: ${sipsungData.relationshipStyle}`);
  }

  // 3. 십이운성
  if (stageData) {
    sections.push(`# 일지 십이운성: ${dayBranchStage}(${stageData.hanja})
${stageData.description}
성격: ${stageData.personality}
운세: ${stageData.fortune}`);
  }

  // 4. 월지
  if (woljiData) {
    const woljiRelation = woljiData.forDayMaster[dayElement] || '';
    sections.push(`# 월지: ${wolji}(${woljiData.hanja}) — ${woljiData.animal}
${woljiData.nature}
${dayElement} 일간과의 관계: ${woljiRelation}`);
  }

  // 5. 격국
  if (gyeokgukData) {
    sections.push(`# 격국: ${gyeokguk}(${gyeokgukData.hanja})
${gyeokgukData.description}
성격: ${gyeokgukData.personality}
재물: ${gyeokgukData.wealthPattern}
직업: ${gyeokgukData.careerPattern}
인생: ${gyeokgukData.lifePath}`);
  }

  // 6. 오행 밸런스
  const ohaengLines: string[] = [];
  ohaengLines.push(`오행 분포: 목${counts.목} 화${counts.화} 토${counts.토} 금${counts.금} 수${counts.수}`);
  ohaengLines.push(`가장 강한 오행: ${strongest[0]}(${strongest[1]}개)`);

  if (missing.length > 0) {
    ohaengLines.push(`없는 오행: ${missing.join(', ')}`);
    for (const m of missing) {
      const elData = _ohaeng.elements[m];
      if (elData) {
        ohaengLines.push(`${elData.name} 부재의 영향: ${elData.whenAbsent}`);
      }
    }
  }

  // Check for excess
  if (parseInt(strongest[1] as unknown as string) >= 3) {
    const exData = _ohaeng.elements[strongest[0]];
    if (exData) {
      ohaengLines.push(`${exData.name} 과다의 영향: ${exData.whenExcess}`);
    }
  }

  if (dmNeeds) {
    ohaengLines.push(`${dayStem}(${dayElement}) 일간이 필요한 것: ${dmNeeds.idealSupport}`);
    ohaengLines.push(`주의: ${dmNeeds.worst}`);
  }

  sections.push(`# 오행 밸런스 분석\n${ohaengLines.join('\n')}`);

  return sections.join('\n\n');
}
