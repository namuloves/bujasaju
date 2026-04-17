'use client';

import { useMemo, useState, useCallback, lazy, Suspense } from 'react';
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
import EmailCaptureCard from './EmailCaptureCard';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

const USD_TO_KRW = 1480.71;
function formatWorthKrwShort(netWorthB: number): string {
  const eok = netWorthB * 10 * USD_TO_KRW;
  const jo = eok / 10000;
  if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
  return `${Math.round(eok).toLocaleString('ko-KR')}억`;
}

function buildOgUrl(me: SajuResult, featured: EnrichedPerson): string {
  const params = new URLSearchParams({
    ilju: me.ilju,
    featuredName: featured.nameKo ?? featured.name,
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
  const summaryMatches = useMemo(
    () => [
      ...groups.iljuPlusMonthJu,
      ...groups.chartTwins,
      ...groups.iljuPlusWolji,
      ...groups.iljuPlusGyeokguk,
    ],
    [groups],
  );

  const sameIljuCount = groups.iljuOnly.length;
  const [showSameIlju, setShowSameIlju] = useState(false);

  if (loading && enrichedPeople.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        부자 데이터를 불러오는 중…
      </div>
    );
  }

  // Featured person for the top card — prefer one with a deep bio
  const featuredPerson = summaryMatches.find(p => hasDeepBioSync(p.id))
    || summaryMatches[0] || null;

  const featuredHasBio = featuredPerson ? hasDeepBioSync(featuredPerson.id) : false;
  const [showFeaturedBio, setShowFeaturedBio] = useState(false);

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

  // Empty-match fallback: user's 일주 exists in the data, but no billionaire
  // shares 월지/월주/격국/차트. We'd otherwise render the hero card with
  // half its pieces missing (no OG, no 풀이), which looks broken. Show a
  // small explanatory card instead — the 같은 일주 section below still
  // gives the user something to look at.
  if (!featuredPerson) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center">
          <p className="text-sm text-gray-500 mb-1">
            {me.ilju} 일주 · {me.wolji} 월지 · {me.gyeokguk}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
            {sameIljuCount > 0
              ? `딱 맞는 부자는 아직 없지만, 같은 일주 ${sameIljuCount}명은 있어요`
              : '아직 비슷한 사주의 부자를 못 찾았어요'}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            월지·격국까지 같은 부자 데이터는 아직 수집 중이에요.
            {sameIljuCount > 0 ? ' 일단 같은 일주를 가진 부자들을 아래에서 확인해보세요.' : ''}
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

        {/* Same-일주 list is the only content below — reuse existing rendering */}
        {sameIljuCount > 0 && (
          <section id="same-ilju-section">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-xl">🎖️</span>
              <h3 className="text-base font-bold text-gray-900">{t.group3Title}</h3>
              <span className="text-xs text-gray-400">
                {t.countPeople(sameIljuCount)}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {groups.iljuOnly.map((person) => (
                <MiniPersonCard key={person.id} person={person} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top card: OG image (left) + 풀이 (right) */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden p-5 sm:p-6">
        <div className="grid md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] gap-10">
          {/* Left: share image + saju charts */}
          {featuredPerson && (
            <div className="flex flex-col items-center md:items-start gap-4">
              {/* OG image */}
              <div className="w-56 sm:w-64 md:w-full rounded-lg overflow-hidden shadow-sm">
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

              {/* Saju charts side by side */}
              <div className="w-full grid grid-cols-2 gap-3">
                {/* 당신의 사주 — matching cells get ring highlight */}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 text-center mb-2">당신의 사주</p>
                  <div className="flex justify-center gap-1">
                    <HeroPillar label="時" ju={me.saju.hour} ilgan={me.saju.day.stem as CheonGan} compact />
                    <HeroPillar
                      label="日" ju={me.saju.day} ilgan={me.saju.day.stem as CheonGan} isDayPillar compact
                      highlightStem={!!fpSaju && fpSaju.saju.day.stem === me.saju.day.stem}
                      highlightBranch={!!fpSaju && fpSaju.saju.day.branch === me.saju.day.branch}
                    />
                    <HeroPillar
                      label="月" ju={me.saju.month} ilgan={me.saju.day.stem as CheonGan} compact
                      highlightStem={!!fpSaju && fpSaju.saju.month.stem === me.saju.month.stem}
                      highlightBranch={!!fpSaju && fpSaju.saju.month.branch === me.saju.month.branch}
                    />
                    <HeroPillar
                      label="年" ju={me.saju.year} ilgan={me.saju.day.stem as CheonGan} compact
                      highlightStem={!!fpSaju && fpSaju.saju.year.stem === me.saju.year.stem}
                      highlightBranch={!!fpSaju && fpSaju.saju.year.branch === me.saju.year.branch}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 text-center mt-1">
                    {me.ilju} · {me.wolji}
                  </p>
                </div>

                {/* 부자 사주 — matching cells get ring highlight */}
                {fpSaju && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 text-center mb-2">{fpName}</p>
                    <div className="flex justify-center gap-1">
                      <HeroPillar label="時" ju={null} ilgan={fpSaju.saju.day.stem as CheonGan} compact />
                      <HeroPillar
                        label="日" ju={fpSaju.saju.day} ilgan={fpSaju.saju.day.stem as CheonGan} isDayPillar compact
                        highlightStem={fpSaju.saju.day.stem === me.saju.day.stem}
                        highlightBranch={fpSaju.saju.day.branch === me.saju.day.branch}
                      />
                      <HeroPillar
                        label="月" ju={fpSaju.saju.month} ilgan={fpSaju.saju.day.stem as CheonGan} compact
                        highlightStem={fpSaju.saju.month.stem === me.saju.month.stem}
                        highlightBranch={fpSaju.saju.month.branch === me.saju.month.branch}
                      />
                      <HeroPillar
                        label="年" ju={fpSaju.saju.year} ilgan={fpSaju.saju.day.stem as CheonGan} compact
                        highlightStem={fpSaju.saju.year.stem === me.saju.year.stem}
                        highlightBranch={fpSaju.saju.year.branch === me.saju.year.branch}
                      />
                    </div>
                    <p className="text-[9px] text-gray-400 text-center mt-1">
                      {fpSaju.ilju} · {fpSaju.wolji}
                    </p>
                  </div>
                )}
              </div>

              {/* 자세히 보기 button */}
              {featuredHasBio ? (
                <button
                  type="button"
                  onClick={() => setShowFeaturedBio(true)}
                  className="w-full text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg py-2 transition-colors"
                >
                  {fpName} 자세히 보기 →
                </button>
              ) : (
                <div className="w-full text-center text-xs text-gray-400 py-1.5">
                  상세 프로필 준비중
                </div>
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

            {/* Match stats — below 심층풀이 */}
            <div className="border-t border-gray-100 pt-5 space-y-2.5">
              {totalMatches > 0 && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">{totalMatches}명</span>의 부자가 비슷한 사주를 가졌습니다
                </p>
              )}
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

      {/* "같은 일주" group — always visible, blurred preview until expanded */}
      {sameIljuCount > 0 && (
        <section id="same-ilju-section" className="mt-8">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-xl">🎖️</span>
            <h3 className="text-base font-bold text-gray-900">{t.group3Title}</h3>
            <span className="text-xs text-gray-400">
              {t.countPeople(sameIljuCount)}
            </span>
          </div>
          <div className="relative">
            <div className={`grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 ${!showSameIlju ? 'max-h-[280px] sm:max-h-[320px] overflow-hidden' : ''}`}>
              {groups.iljuOnly.map((person) => (
                <MiniPersonCard key={person.id} person={person} />
              ))}
            </div>
            {!showSameIlju && sameIljuCount > 6 && (
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent flex items-end justify-center pb-4">
                <button
                  type="button"
                  onClick={() => setShowSameIlju(true)}
                  className="px-6 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors shadow-sm"
                >
                  {t.seeSameIljuButton(sameIljuCount)}
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Share + email */}
      <div className="bg-white rounded-2xl px-4 sm:px-6 py-5">
        <ShareButtons title={t.shareTitle} variant="hero" />
        <div className="mt-4">
          <EmailCaptureCard />
        </div>
      </div>

      </div>

      {/* Deep bio modal for featured person */}
      {showFeaturedBio && featuredPerson && (
        <Suspense fallback={null}>
          <DeepBioModal person={featuredPerson} onClose={() => setShowFeaturedBio(false)} />
        </Suspense>
      )}
    </div>
  );
}
