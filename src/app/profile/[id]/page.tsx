'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import type { DeepBio } from '@/lib/deepBio';
import { fetchDeepBio } from '@/lib/deepBio';
import { LoadingSpinner, EmptyBioState, ko } from '@/components/deep-bio/DeepBioTabs';
import DeepBioContent from '@/components/deep-bio/DeepBioContent';
import { HeroPillar } from '@/components/match/SajuHero';
import DaewoonStrip from '@/components/profile/DaewoonStrip';
import CompareWithUser from '@/components/profile/CompareWithUser';
import type { CheonGan } from '@/lib/saju/types';
import { industryToKorean } from '@/components/FilterPanel';

function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&bold=true`;
  }
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

const USD_TO_KRW = 1480.71;

function formatNetWorth(netWorthB: number, isKo: boolean): string {
  if (isKo) {
    const eok = netWorthB * 10 * USD_TO_KRW; // 10억 달러 단위 → 억원 단위
    const jo = eok / 10000;
    if (jo >= 1) {
      return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조원`;
    }
    return `${Math.round(eok).toLocaleString('ko-KR')}억원`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const { people, loading: peopleLoading } = useEnrichedPeople();
  const [bio, setBio] = useState<DeepBio | null>(null);
  const [bioLoading, setBioLoading] = useState(true);

  const personId = params.id as string;
  const person = people.find(p => p.id === personId);

  useEffect(() => {
    fetchDeepBio(personId).then(data => {
      setBio(data);
      setBioLoading(false);
    });
  }, [personId]);

  // Full-page loading
  if (peopleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-gray-500 text-sm">{lang === 'ko' ? '인물을 찾을 수 없습니다.' : 'Person not found.'}</p>
        <button onClick={() => router.back()} className="text-sm text-gray-700 hover:text-black">
          {lang === 'ko' ? '← 돌아가기' : '← Go back'}
        </button>
      </div>
    );
  }

  const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;

  return (
    <div className="min-h-screen bg-gray-50 profile-page-root">
      {/* Top bar — sticky mini-header. Shows photo + name + worth so the
          reader always knows whose profile they're on even after scrolling
          past the hero. */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 profile-topbar">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
          <button
            onClick={() => {
              // If user came from within the site, go back. Otherwise (direct
              // landing via search / share link), send them to the home page
              // so they can actually explore bujasaju rather than hit an
              // empty history that does nothing.
              if (typeof document !== 'undefined' &&
                  document.referrer &&
                  new URL(document.referrer).origin === window.location.origin) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="text-gray-500 hover:text-gray-800 transition-colors text-sm flex items-center gap-1 shrink-0"
            aria-label={lang === 'ko' ? '돌아가기' : 'Back'}
          >
            <span className="text-lg leading-none">←</span>
            <span className="hidden sm:inline">{lang === 'ko' ? '돌아가기' : 'Back'}</span>
          </button>
          <div className="h-5 w-px bg-gray-200 shrink-0" />
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
            <img
              src={normalizePhotoUrl(person.photoUrl, person.name)}
              alt={person.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=80&background=random&bold=true`;
              }}
            />
          </div>
          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{displayName}</span>
            <span className="text-xs text-gray-500 shrink-0">
              {formatNetWorth(person.netWorth, lang === 'ko')}
            </span>
            <span className="text-xs text-gray-400 truncate hidden sm:inline">
              · {lang === 'ko' ? industryToKorean(person.industry) : person.industry}
            </span>
            {person.saju && (
              <span className="text-xs text-gray-400 truncate hidden sm:inline">
                · {person.saju.ilju} 일주
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero: horizontal layout on every breakpoint — photo on left, info
            on right. The previous design stacked them on mobile (avatar on top,
            text below) which pushed the important matching card way below the
            fold. Keeping photo + info side-by-side recovers ~40% of vertical
            space on phones. */}
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Portrait photo — rectangular on all sizes for an info-density feel. */}
          <div className="shrink-0">
            <div className="w-32 h-40 sm:w-48 sm:h-60 rounded-2xl overflow-hidden bg-gray-200 shadow-lg">
              <img
                src={normalizePhotoUrl(person.photoUrl, person.name)}
                alt={person.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=400&background=random&bold=true`;
                }}
              />
            </div>
          </div>

          {/* Bio info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 leading-tight">{displayName}</h1>
            {person.nameKo && lang === 'ko' && (
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">{person.name}</p>
            )}
            {person.nameKo && lang !== 'ko' && (
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5 sm:mt-1">{person.nameKo}</p>
            )}

            {/* Net worth — big number, USD subscript */}
            <div className="flex items-baseline gap-2 mt-2 sm:mt-3">
              <span className="font-bold text-gray-900 text-xl sm:text-2xl whitespace-nowrap">
                {formatNetWorth(person.netWorth, lang === 'ko')}
              </span>
              {lang === 'ko' && (
                <span className="text-[11px] sm:text-xs text-gray-400">
                  ${person.netWorth}B
                </span>
              )}
            </div>

            {/* Meta chips — industry / birthday / ilju packed into a single
                wrappable row so they don't take 4 lines of vertical space. */}
            <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-3 text-[11px] sm:text-xs text-gray-600">
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                {lang === 'ko' ? industryToKorean(person.industry) : person.industry}
              </span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                {person.birthday.replace(/-/g, '.')}
                {person.deathDate ? ` – ${person.deathDate.replace(/-/g, '.')}` : ''}
              </span>
              {person.saju && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                  {person.saju.ilju} 일주
                </span>
              )}
              {bio?.childhood?.birthPlace && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                  {ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}
                </span>
              )}
            </div>

            {/* Source string as a quoted side-note. break-words keeps long
                mini-bios from blowing past the card edge. */}
            {person.source && person.source !== person.industry && (
              <p className="mt-3 sm:mt-4 pl-3 border-l-2 border-gray-200 text-xs sm:text-sm text-gray-600 leading-relaxed break-words">
                {person.source}
              </p>
            )}

            {/* Education shows up only when we have it — keep it as a single
                quiet line below the chips, no row of label/value anymore. */}
            {bio?.childhood?.education && (
              <p className="mt-2 text-[11px] sm:text-xs text-gray-500 leading-relaxed">
                <span className="text-gray-400">
                  {lang === 'ko' ? '학력 · ' : 'Education · '}
                </span>
                {ko(lang, bio.childhood.education, bio.childhood.educationKo)}
              </p>
            )}

            {/* Short bio */}
            {person.bio && (
              <p className="mt-4 text-sm text-gray-500 leading-relaxed line-clamp-3 text-left">
                {lang === 'ko' ? (person.bioKo ?? person.bio) : person.bio}
              </p>
            )}
          </div>
        </div>

        {/* Compare-with-user — reads localStorage for the visitor's saju and
            shows how it relates to this person's. Renders a CTA if the user
            hasn't entered theirs yet. Placed above the chart so the personal
            connection lands before the abstract analysis. */}
        {person.saju && (
          <div className="mt-6">
            <CompareWithUser person={person} />
          </div>
        )}

        {/* Saju chart — 4 pillars (時·日·月·年) + 일주·월지·격국 메타.
            Sits below the hero so the chart isn't competing with the photo
            on mobile, but is one of the first things the reader sees. */}
        {person.saju && (
          <section className="mt-8 sm:mt-10 rounded-2xl bg-gray-50 border border-gray-100 px-4 sm:px-6 py-5 sm:py-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4 text-center">
              {lang === 'ko' ? `${displayName}의 사주` : `${displayName}'s Saju`}
            </h2>
            <div className="max-w-md mx-auto">
              <div className="flex justify-center gap-2 sm:gap-2.5">
                <HeroPillar
                  label="時"
                  ju={person.saju.saju.hour}
                  ilgan={person.saju.saju.day.stem as CheonGan}
                />
                <HeroPillar
                  label="日"
                  ju={person.saju.saju.day}
                  ilgan={person.saju.saju.day.stem as CheonGan}
                  isDayPillar
                />
                <HeroPillar
                  label="月"
                  ju={person.saju.saju.month}
                  ilgan={person.saju.saju.day.stem as CheonGan}
                />
                <HeroPillar
                  label="年"
                  ju={person.saju.saju.year}
                  ilgan={person.saju.saju.day.stem as CheonGan}
                />
              </div>
              <p className="text-[12px] text-gray-500 text-center mt-3">
                {person.saju.ilju}일주 · {person.saju.wolji}월지 · {person.saju.gyeokguk}
              </p>
            </div>
          </section>
        )}

        {/* 대운 strip — 10-year luck periods. Needs birthday + gender, both
            of which the enriched data set carries. Component handles its own
            loading/error states (silently hides if data is missing). */}
        {person.birthday && person.gender && (
          <section className="mt-6">
            <DaewoonStrip person={person} />
          </section>
        )}

        {/* Bio sections — single-scroll layout with right-edge floating nav */}
        <div className="mt-10">
          {bioLoading ? (
            <LoadingSpinner />
          ) : !bio ? (
            <EmptyBioState lang={lang} />
          ) : (
            <DeepBioContent bio={bio} person={person} lang={lang} />
          )}
        </div>
      </div>
    </div>
  );
}
