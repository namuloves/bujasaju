'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { EnrichedPerson, SajuResult } from '@/lib/saju/types';
import MiniPersonCard from '@/components/browse/MiniPersonCard';
import { hasDeepBioSync } from '@/lib/deepBio';
import SajuHero from './SajuHero';
import FeaturedPersonCard from './FeaturedPersonCard';
import ShareButtons from './ShareButtons';
import MatchSummary from './MatchSummary';
import DeepInterpretation from './DeepInterpretation';
import EmailCaptureCard from './EmailCaptureCard';

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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Share card image */}
      {featuredPerson && (
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <img
            src={buildOgUrl(me, featuredPerson)}
            alt="사주 매칭 결과"
            className="w-full"
            loading="eager"
          />
        </div>
      )}

      {/* Top row: 당신의 사주 (left) + 사주 풀이 (right) in one card */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <div className="px-5 sm:px-6 py-5 sm:py-6">
            <SajuHero saju={me} totalMatches={totalMatches} onReset={onReset} featuredPerson={featuredPerson} comboStats={comboStats} />
          </div>
          <div className="px-5 sm:px-6 py-5 sm:py-6 space-y-5">
            <MatchSummary saju={me} matches={summaryMatches} />
            {featuredPerson && userBirthday && userGender && (
              <div className="border-t border-gray-100 pt-5">
                <DeepInterpretation
                  saju={me}
                  featured={featuredPerson}
                  userBirthday={userBirthday}
                  userGender={userGender}
                />
              </div>
            )}
            {featuredPerson && (
              <div className="max-w-xs">
                <FeaturedPersonCard person={featuredPerson} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-8 min-w-0">
      {(() => {
        // Exclude the featured person shown in the top card
        const featuredId = featuredPerson?.id;
        return sections.map((section) => {
          const people = section.people.filter(p => p.id !== featuredId);
          if (people.length === 0) return null;
          const autoOpenChart = section.key === 'twins' || section.key === 'monthJu';
          return (
            <section key={section.key}>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-xl">{section.medal}</span>
                <h3 className="text-base font-bold text-gray-900">{section.title}</h3>
                <span className="text-xs text-gray-400">
                  {t.countPeople(people.length)}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {people.map((person) => (
                  <MiniPersonCard
                    key={person.id}
                    person={person}
                  />
                ))}
              </div>
            </section>
          );
        });
      })()}

      {totalMatches === 0 && sameIljuCount === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-400 text-lg">{t.groupEmpty}</p>
        </div>
      )}

      {/* "같은 일주" group — hidden by default behind a CTA */}
      {sameIljuCount > 0 && (
        <>
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setShowSameIlju((v) => !v)}
              aria-expanded={showSameIlju}
              aria-controls="same-ilju-section"
              className="px-5 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              {showSameIlju
                ? t.hideSameIljuButton
                : t.seeSameIljuButton(sameIljuCount)}
            </button>
          </div>
          {showSameIlju && (
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
        </>
      )}

      {/* Share + email */}
      <div className="bg-white rounded-2xl px-4 sm:px-6 py-5">
        <ShareButtons title={t.shareTitle} variant="hero" />
        <div className="mt-4">
          <EmailCaptureCard />
        </div>
      </div>

      </div>
    </div>
  );
}
