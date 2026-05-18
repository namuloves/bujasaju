'use client';

import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react';
import { track } from '@vercel/analytics';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { EnrichedPerson, SajuResult, CheonGan } from '@/lib/saju/types';
import MiniPersonCard from '@/components/browse/MiniPersonCard';
import { hasDeepBioSync } from '@/lib/deepBio';
import { HeroPillar } from './SajuHero';
import ShareButtons from './ShareButtons';
import MatchSummary from './MatchSummary';
import DeepInterpretation from './DeepInterpretation';
import Top5FacesRow from './Top5FacesRow';
import EmailCaptureCard from './EmailCaptureCard';
import ResultsCuratedSections from './ResultsCuratedSections';

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

  // Rendered sections — 일주-only is intentionally hidden here and surfaced
  // via a dedicated button below. The tiers are mutually exclusive (each
  // person lives in exactly one group), so no double-counting. Empty
  // sections are hidden entirely (including 같은 월주) — an empty-state
  // card here just adds noise without giving the user anything useful.
  const sections: Array<{
    key: string;
    title: string;
    medal: string;
    people: EnrichedPerson[];
  }> = [
    { key: 'monthJu', title: t.monthJuTitle, medal: '🥇', people: groups.iljuPlusMonthJu },
    { key: 'twins', title: t.chartTwinsTitle, medal: '🏅', people: groups.chartTwins },
    { key: 'g1', title: t.group1Title, medal: '🥈', people: groups.iljuPlusWolji },
    { key: 'g2', title: t.group2Title, medal: '🥉', people: groups.iljuPlusGyeokguk },
  ];

  // Summary count covers every rendered section. iljuOnly is behind a
  // button so it's excluded. All tiers are mutually exclusive now, so
  // simple addition is correct.
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
  const [showSameIlju, setShowSameIlju] = useState(false);

  if (loading && enrichedPeople.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        부자 데이터를 불러오는 중…
      </div>
    );
  }

  // Top 5 — 비슷한 부자 카드 영역
  const top5 = summaryMatches.slice(0, 5);
  // Default featured = first with deep bio (or first match)
  const defaultFeaturedId = (summaryMatches.find(p => hasDeepBioSync(p.id)) || summaryMatches[0])?.id ?? null;
  const [selectedFeaturedId, setSelectedFeaturedId] = useState<string | null>(defaultFeaturedId);
  const featuredPerson = summaryMatches.find(p => p.id === selectedFeaturedId) || summaryMatches[0] || null;

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
        <div className="mb-6 pb-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4">당신의 사주</h3>
          <div className="max-w-[420px] mx-auto">
            <div className="flex justify-center gap-2 sm:gap-2.5">
              <HeroPillar label="時" ju={me.saju.hour} ilgan={me.saju.day.stem as CheonGan} large />
              <HeroPillar label="日" ju={me.saju.day} ilgan={me.saju.day.stem as CheonGan} isDayPillar large />
              <HeroPillar label="月" ju={me.saju.month} ilgan={me.saju.day.stem as CheonGan} large />
              <HeroPillar label="年" ju={me.saju.year} ilgan={me.saju.day.stem as CheonGan} large />
            </div>
            <p className="text-[12px] text-gray-400 text-center mt-3">
              {me.ilju} · {me.wolji} 일주
            </p>
          </div>
        </div>

        {/* 2. 비슷한 사주 부자 Top — 클릭하면 아래 풀이가 그 부자로 전환.
            We show top 5 on desktop and top 3 on mobile (FacesRow hides
            ranks 4-5 on small screens), so the headline count needs to
            switch breakpoints too — using two spans rather than a single
            template string. */}
        {top5.length > 1 && (
          <div className="mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">
                {usingIljuFallback ? `같은 ${me.ilju} 일주 부자 Top ` : '비슷한 사주 부자 Top '}
                <span className="sm:hidden">{Math.min(top5.length, 3)}</span>
                <span className="hidden sm:inline">{top5.length}</span>
              </h3>
              <span className="text-xs text-gray-400">
                {me.ilju}·{me.wolji} 일주
              </span>
            </div>
            <Top5FacesRow
              people={top5}
              selectedId={featuredPerson?.id ?? null}
              onSelect={(id) => setSelectedFeaturedId(id)}
            />
          </div>
        )}

        <div className="grid md:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-10">
          {/* Left: share image + saju charts */}
          {featuredPerson && (
            <div className="flex flex-col items-center md:items-start gap-4">
              {/* OG image — temporarily hidden in this redesign. Set SHOW_OG_IMAGE = true to restore. */}
              {SHOW_OG_IMAGE && (
                <>
                  <div className="w-[20.16rem] sm:w-[23.04rem] md:w-full rounded-lg overflow-hidden shadow-sm">
                    <img
                      src={buildOgUrl(me, featuredPerson)}
                      alt="사주 매칭 결과"
                      className="w-full"
                      loading="eager"
                    />
                  </div>

                  {/* Save image button */}
                  <button
                    type="button"
                    onClick={handleSaveImage}
                    className="w-full text-sm font-medium text-gray-500 hover:text-indigo-600 border border-gray-200 hover:border-indigo-300 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7,10 12,15 17,10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {saving ? '저장 중…' : '이미지 저장하기'}
                  </button>
                </>
              )}

            </div>
          )}
          {/* Right: 풀이 */}
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

            {/* 자세히 보기 button — between 심층풀이 and match stats */}
            {featuredHasBio ? (
              <button
                type="button"
                onClick={() => setShowFeaturedBio(true)}
                className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg py-2.5 transition-colors"
              >
                {fpName} 부자 자세히 보기 →
              </button>
            ) : (
              <div className="w-full text-center text-xs text-gray-400 py-1.5">
                상세 프로필 준비중
              </div>
            )}

            {/* Match stats — below 자세히 보기 */}
            <div className="border-t border-gray-100 pt-5 space-y-2.5">
              {totalMatches > 0 ? (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{totalMatches}명</span>의 부자가 비슷한 사주를 가졌습니다
                </p>
              ) : usingIljuFallback ? (
                <p className="text-sm text-gray-600">
                  같은 <span className="font-semibold text-gray-900">{me.ilju} 일주</span> 부자가 <span className="font-semibold text-gray-900">{sameIljuCount}명</span> 있어요
                </p>
              ) : null}
              {comboStats && comboStats.myCount > 0 && (
                <p className="text-sm text-gray-500">
                  당신의 <span className="font-medium text-gray-700">{me.ilju}·{me.wolji}</span> 조합은 전체 {comboStats.totalCombos}개 조합 중{' '}
                  <span className="font-semibold text-indigo-600">{comboStats.rank}위</span>
                  {' '}({comboStats.myCount}명)
                </p>
              )}
              <div className="flex justify-center md:justify-start mt-4">
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
              {/* Share — mobile only (desktop has it at the bottom) */}
              <div className="md:hidden pt-2">
                <ShareButtons title={t.shareTitle} variant="hero" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results — continuous grid with section headers */}
      <div className="min-w-0">
      {(() => {
        const featuredId = featuredPerson?.id;
        const items: Array<{ type: 'header'; medal: string; title: string; count: number } | { type: 'card'; person: EnrichedPerson }> = [];
        for (const section of sections) {
          const people = section.people.filter(p => p.id !== featuredId);
          if (people.length === 0) continue;
          items.push({ type: 'header', medal: section.medal, title: section.title, count: people.length });
          for (const person of people) {
            items.push({ type: 'card', person });
          }
        }
        if (items.length === 0) return null;
        return (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {items.map((item, i) =>
              item.type === 'header' ? (
                <div key={`hdr-${i}`} className="col-span-full flex items-baseline gap-2 pt-4 first:pt-0">
                  <span className="text-lg">{item.medal}</span>
                  <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                  <span className="text-xs text-gray-400">{t.countPeople(item.count)}</span>
                </div>
              ) : (
                <MiniPersonCard key={item.person.id} person={item.person} />
              ),
            )}
          </div>
        );
      })()}

      {totalMatches === 0 && sameIljuCount === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg">{t.groupEmpty}</p>
        </div>
      )}

      {/* "같은 일주" group — always visible, blurred preview until expanded.
          Filter out the featured person to avoid showing them twice when
          we've promoted a 일주-only match to the hero. */}
      {(() => {
        const featuredId = featuredPerson?.id;
        const sameIljuList = groups.iljuOnly.filter(p => p.id !== featuredId);
        if (sameIljuList.length === 0) return null;
        return (
          <section id="same-ilju-section" className="mt-8">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl">🎖️</span>
              <h3 className="text-base font-bold text-gray-900">{t.group3Title}</h3>
              <span className="text-xs text-gray-400">
                {t.countPeople(sameIljuList.length)}
              </span>
            </div>
            <div className="relative">
              <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 ${!showSameIlju ? 'max-h-[280px] sm:max-h-[320px] overflow-hidden' : ''}`}>
                {sameIljuList.map((person) => (
                  <MiniPersonCard key={person.id} person={person} />
                ))}
              </div>
              {!showSameIlju && sameIljuList.length > 6 && (
                <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-4">
                  <button
                    type="button"
                    onClick={() => setShowSameIlju(true)}
                    className="px-6 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
                  >
                    {t.seeSameIljuButton(sameIljuList.length)}
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* Share + email */}
      <div className="bg-white rounded-2xl px-4 sm:px-6 py-5 mx-auto max-w-xl">
        <ShareButtons title={t.shareTitle} variant="hero" />
        <div className="mt-4">
          <EmailCaptureCard />
        </div>
      </div>

      {/* Curated themed shelves — "keep browsing" content below the main
          result. User's 일간 section first, then broad-interest sections,
          with the rest tucked behind an expander. */}
      <div className="pt-4">
        <ResultsCuratedSections
          me={me}
          people={enrichedPeople}
          excludeIds={featuredPerson ? new Set([featuredPerson.id]) : undefined}
        />
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
