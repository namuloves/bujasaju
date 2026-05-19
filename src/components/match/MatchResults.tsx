'use client';

import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { track } from '@vercel/analytics';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { EnrichedPerson, SajuResult, CheonGan } from '@/lib/saju/types';
import { hasDeepBioSync, hasDeepBioV2Sync, loadDeepBioIndex } from '@/lib/deepBio';
import { HeroPillar } from './SajuHero';
import ShareButtons from './ShareButtons';
import MatchSummary from './MatchSummary';
import DeepInterpretation from './DeepInterpretation';
import Top5FacesRow, { pickTop3WithKorean } from './Top5FacesRow';
import EmailCaptureCard from './EmailCaptureCard';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

/**
 * OG share image (purple card with featured billionaire) is temporarily hidden
 * in the new redesign. Code is preserved; flip this to true to restore.
 */
const SHOW_OG_IMAGE = false;

const USD_TO_KRW = 1480.71;
function formatWorthKrwShort(netWorthB: number): string {
  const eok = netWorthB * 10 * USD_TO_KRW;
  const jo = eok / 10000;
  if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
  return `${Math.round(eok).toLocaleString('ko-KR')}억`;
}

function buildOgUrl(me: SajuResult, featured: EnrichedPerson): string {
  const displayName = featured.nameKo ?? featured.name;
  const enName = featured.name && featured.name !== displayName ? featured.name : '';
  const params = new URLSearchParams({
    ilju: me.ilju,
    featuredName: displayName,
    featuredNameEn: enName,
    featuredSource: featured.source ?? featured.industry,
    featuredWorth: formatWorthKrwShort(featured.netWorth),
    featuredPhoto: featured.photoUrl ?? '',
    featuredIlju: featured.saju.ilju,
    featuredNat: featured.nationality,
  });
  return `/api/og?${params.toString()}`;
}

interface Props {
  me: SajuResult;
  onReset: () => void;
  /**
   * User's birthday (YYYY-MM-DD) and gender, needed for 대운 calculation
   * inside the deep interpretation. Optional — when missing, the v2 deep
   * interpretation section is silently skipped.
   */
  userBirthday?: string;
  userGender?: 'M' | 'F';
}

export default function MatchResults({ me, onReset, userBirthday, userGender }: Props) {
  const { t } = useLanguage();
  const { people: enrichedPeople, loading } = useEnrichedPeople();

  const groups = useMemo(
    () => matchBillionaires(me, enrichedPeople),
    [me, enrichedPeople],
  );

  // Total matches across all stricter tiers (everyone who shares more than
  // just 일주). Used for the email-gate copy "+N more billionaires" so the
  // user knows what's behind the gate.
  const totalMatches =
    groups.iljuPlusMonthJu.length +
    groups.chartTwins.length +
    groups.iljuPlusWolji.length +
    groups.iljuPlusGyeokguk.length;

  // Combo rank: how many billionaires share this 일주·월지 combo, and
  // what rank is it among all 706 existing combos?
  const comboStats = useMemo(() => {
    if (enrichedPeople.length === 0) return null;
    const counts = new Map<string, number>();
    for (const p of enrichedPeople) {
      const key = `${p.saju.ilju}·${p.saju.wolji}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const myKey = `${me.ilju}·${me.wolji}`;
    const myCount = counts.get(myKey) ?? 0;
    // Rank: how many combos have MORE billionaires than mine? rank 1 = most.
    const sorted = [...new Set(counts.values())].sort((a, b) => b - a);
    const rank = sorted.indexOf(myCount) + 1;
    const totalCombos = counts.size;
    return { myCount, rank, totalCombos };
  }, [enrichedPeople, me.ilju, me.wolji]);

  // Flattened list fed to the Claude summary — strongest tiers first so
  // the prompt's "top N" slice naturally picks the most relevant people.
  // When stricter tiers are empty (e.g. user's 일주·월지 combo doesn't
  // exist in the data), fall through to 같은 일주 so the result page
  // still has a featured person and full hero/풀이 — never a "no match".
  const stricterMatches = useMemo(
    () => [
      ...groups.iljuPlusMonthJu,
      ...groups.chartTwins,
      ...groups.iljuPlusWolji,
      ...groups.iljuPlusGyeokguk,
    ],
    [groups],
  );
  const summaryMatches = useMemo(
    () => (stricterMatches.length > 0 ? stricterMatches : groups.iljuOnly),
    [stricterMatches, groups.iljuOnly],
  );
  const usingIljuFallback = stricterMatches.length === 0 && groups.iljuOnly.length > 0;

  const sameIljuCount = groups.iljuOnly.length;

  if (loading && enrichedPeople.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        부자 데이터를 불러오는 중…
      </div>
    );
  }

  // Force a re-render once the deep-bio index has loaded. `hasDeepBioV2Sync`
  // reads from a module-level Set that starts empty (seed list only) and is
  // hydrated by an async fetch — without this trigger, useMemo below caches
  // an empty result and never recomputes when the index resolves.
  const [bioIndexReady, setBioIndexReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadDeepBioIndex().then(() => {
      if (!cancelled) setBioIndexReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Top 3 — always fills 3 slots (when possible) using only people who
  // have a v2 deep bio so every row has a real "how they made their
  // money" story.
  //
  // Slot policy:
  //   1) Korean from same 일주 (if available) wins slot 1.
  //   2) Remaining slots fill from strictest-first match pool, then
  //      same-일주 fallback. We dedupe by id so a 한국인 already in slot
  //      1 doesn't get a second row.
  const top3 = useMemo(() => {
    const hasBio = (p: EnrichedPerson) => hasDeepBioV2Sync(p.id);
    const summaryWithBio = summaryMatches.filter(hasBio);
    const iljuOnlyWithBio = groups.iljuOnly.filter(hasBio);

    // Combined candidate pool, strictest matches first then same-ilju
    // fallback, deduped.
    const seen = new Set<string>();
    const ordered: EnrichedPerson[] = [];
    for (const p of [...summaryWithBio, ...iljuOnlyWithBio]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      ordered.push(p);
    }

    // Promote a Korean to slot 1 when one exists in the combined pool.
    const koreanIdx = ordered.findIndex((p) => p.nationality === 'KR');
    if (koreanIdx > 0) {
      const [korean] = ordered.splice(koreanIdx, 1);
      ordered.unshift(korean);
    }

    return ordered.slice(0, 3);
  }, [summaryMatches, groups.iljuOnly, bioIndexReady]);
  // Default featured = Top3 slot 1 (Korean if available), so the big card
  // matches what the user sees highlighted on the row above.
  const defaultFeaturedId = top3[0]?.id ?? null;
  const [selectedFeaturedId, setSelectedFeaturedId] = useState<string | null>(defaultFeaturedId);
  // Featured lookup spans top3 first so a Korean pulled in from the
  // broader 일주-only pool can still serve as the featured card.
  const featuredPool = useMemo(() => {
    const seen = new Set<string>();
    const out: EnrichedPerson[] = [];
    for (const p of [...top3, ...summaryMatches]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [top3, summaryMatches]);
  const featuredPerson =
    featuredPool.find((p) => p.id === selectedFeaturedId) || featuredPool[0] || null;

  const featuredHasBio = featuredPerson ? hasDeepBioSync(featuredPerson.id) : false;
  const [showFeaturedBio, setShowFeaturedBio] = useState(false);

  // 사용자가 부자를 변경하면 같이 새 default로 — 단 사용자가 클릭으로 바꿨으면 유지
  useEffect(() => {
    if (selectedFeaturedId === null && defaultFeaturedId) {
      setSelectedFeaturedId(defaultFeaturedId);
    }
  }, [defaultFeaturedId, selectedFeaturedId]);

  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const key = `${me.ilju}|${me.wolji}|${featuredPerson?.id ?? 'none'}`;
    if (tracked.current === key) return;
    tracked.current = key;
    track('quiz_results_shown', {
      ilju: me.ilju,
      wolji: me.wolji,
      gyeokguk: me.gyeokguk,
      totalMatches,
      sameIljuCount,
      featuredId: featuredPerson?.id ?? null,
      featuredName: featuredPerson?.name ?? null,
    });
  }, [loading, me.ilju, me.wolji, me.gyeokguk, featuredPerson?.id, featuredPerson?.name, totalMatches, sameIljuCount]);

  const [saving, setSaving] = useState(false);
  const handleSaveImage = useCallback(async () => {
    if (!featuredPerson || saving) return;
    setSaving(true);
    try {
      const url = buildOgUrl(me, featuredPerson);
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `사주매칭_${me.ilju}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Image save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [me, featuredPerson, saving]);

  const fpSaju = featuredPerson?.saju;
  const fpName = featuredPerson
    ? (featuredPerson.nameKo ?? featuredPerson.name)
    : '';

  // Truly-empty fallback: no billionaire shares the user's 일주 at all
  // (rare — would require a 일주 we have zero data for). 같은 일주 is
  // always promoted to the featured tier when stricter ones are empty,
  // so reaching this branch means iljuOnly is also empty.
  if (!featuredPerson) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center">
          <p className="text-sm text-gray-500 mb-1">
            {me.ilju} 일주 · {me.wolji} 월지 · {me.gyeokguk}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
            아직 비슷한 사주의 부자를 못 찾았어요
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            부자 데이터는 계속 추가되고 있어요. 곧 다시 확인해주세요.
          </p>
          <div className="flex justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={onReset}
              className="text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg px-5 py-2 transition-colors inline-flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              다시 하기
            </button>
          </div>
          <div className="mt-5 pt-5 border-t border-gray-100">
            <ShareButtons title={t.shareTitle} variant="hero" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top section: OG image (left) + 풀이 (right). The outer card chrome
          (border + rounded background) was removed — the page itself acts as
          the container, so an extra grey outline just felt boxy. */}
      <div className="p-1 sm:p-2">

        {/* 1. 당신의 사주 — orientation block. Lead with the user's own
            chart so they know what we found before scrolling into who else
            shares it. Heading is left-aligned to match the other section
            headers; chart cells stay centered for visual weight. */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-900 mb-4">당신의 사주</h3>
          <div className="max-w-[420px] mx-auto">
            <div className="flex justify-center gap-2 sm:gap-2.5">
              <HeroPillar label="時" ju={me.saju.hour} ilgan={me.saju.day.stem as CheonGan} large />
              <HeroPillar label="日" ju={me.saju.day} ilgan={me.saju.day.stem as CheonGan} isDayPillar large />
              <HeroPillar label="月" ju={me.saju.month} ilgan={me.saju.day.stem as CheonGan} large />
              <HeroPillar label="年" ju={me.saju.year} ilgan={me.saju.day.stem as CheonGan} large />
            </div>
            <p className="text-[12px] text-gray-400 text-center mt-3">
              {me.ilju}일주 {me.wolji}월지
            </p>
          </div>
        </div>

        {/* 2. 사주 풀이 — comes right after the saju chart so the user
            sees the interpretation of *their own* saju before scrolling
            into matches. OG image is hidden in this redesign so we drop
            the two-column grid and let the body flow full width. */}
        <div className="space-y-5">
          <MatchSummary saju={me} matches={summaryMatches} />
          {featuredPerson && (
            <div className="border-t border-gray-100 pt-5">
              <DeepInterpretation
                saju={me}
                featured={featuredPerson}
                userBirthday={userBirthday}
                userGender={userGender}
              />
            </div>
          )}

          {/* Match stats — single subtle line under the deep interpretation */}
          {(totalMatches > 0 || usingIljuFallback) && (
            <p className="text-xs text-gray-400 text-center">
              {totalMatches > 0
                ? `${totalMatches + sameIljuCount}명이 비슷한 사주`
                : `같은 ${me.ilju} 일주 부자 ${sameIljuCount}명`}
              {comboStats && comboStats.myCount > 0 && (
                <> · {me.ilju}·{me.wolji} 조합 {comboStats.rank}위/{comboStats.totalCombos}</>
              )}
            </p>
          )}
        </div>

        {/* 3. 나랑 같은 일주를 가진 부자 — moved below the 풀이 so the page
            reads as: my saju → interpretation → people who share it. */}
        {top3.length > 1 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              나랑 같은 {me.ilju} 일주를 가진 부자
            </h3>
            <Top5FacesRow
              people={top3}
              selectedId={featuredPerson?.id ?? null}
            />
          </div>
        )}

        {/* Single featured CTA was removed — each Top3 row now carries
            its own "{이름} 부자 일주 보기 →" secondary button so the
            user has a per-person tap target instead of one global one. */}
      </div>

      {/* Email gate — "N명 더 있어요 / 이메일로 결과를 받아보세요" 카피는
          서비스 준비 전까지 숨김. 이메일 캡처 카드 자체는 살려둠. */}
      {(totalMatches + sameIljuCount) > top3.length && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 px-5 sm:px-7 py-7 max-w-xl mx-auto">
          <EmailCaptureCard />
        </div>
      )}

      {/* Share + reset — minimal footer actions */}
      <div className="max-w-xl mx-auto pt-4">
        <ShareButtons title={t.shareTitle} variant="hero" />
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg px-5 py-2 transition-colors inline-flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            다시 하기
          </button>
        </div>
      </div>

      {/* Deep bio modal for featured person */}
      {showFeaturedBio && featuredPerson && (
        <Suspense fallback={null}>
          <DeepBioModal person={featuredPerson} onClose={() => setShowFeaturedBio(false)} userSaju={me} />
        </Suspense>
      )}
    </div>
  );
}
