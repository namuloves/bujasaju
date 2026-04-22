import OpenAI from 'openai';
import type { NextRequest } from 'next/server';
import { promises as fs } from 'fs';

export const maxDuration = 60;
import path from 'path';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { analyzeSaju } from '@/lib/saju/relationships';
import { buildSajuContext } from '@/lib/saju/sajuContext';
import { calculateDaeUn, getDaeUnSipSin } from '@/lib/saju/daewoon';
import {
  STEM_TO_OHAENG,
  BRANCH_TO_OHAENG,
  OHAENG_SANGSAENG,
  OHAENG_SANGGEUK,
} from '@/lib/saju/constants';
import type {
  SajuResult,
  CheonGan,
  JiJi,
  OHaeng,
} from '@/lib/saju/types';
import { getFailureKo, type DeepBioV2 } from '@/lib/deepBio';

/**
 * POST /api/saju-deep-summary
 *
 * Streams a 5-section Korean 사주 풀이 focused on a single featured
 * billionaire who has a v2 deep bio. Combines:
 *   - the user's saju + 충합형
 *   - the user's 대운 + 대운×원국 충극합
 *   - the featured person's full v2 bio (capitalOrigin, moneyMechanics,
 *     turningPoints, careerTimeline w/ whyItMatteredKo, failures w/
 *     howTheyOvercameKo, characterKo)
 *   - the featured person's 대운 + per-event 대운×원국 충극합
 *
 * The output is markdown with `## 1) ...` through `## 5) ...` headings.
 * The client streams chunks and renders the markdown progressively.
 *
 * This is *additive* to /api/saju-summary — both run in parallel.
 *
 * Validated quality bar: scripts/test-musk-v2bio.ts
 */

export const runtime = 'nodejs';

// ─── Request types ───

interface SajuPillar {
  stem: string;
  branch: string;
}

interface UserSaju {
  ilju: string;
  wolji: string;
  gyeokguk: string;
  ilgan: string;
  birthday?: string; // YYYY-MM-DD — required for v2 heavy path (대운)
  gender?: 'M' | 'F'; // required for v2 heavy path (대운 방향)
  year: SajuPillar;
  month: SajuPillar;
  day: SajuPillar;
  hour?: SajuPillar | null;
}

interface FeaturedPerson {
  id: string;
  name: string;
  nameKo?: string;
  birthday: string; // YYYY-MM-DD
  netWorth: number; // billions USD
  nationality: string;
  industry?: string;
  gender: 'M' | 'F';
  ilju: string;
  wolji: string;
  gyeokguk: string;
  year: SajuPillar;
  month: SajuPillar;
  day: SajuPillar;
  bio?: string;     // one-sentence summary (from enriched data)
  bioKo?: string;
  wealthOrigin?: string; // self-made / inherited / mixed
}

interface DeepSummaryInput {
  user: UserSaju;
  featured: FeaturedPerson;
}

// ─── 충극합 helpers (mirrors scripts/test-musk-v2bio.ts) ───

const JIJI_CHUNG_PAIRS: ReadonlyArray<readonly [JiJi, JiJi]> = [
  ['자', '오'],
  ['축', '미'],
  ['인', '신'],
  ['묘', '유'],
  ['진', '술'],
  ['사', '해'],
];

const JIJI_YUKHAP: ReadonlyArray<readonly [JiJi, JiJi, OHaeng]> = [
  ['자', '축', '토'],
  ['인', '해', '목'],
  ['묘', '술', '화'],
  ['진', '유', '금'],
  ['사', '신', '수'],
  ['오', '미', '토'],
];

const JIJI_HYEONG: ReadonlyArray<readonly [JiJi, JiJi]> = [
  ['인', '사'],
  ['사', '신'],
  ['인', '신'],
  ['축', '술'],
  ['술', '미'],
  ['축', '미'],
  ['자', '묘'],
];

function ohaengRelation(from: OHaeng, to: OHaeng): string {
  if (from === to) return '비화(같은 오행)';
  if (OHAENG_SANGSAENG[from] === to) return `${from}이 ${to}을(를) 생(돕는 관계)`;
  if (OHAENG_SANGSAENG[to] === from) return `${to}이 ${from}을(를) 생(대운이 원국을 도움)`;
  if (OHAENG_SANGGEUK[from] === to) return `${from}이 ${to}을(를) 극(때리는 관계)`;
  if (OHAENG_SANGGEUK[to] === from) return `${to}이 ${from}을(를) 극(압박 받음)`;
  return '중립';
}

function analyzeDaeUnRelation(
  daeStem: CheonGan,
  daeBranch: JiJi,
  saju: SajuResult
): string {
  const lines: string[] = [];
  const ilgan = saju.saju.day.stem as CheonGan;
  const ilganEl = STEM_TO_OHAENG[ilgan];
  const daeStemEl = STEM_TO_OHAENG[daeStem];
  const daeBranchEl = BRANCH_TO_OHAENG[daeBranch];

  lines.push(
    `대운 천간 ${daeStem}(${daeStemEl}) vs 일간 ${ilgan}(${ilganEl}): ${ohaengRelation(daeStemEl, ilganEl)}`
  );

  const branches: Array<{ label: string; branch: JiJi }> = [
    { label: '년지', branch: saju.saju.year.branch as JiJi },
    { label: '월지', branch: saju.saju.month.branch as JiJi },
    { label: '일지', branch: saju.saju.day.branch as JiJi },
  ];

  for (const { label, branch } of branches) {
    const branchEl = BRANCH_TO_OHAENG[branch];
    const isChung = JIJI_CHUNG_PAIRS.some(
      ([a, b]) => (a === daeBranch && b === branch) || (b === daeBranch && a === branch)
    );
    if (isChung) {
      lines.push(`⚠️ 대운 지지 ${daeBranch} ↔ ${label} ${branch}: ${daeBranch}${branch}충(정면 충돌)`);
      continue;
    }
    const isHyeong = JIJI_HYEONG.some(
      ([a, b]) => (a === daeBranch && b === branch) || (b === daeBranch && a === branch)
    );
    if (isHyeong) {
      lines.push(`⚠️ 대운 지지 ${daeBranch} ↔ ${label} ${branch}: ${daeBranch}${branch}형(삐걱거림·법적 문제·수술)`);
      continue;
    }
    const hap = JIJI_YUKHAP.find(
      ([a, b]) => (a === daeBranch && b === branch) || (b === daeBranch && a === branch)
    );
    if (hap) {
      lines.push(`✨ 대운 지지 ${daeBranch} ↔ ${label} ${branch}: 육합 → ${hap[2]} 기운 생성`);
      continue;
    }
    const rel = ohaengRelation(daeBranchEl, branchEl);
    if (rel !== '중립' && rel !== '비화(같은 오행)') {
      lines.push(
        `대운 지지 ${daeBranch}(${daeBranchEl}) vs ${label} ${branch}(${branchEl}): ${rel}`
      );
    }
  }
  return lines.join('\n');
}

function buildSajuResult(
  pillars: { year: SajuPillar; month: SajuPillar; day: SajuPillar; hour?: SajuPillar | null },
  ilju: string,
  wolji: string,
  gyeokguk: string
): SajuResult {
  return {
    saju: {
      year: { stem: pillars.year.stem as CheonGan, branch: pillars.year.branch as JiJi },
      month: { stem: pillars.month.stem as CheonGan, branch: pillars.month.branch as JiJi },
      day: { stem: pillars.day.stem as CheonGan, branch: pillars.day.branch as JiJi },
      hour: pillars.hour
        ? { stem: pillars.hour.stem as CheonGan, branch: pillars.hour.branch as JiJi }
        : null,
    },
    gyeokguk: gyeokguk as SajuResult['gyeokguk'],
    ilju,
    wolji: wolji as JiJi,
  };
}

// 1 USD = 1480.71 KRW to match MatchResults' client-side USD_TO_KRW,
// so OG image and prompt output agree on the same figure.
function formatKrw(netWorthUsdB: number): string {
  // $1B = 10억 USD × 1480.71 KRW/USD = 14,807.1억 원
  const eokWon = netWorthUsdB * 14807.1; // in 억 원
  if (eokWon >= 10000) {
    const jo = eokWon / 10000;
    return `약 ${jo.toFixed(1).replace(/\.0$/, '')}조 원`;
  }
  return `약 ${Math.round(eokWon).toLocaleString('ko-KR')}억 원`;
}

// ─── Prompt builder ───

function buildPrompt(
  user: UserSaju,
  featured: FeaturedPerson,
  bio: DeepBioV2
): string {
  const userSaju = buildSajuResult(user, user.ilju, user.wolji, user.gyeokguk);
  const featuredSaju = buildSajuResult(featured, featured.ilju, featured.wolji, featured.gyeokguk);

  const userAnalysis = analyzeSaju(userSaju);
  const userContext = buildSajuContext(userSaju);
  // Caller guarantees birthday + gender are set before invoking the heavy path.
  const userBirthday = user.birthday!;
  const userGender = user.gender!;
  const userBirthYear = parseInt(userBirthday.slice(0, 4), 10);
  const userDaeUn = calculateDaeUn(userBirthday, userGender, userSaju);
  const userIlgan = userSaju.saju.day.stem as CheonGan;
  const userDaeUnWithYears = userDaeUn.periods
    .slice(0, 8)
    .map((p) => {
      const sy = userBirthYear + p.startAge;
      const ey = userBirthYear + p.endAge;
      return `${p.startAge}~${p.endAge}세 (${sy}~${ey}년): ${p.pillar} → ${getDaeUnSipSin(userIlgan, p.stem as CheonGan)}운`;
    })
    .join('\n');
  const userDaeUnRelations = userDaeUn.periods
    .slice(0, 8)
    .map((p) => {
      const sy = userBirthYear + p.startAge;
      const ey = userBirthYear + p.endAge;
      const rel = analyzeDaeUnRelation(p.stem as CheonGan, p.branch as JiJi, userSaju);
      return `### ${p.pillar} 대운 (${p.startAge}~${p.endAge}세, ${sy}~${ey}년)\n${rel}`;
    })
    .join('\n\n');

  const featuredContext = buildSajuContext(featuredSaju);
  const featuredBirthYear = parseInt(featured.birthday.slice(0, 4), 10);
  const featuredDaeUn = calculateDaeUn(featured.birthday, featured.gender, featuredSaju);
  const featuredIlgan = featuredSaju.saju.day.stem as CheonGan;
  const featuredDaeUnWithYears = featuredDaeUn.periods
    .slice(0, 8)
    .map((p) => {
      const sy = featuredBirthYear + p.startAge;
      const ey = featuredBirthYear + p.endAge;
      return `${p.startAge}~${p.endAge}세 (${sy}~${ey}년): ${p.pillar} → ${getDaeUnSipSin(featuredIlgan, p.stem as CheonGan)}운`;
    })
    .join('\n');

  const featuredDaeUnRelations = featuredDaeUn.periods
    .slice(0, 8)
    .map((p) => {
      const sy = featuredBirthYear + p.startAge;
      const ey = featuredBirthYear + p.endAge;
      const rel = analyzeDaeUnRelation(p.stem as CheonGan, p.branch as JiJi, featuredSaju);
      return `### ${p.pillar} 대운 (${p.startAge}~${p.endAge}세, ${sy}~${ey}년)\n${rel}`;
    })
    .join('\n\n');

  // age fallback: compute from year if bio entry lacks age field
  const ageOf = (entry: { year: number; age?: number }) =>
    entry.age ?? entry.year - featuredBirthYear;

  // Bio-derived rich blocks
  const timeline = bio.careerTimeline
    .map((e) => {
      const age = ageOf(e);
      const period = featuredDaeUn.periods.find((p) => age >= p.startAge && age <= p.endAge);
      const daeunInfo = period
        ? `${period.pillar}·${getDaeUnSipSin(featuredIlgan, period.stem as CheonGan)}운`
        : '?';
      let block = `- ${e.year}년 (${age}세, ${daeunInfo}): ${e.eventKo}\n  의미: ${e.whyItMatteredKo}`;
      if (e.whatTheyRiskedKo) block += `\n  건 것: ${e.whatTheyRiskedKo}`;
      if (e.whoHelpedKo) block += `\n  도움: ${e.whoHelpedKo}`;
      return block;
    })
    .join('\n\n');

  const turningPoints = bio.turningPoints
    .map((t) => {
      const age = ageOf(t);
      const period = featuredDaeUn.periods.find((p) => age >= p.startAge && age <= p.endAge);
      const daeunInfo = period
        ? `${period.pillar}·${getDaeUnSipSin(featuredIlgan, period.stem as CheonGan)}운`
        : '?';
      return `- ${t.year}년 (${age}세, ${daeunInfo}):\n  결정: ${t.decisionKo}\n  대안: ${t.alternativeKo}\n  결과: ${t.outcomeKo}`;
    })
    .join('\n\n');

  const failures = bio.failures
    .map((f) => {
      const age = ageOf(f);
      const period = featuredDaeUn.periods.find((p) => age >= p.startAge && age <= p.endAge);
      const daeunInfo = period
        ? `${period.pillar}·${getDaeUnSipSin(featuredIlgan, period.stem as CheonGan)}운`
        : '?';
      return `- ${f.year}년 (${age}세, ${daeunInfo}):\n  사건: ${getFailureKo(f)}\n  극복: ${f.howTheyOvercameKo}\n  교훈: ${f.lessonKo}`;
    })
    .join('\n\n');

  const wealthHistory = bio.wealthHistory
    .map((w) => `- ${w.year}년: $${w.netWorth}B`)
    .join('\n');

  // Per-event 충극합 — careerTimeline + failures
  const keyEvents = [
    ...bio.careerTimeline.slice(0, 6).map((e) => ({ year: e.year, age: ageOf(e), label: e.eventKo })),
    ...bio.failures.map((f) => ({ year: f.year, age: ageOf(f), label: getFailureKo(f).slice(0, 40) })),
  ];
  const keyEventRelations = keyEvents
    .map((e) => {
      const period = featuredDaeUn.periods.find((p) => e.age >= p.startAge && e.age <= p.endAge);
      if (!period) return '';
      const rel = analyzeDaeUnRelation(period.stem as CheonGan, period.branch as JiJi, featuredSaju);
      return `### ${e.year}년 (${e.age}세, ${period.pillar} 대운) — ${e.label}\n${rel}`;
    })
    .filter(Boolean)
    .join('\n\n');

  // Determine which saju elements are actually shared (for section 1)
  const sharedElements: string[] = [];
  if (user.ilju === featured.ilju) sharedElements.push(`같은 ${featured.ilju} 일주`);
  if (
    user.month.stem === featured.month.stem &&
    user.month.branch === featured.month.branch
  ) {
    sharedElements.push(`같은 ${featured.month.stem}${featured.month.branch} 월주`);
  } else if (user.wolji === featured.wolji) {
    sharedElements.push(`같은 ${featured.wolji} 월지`);
  }
  if (user.gyeokguk === featured.gyeokguk) sharedElements.push(`같은 ${featured.gyeokguk}`);
  const sharedText = sharedElements.length > 0 ? sharedElements.join('·') : '비슷한 사주 구조';

  const featuredName = featured.nameKo ?? featured.name;
  const netWorthKr = formatKrw(featured.netWorth);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- v2 bio schema varies across batches
  const mm = bio.moneyMechanics as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ch = bio.characterKo as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const co = bio.capitalOrigin as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cd = bio.childhood as any;

  return `당신은 40년 경력의 한국 사주명리학 대가입니다.

# 십성 용어 정의 (반드시 이 정의대로 해석하세요)
- 비견: 같은 오행·같은 음양. 형제·동료·경쟁자. 자립·자아 강화.
- 겁재: 같은 오행·다른 음양. 경쟁자·협력자. 큰 판 벌이기, 재산의 유입과 유출 동시.
- 식신: 내가 생하는 오행·같은 음양. 표현·창조·여유. 일상의 즐거움, 지속 가능한 생산.
- 상관: 내가 생하는 오행·다른 음양. 재능·표현·반항. 권위에 대한 도전, 빛나는 재능.
- 편재: 내가 극하는 오행·같은 음양. 큰 돈·활동 자금·기회. 유동적이고 큰 재물.
- 정재: 내가 극하는 오행·다른 음양. 안정적 수입·월급·정해진 재물.
- 편관(칠살): 나를 극하는 오행·같은 음양. 권력·압박·도전. 살기 있는 변화, 큰 성취의 대가.
- 정관: 나를 극하는 오행·다른 음양. 명예·직위·안정적 권위.
- 편인: 나를 생하는 오행·같은 음양. 비정통 학습·직관·편협한 지식. 고독한 연구.
- 정인: 나를 생하는 오행·다른 음양. 어머니·학문·보호·안정.

# 대운 해석 절대 규칙
- 아래 제공된 "대운 (연도 매핑)" 표의 대운 이름과 연도를 반드시 그대로 인용.
- 표에 없는 대운을 쓰거나, 연도-대운 매칭을 바꾸지 마세요.
- 대운 표를 다시 출력하지 마세요. 해석 산문만.

# 사용자 사주 (${userGender === 'M' ? '남성' : '여성'}, ${userBirthday})
- 일주: ${user.ilju} / 일간: ${user.ilgan} / 월지: ${user.wolji} / 격국: ${user.gyeokguk}
${userContext}

# 사용자 충합형 분석
${userAnalysis.summaryKo}

# 사용자 대운 (연도 매핑)
${userDaeUnWithYears}

# 사용자 대운 × 원국 충극합 분석 (사전 계산)
${userDaeUnRelations}

# 매칭된 부자: ${featuredName}
- 순자산: ${featured.netWorth ? `$${featured.netWorth}B (${netWorthKr})` : netWorthKr}
- 생년월일: ${featured.birthday}, ${featured.gender === 'M' ? '남성' : '여성'}
- 일주: ${featured.ilju} / 월지: ${featured.wolji} / 격국: ${featured.gyeokguk}
- 출생지/성장배경: ${cd.summaryKo ?? (`${cd.birthPlaceKo ?? ''} ${cd.familyBackgroundKo ?? ''}`.trim() || '정보 없음')}
- 자본 기원: ${co.typeKo ?? ''} — ${co.explanationKo ?? co.descriptionKo ?? ''}

## ${featuredName}의 돈을 번 구조 (moneyMechanics)
${mm.coreBusinessKo
    ? `- 핵심 사업: ${mm.coreBusinessKo}\n- 해자(moat): ${mm.moatKo}\n- 운 vs 실력: ${mm.luckVsSkillKo}\n- 정치 자본: ${mm.politicalCapitalKo}\n- 자본 이력: ${mm.capitalHistoryKo}`
    : `- 주 수입원: ${mm.primaryIncomeSourceKo ?? ''}\n- 부의 가속 요인: ${Array.isArray(mm.wealthAcceleratorsKo) ? mm.wealthAcceleratorsKo.join(', ') : (mm.wealthAcceleratorsKo ?? '')}\n- 구조적 이점: ${Array.isArray(mm.structuralAdvantagesKo) ? mm.structuralAdvantagesKo.join(', ') : (mm.structuralAdvantagesKo ?? '')}\n- 자산 구성: ${mm.currentAssetAllocationKo ?? ''}`}

## ${featuredName}의 관찰된 성격 (characterKo)
${ch.observedTraitsKo
    ? `- 특징: ${ch.observedTraitsKo}\n- 리더십: ${ch.leadershipStyleKo}\n- 갈등 대응: ${ch.conflictBehaviorKo}\n- 특이점: ${ch.knownQuirksKo}`
    : `- 강점: ${ch.strengths ?? ''}\n- 약점: ${ch.weaknesses ?? ''}\n- 동기: ${ch.motivation ?? ''}\n- 레거시: ${ch.legacy ?? ''}`}

## ${featuredName}의 사주 해석
${featuredContext}

## ${featuredName}의 대운 (연도 매핑 — 반드시 이 연도를 사용하세요)
${featuredDaeUnWithYears}

## ${featuredName}의 각 대운 × 원국 충극합 분석 (사전 계산됨)
${featuredDaeUnRelations}

## 🎯 ${featuredName} 주요 사건 연도의 대운 × 원국 충극합 (섹션 4·5에서 반드시 인용)
${keyEventRelations}

## ${featuredName}의 커리어 타임라인 (대운 매칭 + 의미·건 것·도움 포함)
${timeline}

## ${featuredName}의 결정적 선택 (turning points)
${turningPoints}

## ${featuredName}의 실패와 위기 (극복 과정 포함)
${failures}

## ${featuredName}의 순자산 변화
${wealthHistory}

# 작성 지침

아래 2개 섹션 마크다운 헤딩(##)으로 구분. 간결하게.

**1) 당신의 사주 + 부자와의 연결 (가장 중요)**

반드시 아래 두 문장 구조로. 따옴표(" " 또는 ' ')로 감싸지 말고 평문 산문으로.

문장 1 — 사용자의 사주를 일주 성격 데이터 기반으로 구체적으로:
[위 '${user.ilju} 일주 해석' 블록의 traits에서 가장 인상적인 특징 2개를 뽑아 자연어로], [${user.gyeokguk}의 핵심 특성 한 줄]을 가진 당신은 [이 조합이 만드는 구체적 재능/기질, 그림이 그려지는 문장].

문장 2 — 부자 매칭 (순자산 숫자는 아래 그대로 복사할 것):
당신처럼 ${sharedText}을(를) 가진 ${featuredName}은(는) [부자가 부자가 된 메커니즘 — 구체적 사업·연도]으로 **${netWorthKr}**을 축적했습니다.
⚠️ 순자산은 반드시 "${netWorthKr}" 그대로. 이 숫자를 변경·축소·반올림하면 안 됩니다.

### 섹션 1 절대 규칙
- **따옴표(" " ' ')로 문장을 감싸지 마세요. 일반 평문으로 시작.**
- **일주 성격 표현**: "${user.ilju} 일주 해석" 블록의 **traits**에서 2개를 골라 자연스러운 산문으로. "큰 나무", "깊은 물" 같은 오행 자연물 비유 금지.
- **격국**: "(상관격이라 기존 질서에 도전하는)" 식으로 괄호 안 짧게.
- **순자산**: "${netWorthKr}" 그대로. 변경 금지.
- 추상어 금지 — 구체적 행동 그림으로.

**섹션 1은 정확히 위 두 문장만. 추가 문장 절대 금지.**

**2) ${featuredName}의 인생 결정적 순간들**

부자의 인생에서 가장 결정적인 사건 2-3개를 위 careerTimeline/turningPoints/failures에서 골라 **사실 위주로** 짧게. 각 사건 1문장씩. 총 3-4문장.

### 섹션 2 규칙
- **명리학 용어(대운, 충, 형, 합, 생극) 일절 사용 금지.**
- 각 사건은 "[연도]년([나이]세)" 형식으로 시점만 표시.
- 사실 + 결과만 간결히. "왜" 대신 "무엇이 일어났는지"만.
- 마지막 문장: 부자의 패턴에서 한 줄 교훈을 사용자에게 적용. "좋은 시기가 오길 바랍니다" 같은 진부한 격려 금지.

### 좋은 예시 (참고만, 그대로 복사 금지)
이재용은 1996년(28세) 삼성에버랜드 전환사채를 헐값에 매입해 그룹 지배구조의 정점으로 올라섰고, 2014년(46세) 부친 의식불명 후 사실상 그룹 총수가 되었습니다. 2017년(49세) 박근혜·최순실 게이트로 수감되는 시련을 겪었습니다. 당신에게도 30대 중반에 큰 책임이 갑자기 주어지는 순간이 올 수 있습니다.

---

# 전체 출력 규칙 (두 섹션 모두 적용)

- **영어 단어 절대 금지.** 회사명/제품명 같은 고유명사 외에는 무조건 한국어. "PayPal 인수" 같은 회사명은 허용, "Technology 분야" 같은 일반명사는 금지 → "기술 분야"로.
- **영한 짬뽕 금지.** "capturable하게", "scalable한" 같은 영단어+한국어 활용 형태 절대 금지. 순한국어로 풀어쓰기.
- **번역체 금지.** "제공합니다", "부여합니다", "가져다줍니다" 금지 → "있어요", "돼요", "거든요" 같은 자연스러운 표현.
- **톤**: 자연스러운 한국어 경어체 (~합니다/~습니다). 마크다운 헤딩(##)으로 섹션 구분.
- "null" 금지.
- **전체 6-8문장 이내.** 섹션 1은 2문장, 섹션 2는 3-4문장. 이상 금지.

# 회사·브랜드 설명 규칙 (중요)
- 한국인에게 낯선 회사·브랜드가 처음 등장할 때는 **반드시 괄호로 1줄 설명**을 붙이세요. 두 번째 언급부터는 생략.
- 설명은 "무엇을 하는 회사인지" 한 줄. 매출·순위 같은 숫자는 넣지 말 것.
- 예시:
  - "Tesla(미국 전기차 제조사)" — 한국에서도 유명하므로 생략 가능
  - "Digicel(카리브해 최대 이동통신사)"
  - "Palantir(미국 빅데이터 분석 기업)"
  - "Neuralink(머스크가 세운 뇌-컴퓨터 인터페이스 회사)"
- 삼성·현대·LG·구글·애플·아마존·페이스북·테슬라·스페이스X·넷플릭스 같은 **한국에서 이미 유명한 이름**은 설명 불필요.
- 브랜드인지 회사인지, 제품인지 사업인지 애매한 경우도 짧게 정리: "Zara(스페인 SPA 브랜드)"처럼.`;
}

// ─── Light prompt (no v2 bio — enriched data only) ───

function buildLightPrompt(
  user: UserSaju,
  featured: FeaturedPerson,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  v1Bio: any | null
): string {
  const userSaju = buildSajuResult(user, user.ilju, user.wolji, user.gyeokguk);
  const featuredSaju = buildSajuResult(featured, featured.ilju, featured.wolji, featured.gyeokguk);

  const featuredContext = buildSajuContext(featuredSaju);

  const netWorthKr = formatKrw(featured.netWorth);
  const featuredName = featured.nameKo ?? featured.name;

  // Shared saju elements
  const sharedParts: string[] = [];
  if (user.ilju === featured.ilju) sharedParts.push('일주');
  if (
    user.month.stem === featured.month.stem &&
    user.month.branch === featured.month.branch
  ) {
    sharedParts.push('월주');
  } else if (user.wolji === featured.wolji) {
    sharedParts.push('월지');
  }
  if (user.gyeokguk === featured.gyeokguk) sharedParts.push('격국');
  const sharedDesc = sharedParts.length > 0
    ? sharedParts.join(', ') + '이 같은'
    : '비슷한 사주를 가진';

  const industry = featured.industry ?? '사업';
  const bioLine = featured.bioKo ?? featured.bio ?? '';
  const nationality = featured.nationality ?? '';

  // 국적 한국어 매핑 (주요 국가)
  const COUNTRY_KO: Record<string, string> = {
    US: '미국', KR: '한국', JP: '일본', CN: '중국', IN: '인도', FR: '프랑스',
    DE: '독일', GB: '영국', IT: '이탈리아', ES: '스페인', BR: '브라질',
    CA: '캐나다', AU: '호주', RU: '러시아', MX: '멕시코', SE: '스웨덴',
    CH: '스위스', HK: '홍콩', SG: '싱가포르', TW: '대만', TH: '태국',
    ID: '인도네시아', MY: '말레이시아', PH: '필리핀', VN: '베트남',
    IL: '이스라엘', SA: '사우디', AE: 'UAE', TR: '터키', NG: '나이지리아',
    ZA: '남아공', EG: '이집트', CO: '콜롬비아', CL: '칠레', AR: '아르헨티나',
    DK: '덴마크', NO: '노르웨이', FI: '핀란드', NL: '네덜란드', BE: '벨기에',
    AT: '오스트리아', PL: '폴란드', CZ: '체코', IE: '아일랜드', PT: '포르투갈',
    GR: '그리스', NZ: '뉴질랜드',
  };
  const countryKo = COUNTRY_KO[nationality] ?? nationality;

  // v1 bio 데이터 추출
  let careerBlock = '';
  let childhoodBlock = '';
  let knownForBlock = '';
  if (v1Bio) {
    if (v1Bio.childhood) {
      const ko = (a?: string, b?: string) => a || b || '';
      const earlyLife = ko(v1Bio.childhood.earlyLifeKo, v1Bio.childhood.earlyLife);
      const family = ko(v1Bio.childhood.familyBackgroundKo, v1Bio.childhood.familyBackground);
      if (earlyLife || family) {
        childhoodBlock = `\n## ${featuredName}의 성장 배경\n${family}\n${earlyLife}`;
      }
    }
    if (v1Bio.careerTimeline && v1Bio.careerTimeline.length > 0) {
      const events = v1Bio.careerTimeline
        .slice(0, 5)
        .map((e: { year: number; eventKo?: string; event?: string }) =>
          `- ${e.year}년: ${e.eventKo || e.event || ''}`
        )
        .join('\n');
      careerBlock = `\n## ${featuredName}의 커리어\n${events}`;
    }
    if (v1Bio.personalTraits) {
      const kf = v1Bio.personalTraits.knownForKo || v1Bio.personalTraits.knownFor || '';
      if (kf) knownForBlock = `\n## ${featuredName}의 특징\n${kf}`;
    }
    if (v1Bio.failures && v1Bio.failures.length > 0) {
      const ko = (a?: string, b?: string) => a || b || '';
      const failLines = v1Bio.failures
        .slice(0, 2)
        .map((f: { year?: number; descriptionKo?: string; description?: string; failureKo?: string; failure?: string; lessonKo?: string; lesson?: string }) => {
          const desc = ko(f.descriptionKo, f.description) || ko(f.failureKo, f.failure);
          const lesson = ko(f.lessonKo, f.lesson);
          return `- ${f.year ? f.year + '년: ' : ''}${desc}${lesson ? '\n  → ' + lesson : ''}`;
        })
        .join('\n');
      if (failLines) careerBlock += `\n\n## ${featuredName}의 실패와 역경\n${failLines}`;
    }
  }

  return `당신은 40년 경력의 한국 사주명리학 대가입니다.

# 매칭된 부자: ${featuredName}
- 순자산: ${netWorthKr}
- 산업: ${industry}
- 국적: ${countryKo}
${bioLine ? `- 소개: ${bioLine}` : ''}
- 일주: ${featured.ilju} / 월지: ${featured.wolji} / 격국: ${featured.gyeokguk}
${childhoodBlock}${careerBlock}${knownForBlock}

## ${featuredName}의 사주 해석
${featuredContext}

# 작성 지침

아래 내용을 **하나의 짧은 문단** (3-5문장)으로 작성하세요. 마크다운 헤딩 없이 평문으로.

### 내용 구성

문장 1: "당신과 ${sharedDesc} ${countryKo}의 ${featuredName}은(는) [위 커리어/성장배경 데이터를 활용해서 어떤 사업을 어떻게 시작했는지 구체적으로]로 ${netWorthKr}을 축적했습니다."
→ 커리어 타임라인의 핵심 사건 1-2개를 자연스럽게 엮어서 한 문장으로. "Energy 분야에서 성공" 같은 추상적 표현 금지. "기계공학을 전공한 뒤 직장에 취직하지 않고 바로 체결부품 사업을 시작했고, 이후 태양광 에너지로 전환해" 같은 구체적 스토리로.

### 회사·브랜드 설명 규칙 (중요)
- 한국인에게 낯선 회사·브랜드가 처음 등장할 때는 **반드시 괄호로 1줄 설명**을 붙이세요. 두 번째 언급부터는 생략.
- 설명은 "무엇을 하는 회사인지" 한 줄. 매출·순위 같은 숫자는 넣지 말 것.
- 예시:
  - "JBS(세계 최대 육류 가공업체)를 세계적 기업으로 키웠습니다"
  - "Digicel(카리브해 최대 이동통신사)을 창업했습니다"
  - "Beyond Meat(미국 식물성 대체육 브랜드)에 초기 투자했습니다"
- 삼성·현대·LG·구글·애플·아마존·페이스북·테슬라 같은 **한국에서 이미 유명한 이름**은 설명 불필요.
- 브랜드인지 회사인지, 제품인지 사업인지 애매한 경우도 짧게 정리: "Zara(스페인 SPA 브랜드)"처럼.

문장 2-3: 커리어에서 가장 인상적인 사건이나 전환점 1-2개를 짧게. 위 커리어 타임라인 데이터에서 뽑을 것.

문장 4-5 (선택): "실패와 역경" 데이터가 있으면 활용. 어떤 어려움이 있었고 어떻게 극복했는지를 위 데이터의 내용을 말투만 자연스럽게 고쳐서 그대로 쓸 것. 데이터에 없는 내용을 지어내지 말 것.

### 절대 금지
- **"귀하" 사용 금지.** "당신" 또는 생략.
- **"당신의 사주 + 부자와의 연결" 같은 헤딩 금지.** 마크다운 헤딩(##) 쓰지 말 것.
- **사주 풀이 반복 금지.** 일주·격국 설명은 위 "사주 풀이"에서 이미 했으니 여기서 다시 하지 말 것.
- **"당신과의 공통점" 쓰지 말 것.** "재물에 대한 감각과 도전 정신은 당신과의 공통점" 같은 문장 금지. 부자의 사업 스토리만 쓸 것.
- **"훌륭합니다", "탁월합니다" 같은 올드패션 칭찬 금지.**
- **순자산은 반드시 "${netWorthKr}" 그대로.** 변경 금지.
- **영어 단어 절대 금지.** 회사명/제품명 같은 고유명사만 예외. "Technology 분야", "Real estate로" 같은 일반명사 영어 금지 → "기술 분야", "부동산으로"로.
- **영한 짬뽕 금지** — "capturable하게", "scalable한" 같은 영단어+한국어 활용 금지.
- "null" 금지.

톤: 짧고 읽기 쉬운 한국어. 한 문장에 절(clause) 3개 이상 이어붙이지 말 것. 자연스러운 경어체.`;
}

// ─── Route handler ───

async function loadV2Bio(personId: string): Promise<DeepBioV2 | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'deep-bios-v2', `${personId}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as DeepBioV2;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadV1Bio(personId: string): Promise<any | null> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'deep-bios', `${personId}.json`);
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const { allowed } = await rateLimit('saju-deep-summary', ip, 10, 60);
  if (!allowed) {
    return new Response('Too many requests — please wait a moment', { status: 429 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return new Response('OPENAI_API_KEY not configured', { status: 500 });
  }

  let body: DeepSummaryInput;
  try {
    body = (await req.json()) as DeepSummaryInput;
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!body?.user?.ilju || !body?.featured?.id) {
    return new Response('Missing user or featured', { status: 400 });
  }

  // Heavy (v2) path needs user's birthday + gender for 대운 calculation.
  // Without them, fall back to the light path even when a v2 bio exists.
  const canUseHeavy = Boolean(body.user.birthday && body.user.gender);
  const bio = canUseHeavy ? await loadV2Bio(body.featured.id) : null;
  const v1Bio = !bio ? await loadV1Bio(body.featured.id) : null;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = bio
    ? buildPrompt(body.user, body.featured, bio)
    : buildLightPrompt(body.user, body.featured, v1Bio);
  const maxTokens = bio ? 1200 : 1000;

  const encoder = new TextEncoder();
  const upstreamAbort = new AbortController();
  let closed = false;

  req.signal.addEventListener('abort', () => {
    closed = true;
    upstreamAbort.abort();
  });

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.chat.completions.create(
          {
            model: 'gpt-4o-mini',
            max_tokens: maxTokens,
            stream: true,
            messages: [{ role: 'user', content: prompt }],
          },
          { signal: upstreamAbort.signal },
        );

        for await (const chunk of stream) {
          if (closed) break;
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
        if (!closed) closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      } catch (err) {
        const isAbort =
          (err instanceof Error && err.name === 'AbortError') || closed;
        if (!isAbort) {
          const msg = err instanceof Error ? err.message : 'stream error';
          console.error('[saju-deep-summary] stream failed:', msg);
        }
        if (!closed) {
          try {
            controller.error(err);
          } catch {
            // already torn down
          }
          closed = true;
        }
      }
    },
    cancel() {
      closed = true;
      upstreamAbort.abort();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
