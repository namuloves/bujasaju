'use client';

/**
 * Profile page — v2 layout (preview). Same data as /profile/[id]; only the
 * layout differs, so the two can be compared side by side before switching.
 * Kept out of search results by ./layout.tsx (noindex).
 *
 * What changed vs v1 (see the design review, Nov 2026):
 *   1. Faint gray text raised to gray-500 for contrast (scoped CSS in
 *      globals.css under `.profile-v2`, so reused components follow).
 *   2. Quiz CTA is a real button on a white card; bigger back-button target.
 *   3. Reading moved up: chart → reading → 대운 → background → rest of bio.
 *      Facts already shown in the hero are not repeated.
 *   4. Chart card is white and, on desktop, carries the one-line reading.
 *   5. 대운 strip uses the reading's start age and shows years; it scrolls
 *      to the current period on phones.
 *   6. 대운 paragraphs stack on phones.
 *   7. Generic short bio hidden when the one-line summary is present.
 *   8. No-photo profiles get a neutral initials tile instead of ui-avatars.
 *   9. 9–10px labels raised to 11px (scoped CSS).
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import type { DeepBio, SajuConnection } from '@/lib/deepBio';
import { fetchDeepBio, hasStructuredReading } from '@/lib/deepBio';
import { LoadingSpinner, EmptyBioState, ko } from '@/components/deep-bio/DeepBioTabs';
import DeepBioContent from '@/components/deep-bio/DeepBioContent';
import { HeroPillar } from '@/components/match/SajuHero';
import DaewoonStrip from '@/components/profile/DaewoonStrip';
import CompareWithUser from '@/components/profile/CompareWithUser';
import RelatedPeople from '@/components/profile/RelatedPeople';
import FamilyLink from '@/components/profile/FamilyLink';
import { SajuReadingV2, DaeunReadingList, startAgeFromReading } from '@/components/profile-v2/SajuReadingV2';
import type { CheonGan, EnrichedPerson } from '@/lib/saju/types';
import { industryToKorean } from '@/components/FilterPanel';
import { rewriteUsdToKrwInline, USD_TO_KRW } from '@/lib/usdToKrw';

function normalizePhotoUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

const noopSubscribe = () => () => {};
function readVisitorHasSaju(): boolean {
  try {
    return !!localStorage.getItem('bujasaju.matchInput');
  } catch {
    return false;
  }
}

function initialsOf(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? words[words.length - 1][0] ?? '' : '';
  return (first + last).toUpperCase();
}

/** Photo, or a neutral gray tile with initials when there is no photo or
 *  it fails to load. Uses only existing gray tokens. */
function Portrait({ person, className, textClass }: { person: EnrichedPerson; className: string; textClass: string }) {
  const src = normalizePhotoUrl(person.photoUrl);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center`} aria-label={person.name} role="img">
        <span className={`${textClass} font-medium text-gray-500 select-none`}>{initialsOf(person.name)}</span>
      </div>
    );
  }
  return (
    <div className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={person.name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
    </div>
  );
}

function formatNetWorth(netWorthB: number, isKo: boolean): string {
  if (isKo) {
    const eok = netWorthB * 10 * USD_TO_KRW;
    const jo = eok / 10000;
    if (jo >= 1) {
      return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조원`;
    }
    return `${Math.round(eok).toLocaleString('ko-KR')}억원`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

export default function ProfilePageV2() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const { people, loading: peopleLoading } = useEnrichedPeople();
  const [bio, setBio] = useState<DeepBio | null>(null);
  const [bioLoading, setBioLoading] = useState(true);

  const personId = params.id as string;
  const person = people.find(p => p.id === personId);

  // Quiz-takers already see this chart inside CompareWithUser, so the
  // standalone chart is hidden for them. Read without an effect: false on
  // the server, the real value on the client.
  const visitorHasSaju = useSyncExternalStore(
    noopSubscribe,
    readVisitorHasSaju,
    () => false,
  );

  useEffect(() => {
    fetchDeepBio(personId).then(data => {
      setBio(data);
      setBioLoading(false);
    });
  }, [personId]);

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
        <p className="text-gray-500 text-sm">{lang === 'ko' ? '인물을 찾을 수 없어요.' : 'Person not found.'}</p>
        <button onClick={() => router.back()} className="text-sm text-gray-700 hover:text-black">
          {lang === 'ko' ? '← 돌아가기' : '← Go back'}
        </button>
      </div>
    );
  }

  const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;

  const knownFor = bio?.personalTraits
    ? ko(lang, bio.personalTraits.knownFor, bio.personalTraits.knownForKo)
    : null;

  const sc = (bio as { sajuConnection?: SajuConnection } | null)?.sajuConnection;
  const structured = !!sc && hasStructuredReading(sc);
  const oneLine = structured ? sc!.oneLineKo : undefined;
  const daeunItems = structured ? sc!.daeunKo ?? [] : [];
  const stripStartAge = startAgeFromReading(daeunItems);

  const asOfLabel = (() => {
    if (bio?.updatedAt) {
      const d = bio.updatedAt.replace(/-/g, '.');
      return lang === 'ko' ? `${d} 업데이트` : `updated ${d}`;
    }
    const last = bio?.wealthHistory?.[bio.wealthHistory.length - 1]?.year;
    if (last) return lang === 'ko' ? `${last}년 포브스 기준` : `Forbes, ${last}`;
    return null;
  })();

  // Background rows not already shown in the hero (birthplace and
  // education are in the chips / education line up top).
  const backgroundRows: { label: string; value: string }[] = [];
  if (bio?.childhood?.familyBackground) {
    backgroundRows.push({
      label: lang === 'ko' ? '집안' : 'Family',
      value: ko(lang, bio.childhood.familyBackground, bio.childhood.familyBackgroundKo),
    });
  }
  if (person.wealthOrigin) {
    backgroundRows.push({
      label: lang === 'ko' ? '부의 출처' : 'Source',
      value: lang === 'ko'
        ? (person.wealthOrigin === 'self-made' ? '자수성가' : person.wealthOrigin === 'inherited' ? '상속' : '상속 후 성장')
        : person.wealthOrigin,
    });
  }

  const showChart = !!person.saju && !visitorHasSaju;
  const showChartCard = !!person.saju && (showChart || !!oneLine);

  return (
    <div className="min-h-screen bg-gray-50 profile-page-root profile-v2">
      {/* Top bar — same as v1, with a 44px tap target on the back button. */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 profile-topbar">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-1.5 flex items-center gap-3">
          <button
            onClick={() => {
              if (typeof document !== 'undefined' &&
                  document.referrer &&
                  new URL(document.referrer).origin === window.location.origin) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="h-11 -ml-2 px-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors text-sm flex items-center gap-1 shrink-0"
            aria-label={lang === 'ko' ? '돌아가기' : 'Back'}
          >
            <span className="text-lg leading-none">←</span>
            <span className="hidden sm:inline">{lang === 'ko' ? '돌아가기' : 'Back'}</span>
          </button>
          <div className="h-5 w-px bg-gray-200 shrink-0" />
          <Portrait person={person} className="w-8 h-8 rounded-full overflow-hidden shrink-0" textClass="text-[11px]" />
          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
            <span className="text-xs text-gray-500 shrink-0">
              {formatNetWorth(person.netWorth, lang === 'ko')}
            </span>
            <span className="text-xs text-gray-500 truncate hidden sm:inline">
              · {lang === 'ko' ? industryToKorean(person.industry) : person.industry}
            </span>
            {person.saju && (
              <span className="text-xs text-gray-500 truncate hidden sm:inline">
                · {person.saju.ilju} 일주
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero — same structure as v1. */}
        <div className="flex items-start gap-4 sm:gap-6">
          <div className="shrink-0">
            <Portrait
              person={person}
              className="w-32 h-40 sm:w-48 sm:h-60 rounded-2xl overflow-hidden shadow-lg"
              textClass="text-3xl sm:text-4xl"
            />
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-xl sm:text-3xl font-medium text-gray-900 leading-tight flex items-baseline gap-2 flex-wrap">
              {displayName}
              {person.nameKo && (
                <span className="text-sm sm:text-base font-normal text-gray-500">
                  {lang === 'ko' ? person.name : person.nameKo}
                </span>
              )}
            </h1>

            {knownFor && (
              <p className="mt-1.5 text-[13px] sm:text-sm text-gray-700 leading-snug">
                {knownFor}
              </p>
            )}

            <div className="flex items-baseline gap-2 mt-2 sm:mt-3 flex-wrap">
              <span className="font-medium text-gray-900 text-xl sm:text-2xl whitespace-nowrap">
                {formatNetWorth(person.netWorth, lang === 'ko')}
              </span>
              {lang === 'ko' && (
                <span className="text-[11px] sm:text-xs text-gray-500">${person.netWorth}B</span>
              )}
              {asOfLabel && (
                <span className="text-[11px] sm:text-xs text-gray-500">· {asOfLabel}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-3 text-[11px] sm:text-xs text-gray-600">
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                {lang === 'ko' ? industryToKorean(person.industry) : person.industry}
              </span>
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                {person.birthday.replace(/-/g, '.')}
                {person.deathDate ? ` – ${person.deathDate.replace(/-/g, '.')}` : ''}
              </span>
              {person.saju && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">{person.saju.ilju} 일주</span>
              )}
              {bio?.childhood?.birthPlace && (
                <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                  {ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo)}
                </span>
              )}
            </div>

            {person.company && person.company !== person.industry && !knownFor && (
              <p className="mt-2 text-xs sm:text-sm text-gray-500">{person.company}</p>
            )}

            {bio?.childhood?.education && (
              <p className="mt-2 text-[11px] sm:text-xs text-gray-600 leading-relaxed">
                <span className="text-gray-500">{lang === 'ko' ? '학력 · ' : 'Education · '}</span>
                {ko(lang, bio.childhood.education, bio.childhood.educationKo)}
              </p>
            )}

            {/* The short dataset bio mostly restates the one-line summary
                above, so it only shows when there is no summary. */}
            {person.bio && !knownFor && (
              <ExpandableBio
                text={lang === 'ko'
                  ? rewriteUsdToKrwInline(person.bioKo ?? person.bio, person.netWorth)
                  : person.bio}
                lang={lang}
              />
            )}
          </div>
        </div>

        {/* Quiz CTA — real button. */}
        {person.saju && (
          <div className="mt-6">
            <CompareWithUser person={person} ctaStyle="button" />
          </div>
        )}

        {/* Chart card — white like the CTA card. On desktop the one-line
            reading sits beside the chart so the card carries content. */}
        {showChartCard && (
          <section className="mt-6 rounded-2xl bg-white border border-gray-200 px-4 sm:px-6 py-5 sm:py-6">
            <div className={showChart && oneLine ? 'grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10' : ''}>
              {showChart && (
                <div className={oneLine ? '' : 'max-w-md mx-auto'}>
                  <h2 className="text-sm font-medium text-gray-900 mb-4 text-center">
                    {lang === 'ko' ? `${displayName}의 사주` : `${displayName}'s Saju`}
                  </h2>
                  <div className="flex justify-center gap-2 sm:gap-2.5">
                    <HeroPillar label="時" ju={person.saju.saju.hour} ilgan={person.saju.saju.day.stem as CheonGan} />
                    <HeroPillar label="日" ju={person.saju.saju.day} ilgan={person.saju.saju.day.stem as CheonGan} isDayPillar />
                    <HeroPillar label="月" ju={person.saju.saju.month} ilgan={person.saju.saju.day.stem as CheonGan} />
                    <HeroPillar label="年" ju={person.saju.saju.year} ilgan={person.saju.saju.day.stem as CheonGan} />
                  </div>
                  <p className="text-[12px] text-gray-600 text-center mt-3">
                    {person.saju.ilju}일주 · {person.saju.wolji}월지 · {person.saju.gyeokguk}
                  </p>
                  {!person.saju.saju.hour && (
                    <p className="text-[11px] text-gray-500 text-center mt-1">
                      {lang === 'ko'
                        ? '출생 시각이 공개되지 않아 시주(時柱)는 제외했습니다.'
                        : 'Birth time is not public, so the hour pillar is omitted.'}
                    </p>
                  )}
                </div>
              )}
              {oneLine && (
                <div className={showChart ? 'md:border-l md:border-gray-100 md:pl-10' : ''}>
                  <p className="text-xs text-gray-500 mb-2">{lang === 'ko' ? '한 줄 풀이' : 'In one line'}</p>
                  <p className="text-base sm:text-lg text-gray-900 leading-relaxed">{oneLine}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Reading — moved up, right under the chart. */}
        {structured && (
          <div className="mt-10">
            <SajuReadingV2 sc={sc!} lang={lang} />
          </div>
        )}

        {/* 대운 — strip and the period-by-period reading together, with the
            strip's ages taken from the reading so the two agree. */}
        {person.birthday && person.gender && (
          <section className="mt-10">
            <DaewoonStrip
              person={person}
              rounding="round"
              startAgeOverride={stripStartAge}
              showYears
              autoScrollToCurrent
            />
            {daeunItems.length > 0 && (
              <div className="mt-6">
                <DaeunReadingList items={daeunItems} lang={lang} />
              </div>
            )}
          </section>
        )}

        {/* Background — only facts not already in the hero. */}
        {backgroundRows.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-medium text-gray-900 mb-3">{lang === 'ko' ? '배경' : 'Background'}</h2>
            <dl className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
              {backgroundRows.map((f, i) => (
                <div key={i} className="flex gap-3 px-4 py-3">
                  <dt className="text-xs text-gray-500 font-medium w-16 shrink-0 pt-0.5">{f.label}</dt>
                  <dd className="text-sm text-gray-800 leading-relaxed flex-1">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Rest of the bio — character, timeline, setbacks, sources. */}
        <div className="mt-10">
          {bioLoading ? (
            <LoadingSpinner />
          ) : !bio ? (
            <EmptyBioState lang={lang} />
          ) : (
            <DeepBioContent bio={bio} person={person} lang={lang} hideKeyFacts hideSajuConnection={structured} />
          )}
        </div>

        <FamilyLink personId={person.id} />
        <RelatedPeople person={person} people={people} />
      </div>
    </div>
  );
}

function ExpandableBio({ text, lang }: { text: string; lang: string }) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      if (!el) return;
      setIsClamped(el.scrollHeight > el.clientHeight + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [text]);

  return (
    <div className="mt-4">
      <p ref={ref} className={`text-sm text-gray-600 leading-relaxed text-left ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      {isClamped && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 -ml-2 h-11 px-2 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          {expanded
            ? (lang === 'ko' ? '접기 ↑' : 'Show less ↑')
            : (lang === 'ko' ? '더보기 ↓' : 'Show more ↓')}
        </button>
      )}
    </div>
  );
}
