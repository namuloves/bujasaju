'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EnrichedPerson, SajuResult, CheonGan } from '@/lib/saju/types';
import { computeSaju } from '@/components/match/MatchTab';
import type { MatchInput } from '@/components/match/BirthdayForm';
import { HeroPillar } from '@/components/match/SajuHero';

const STORAGE_KEY = 'bujasaju.matchInput';

const STEM_TO_OHAENG: Record<string, string> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};

interface Props {
  person: EnrichedPerson;
}

interface Comparison {
  userSaju: SajuResult;
  /** Highest-tier match available between user and person */
  tier: 'same_ilju' | 'same_ilgan' | 'same_ohaeng' | 'different';
  /** One-line takeaway in Korean */
  headline: string;
  /** Optional supplementary observation (오행 vs 오행) */
  detail?: string;
}

function deriveComparison(userSaju: SajuResult, person: EnrichedPerson): Comparison {
  const userIlju = userSaju.ilju;
  const userIlgan = userSaju.saju.day.stem;
  const userIlganOhaeng = STEM_TO_OHAENG[userIlgan];

  const pIlju = person.saju.ilju;
  const pIlgan = person.saju.saju.day.stem;
  const pIlganOhaeng = STEM_TO_OHAENG[pIlgan];

  const personName = person.nameKo ?? person.name;

  // Tier 1: exact same 일주 — very rare (1/60), strongest connection
  if (userIlju === pIlju) {
    return {
      userSaju,
      tier: 'same_ilju',
      headline: `${personName}님과 똑같은 ${userIlju}일주예요`,
      detail: '60갑자 중에서 가장 깊은 사주 연결입니다. 천간·지지 모두 일치.',
    };
  }

  // Tier 2: same 일간 — same core identity (1/10 odds), strong
  if (userIlgan === pIlgan) {
    return {
      userSaju,
      tier: 'same_ilgan',
      headline: `${personName}님과 같은 ${userIlgan}(${userIlganOhaeng}) 일간을 공유해요`,
      detail: '본질적 기질·성격의 뼈대가 같습니다. 일지가 다르니 발현 방식만 달라요.',
    };
  }

  // Tier 3: same 오행 of 일간 — shared element family (1/5 odds), mild
  if (userIlganOhaeng === pIlganOhaeng) {
    return {
      userSaju,
      tier: 'same_ohaeng',
      headline: `${personName}님과 같은 ${userIlganOhaeng} 기운의 일간이에요`,
      detail: `당신은 ${userIlgan}, ${personName}님은 ${pIlgan} — 같은 ${userIlganOhaeng}이지만 음양이 달라요.`,
    };
  }

  // Tier 4: different — frame as "다른 결의 부자"
  return {
    userSaju,
    tier: 'different',
    headline: `${personName}님과는 다른 결의 사주예요`,
    detail: `당신은 ${userIlganOhaeng} 일간, ${personName}님은 ${pIlganOhaeng} 일간 — 부의 작동 방식이 다릅니다.`,
  };
}

export default function CompareWithUser({ person }: Props) {
  const [userSaju, setUserSaju] = useState<SajuResult | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as MatchInput;
      const saju = computeSaju(parsed);
      setUserSaju(saju);
    } catch {
      // Bad JSON, missing fields, etc. — silently skip; user just won't see the card.
    }
  }, []);

  // SSR + first paint: render nothing to avoid hydration mismatch.
  if (!hydrated) return null;

  // No saved saju → render a soft CTA inviting the user to enter theirs.
  if (!userSaju) {
    return (
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔮</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {person.nameKo ?? person.name}님과 사주 궁합을 보고 싶다면
            </p>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
              생년월일만 입력하면 본인의 사주와 어떻게 닮았는지 바로 보여드려요.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[13px] font-semibold text-indigo-600 hover:text-indigo-700"
            >
              내 사주 입력하기 →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const cmp = deriveComparison(userSaju, person);
  const userSj = userSaju.saju;
  const pSj = person.saju.saju;
  const userIlgan = userSj.day.stem as CheonGan;
  const pIlgan = pSj.day.stem as CheonGan;

  // Which pillars match between user and this person? Year/month/hour/day
  // each evaluated independently. We highlight the stem and branch cells
  // separately so partial matches (same stem, different branch) still
  // surface visually.
  const matchKey = (a: { stem: string; branch: string } | null | undefined,
                    b: { stem: string; branch: string } | null | undefined) => ({
    stem: !!a && !!b && a.stem === b.stem,
    branch: !!a && !!b && a.branch === b.branch,
  });
  const yearM = matchKey(userSj.year, pSj.year);
  const monthM = matchKey(userSj.month, pSj.month);
  const dayM = matchKey(userSj.day, pSj.day);
  const hourM = matchKey(userSj.hour, pSj.hour);

  // Tier 1 (병인↔병인) → soft amber halo on the whole card. Other tiers
  // stay neutral so we don't over-promise a "match" that's only an 일간.
  const cardAccent = cmp.tier === 'same_ilju'
    ? 'border-amber-200 bg-amber-50/40'
    : 'border-gray-200 bg-white';
  const badge =
    cmp.tier === 'same_ilju' ? '완전 일치'
    : cmp.tier === 'same_ilgan' ? '일간 일치'
    : cmp.tier === 'same_ohaeng' ? '오행 일치'
    : null;
  const personName = person.nameKo ?? person.name;

  return (
    <section className={`rounded-2xl border ${cardAccent} p-4 sm:p-5`}>
      {/* Header: 🔮 당신과 {name}님 ............ [badge] */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-base">🔮</span>
        <h3 className="text-sm font-bold text-gray-900">
          당신과 {personName}님
        </h3>
        {badge && (
          <span className="ml-auto text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </div>

      {/* Two charts stacked: 나 above, person below. Matching cells get a
          golden ring via the highlight props on HeroPillar. */}
      <div className="space-y-3">
        {/* 나의 사주 */}
        <div>
          <div className="text-[11px] font-semibold text-gray-700 text-center mb-2">나의 사주</div>
          <div className="flex justify-center gap-2 sm:gap-3">
            <HeroPillar
              label="時"
              ju={userSj.hour}
              ilgan={userIlgan}
              highlightStem={hourM.stem}
              highlightBranch={hourM.branch}
            />
            <HeroPillar
              label="日"
              ju={userSj.day}
              ilgan={userIlgan}
              isDayPillar
              highlightStem={dayM.stem}
              highlightBranch={dayM.branch}
            />
            <HeroPillar
              label="月"
              ju={userSj.month}
              ilgan={userIlgan}
              highlightStem={monthM.stem}
              highlightBranch={monthM.branch}
            />
            <HeroPillar
              label="年"
              ju={userSj.year}
              ilgan={userIlgan}
              highlightStem={yearM.stem}
              highlightBranch={yearM.branch}
            />
          </div>
        </div>

        {/* ↕ divider that doubles as a visual cue for "compare" */}
        <div className="flex justify-center text-amber-400 text-lg leading-none">↕</div>

        {/* 인물 사주 — uses person's own ilgan so its sipsin labels stay correct */}
        <div>
          <div className="text-[11px] font-semibold text-gray-700 text-center mb-2">
            {personName}의 사주
          </div>
          <div className="flex justify-center gap-2 sm:gap-3">
            <HeroPillar
              label="時"
              ju={pSj.hour}
              ilgan={pIlgan}
              highlightStem={hourM.stem}
              highlightBranch={hourM.branch}
            />
            <HeroPillar
              label="日"
              ju={pSj.day}
              ilgan={pIlgan}
              isDayPillar
              highlightStem={dayM.stem}
              highlightBranch={dayM.branch}
            />
            <HeroPillar
              label="月"
              ju={pSj.month}
              ilgan={pIlgan}
              highlightStem={monthM.stem}
              highlightBranch={monthM.branch}
            />
            <HeroPillar
              label="年"
              ju={pSj.year}
              ilgan={pIlgan}
              highlightStem={yearM.stem}
              highlightBranch={yearM.branch}
            />
          </div>
        </div>
      </div>

      {/* Takeaway sentence underneath the comparison. */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-[14px] font-semibold text-gray-900 leading-snug">
          {cmp.headline}
        </p>
        {cmp.detail && (
          <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
            {cmp.detail}
          </p>
        )}
      </div>
    </section>
  );
}
