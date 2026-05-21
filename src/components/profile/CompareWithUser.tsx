'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { EnrichedPerson, SajuResult, CheonGan } from '@/lib/saju/types';
import { computeSaju } from '@/components/match/MatchTab';
import type { MatchInput } from '@/components/match/BirthdayForm';

const STORAGE_KEY = 'bujasaju.matchInput';

const STEM_TO_OHAENG: Record<string, string> = {
  갑: '목', 을: '목', 병: '화', 정: '화', 무: '토',
  기: '토', 경: '금', 신: '금', 임: '수', 계: '수',
};

const OHAENG_BG: Record<string, string> = {
  목: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  화: 'bg-rose-50 text-rose-700 border-rose-200',
  토: 'bg-amber-50 text-amber-700 border-amber-200',
  금: 'bg-slate-100 text-slate-700 border-slate-300',
  수: 'bg-sky-50 text-sky-700 border-sky-200',
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
  const userIlju = userSaju.ilju;
  const userIlgan = userSaju.saju.day.stem as CheonGan;
  const userOhaeng = STEM_TO_OHAENG[userIlgan];
  const pIlgan = person.saju.saju.day.stem as CheonGan;
  const pOhaeng = STEM_TO_OHAENG[pIlgan];

  const accent =
    cmp.tier === 'same_ilju'
      ? 'border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50'
      : cmp.tier === 'same_ilgan'
      ? 'border-indigo-200 bg-indigo-50/60'
      : cmp.tier === 'same_ohaeng'
      ? 'border-gray-200 bg-gray-50'
      : 'border-gray-200 bg-white';

  return (
    <section className={`rounded-2xl border ${accent} p-4 sm:p-5`}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-base">🔮</span>
        <h3 className="text-sm font-bold text-gray-900">
          당신과 {person.nameKo ?? person.name}님
        </h3>
      </div>

      {/* Side-by-side pillar comparison */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-3">
        {/* User */}
        <div className="text-center">
          <div className="text-[11px] text-gray-500 mb-1">나</div>
          <div className="inline-flex items-baseline gap-1">
            <span
              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                OHAENG_BG[userOhaeng] ?? OHAENG_BG['토']
              } text-lg font-bold`}
            >
              {userIlgan}
            </span>
            <span className="text-base font-semibold text-gray-400">·</span>
            <span className="text-sm font-medium text-gray-700">
              {userIlju}일주
            </span>
          </div>
        </div>

        <div className="text-gray-300 text-xl font-light">↔</div>

        {/* Person */}
        <div className="text-center">
          <div className="text-[11px] text-gray-500 mb-1">
            {person.nameKo ?? person.name}
          </div>
          <div className="inline-flex items-baseline gap-1">
            <span
              className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                OHAENG_BG[pOhaeng] ?? OHAENG_BG['토']
              } text-lg font-bold`}
            >
              {pIlgan}
            </span>
            <span className="text-base font-semibold text-gray-400">·</span>
            <span className="text-sm font-medium text-gray-700">
              {person.saju.ilju}일주
            </span>
          </div>
        </div>
      </div>

      <p className="text-[14px] font-semibold text-gray-900 leading-snug">
        {cmp.headline}
      </p>
      {cmp.detail && (
        <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
          {cmp.detail}
        </p>
      )}
    </section>
  );
}
