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
      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {person.nameKo ?? person.name}님과 사주 궁합을 보고 싶다면
          </p>
          <p className="text-[13px] text-gray-600 leading-relaxed mb-3">
            생년월일만 입력하면 본인의 사주와 어떻게 닮았는지 바로 보여드려요.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-gray-700 hover:text-black"
          >
            내 사주 입력하기 →
          </Link>
        </div>
      </section>
    );
  }

  const cmp = deriveComparison(userSaju, person);
  const userSj = userSaju.saju;
  const pSj = person.saju.saju;
  const userIlgan = userSj.day.stem as CheonGan;
  const pIlgan = pSj.day.stem as CheonGan;

  // Which pillars match between user and this person? A pillar is
  // considered matched only when BOTH stem and branch are identical —
  // that's the meaningful unit ("같은 일주", "같은 월주"). Partial
  // matches (only stem, only branch) are intentionally not highlighted
  // because they over-promise a connection that isn't really there.
  const pillarMatch = (a: { stem: string; branch: string } | null | undefined,
                       b: { stem: string; branch: string } | null | undefined) =>
    !!a && !!b && a.stem === b.stem && a.branch === b.branch;
  const yearMatch = pillarMatch(userSj.year, pSj.year);
  const monthMatch = pillarMatch(userSj.month, pSj.month);
  const dayMatch = pillarMatch(userSj.day, pSj.day);
  const hourMatch = pillarMatch(userSj.hour, pSj.hour);

  const cardAccent = 'border-gray-200 bg-white';
  const personName = person.nameKo ?? person.name;

  // Matched pillars get wrapped in a soft blue panel — colour mirrors
  // `bg-blue-50` (`#eff6ff`). Cool enough to read as "linked" without
  // shouting at the user the way the previous amber/ring did.
  const matchPanelClass = 'bg-blue-50 rounded-xl px-1.5 pt-1 pb-2 -mt-1';

  return (
    <section className={`rounded-2xl border ${cardAccent} p-4 sm:p-5`}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">
          당신과 {personName}님
        </h3>
      </div>

      {/* Two charts stacked: 나 above, person below. Matched pillars (full
          stem+branch match) are wrapped in a soft blue panel — no per-cell
          rings, no amber. */}
      <div className="space-y-3">
        {/* 나의 사주 */}
        <div>
          <div className="text-[11px] font-semibold text-gray-700 text-center mb-2">나의 사주</div>
          <div className="flex justify-center items-start gap-2 sm:gap-3">
            <div className={hourMatch ? matchPanelClass : undefined}>
              <HeroPillar label="時" ju={userSj.hour} ilgan={userIlgan} />
            </div>
            <div className={dayMatch ? matchPanelClass : undefined}>
              <HeroPillar label="日" ju={userSj.day} ilgan={userIlgan} isDayPillar />
            </div>
            <div className={monthMatch ? matchPanelClass : undefined}>
              <HeroPillar label="月" ju={userSj.month} ilgan={userIlgan} />
            </div>
            <div className={yearMatch ? matchPanelClass : undefined}>
              <HeroPillar label="年" ju={userSj.year} ilgan={userIlgan} />
            </div>
          </div>
        </div>

        {/* ↕ divider — neutral grey, no amber */}
        <div className="flex justify-center text-gray-300 text-lg leading-none">↕</div>

        {/* 인물 사주 — uses person's own ilgan so sipsin labels stay correct */}
        <div>
          <div className="text-[11px] font-semibold text-gray-700 text-center mb-2">
            {personName}의 사주
          </div>
          <div className="flex justify-center items-start gap-2 sm:gap-3">
            <div className={hourMatch ? matchPanelClass : undefined}>
              <HeroPillar label="時" ju={pSj.hour} ilgan={pIlgan} />
            </div>
            <div className={dayMatch ? matchPanelClass : undefined}>
              <HeroPillar label="日" ju={pSj.day} ilgan={pIlgan} isDayPillar />
            </div>
            <div className={monthMatch ? matchPanelClass : undefined}>
              <HeroPillar label="月" ju={pSj.month} ilgan={pIlgan} />
            </div>
            <div className={yearMatch ? matchPanelClass : undefined}>
              <HeroPillar label="年" ju={pSj.year} ilgan={pIlgan} />
            </div>
          </div>
        </div>
      </div>

      {/* Takeaway sentence underneath the comparison. */}
      <div className="mt-4">
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
