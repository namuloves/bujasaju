'use client';

import React, { useState, lazy, Suspense } from 'react';
import type { EnrichedPerson, SajuResult, CheonGan, JiJi } from '@/lib/saju/types';
import { useSajuSummary } from './MatchSummary';
import { HeroPillar } from './SajuHero';
import { GYEOKGUK_NAMES, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import SajuBadge from '@/components/SajuBadge';
import { hasDeepBioSync } from '@/lib/deepBio';
import { useLanguage } from '@/lib/i18n';
import { nationalityToKorean } from '@/components/FilterPanel';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

interface Props {
  person: EnrichedPerson;
  saju: SajuResult;
  matches: EnrichedPerson[];
  onReset?: () => void;
  totalMatches?: number;
}

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', KR: '🇰🇷', CN: '🇨🇳', JP: '🇯🇵', IN: '🇮🇳', FR: '🇫🇷',
  DE: '🇩🇪', GB: '🇬🇧', IT: '🇮🇹', ES: '🇪🇸', CA: '🇨🇦', AU: '🇦🇺',
  BR: '🇧🇷', MX: '🇲🇽', RU: '🇷🇺', HK: '🇭🇰', TW: '🇹🇼', SG: '🇸🇬',
  IL: '🇮🇱', SE: '🇸🇪', NL: '🇳🇱', CH: '🇨🇭', TH: '🇹🇭', PH: '🇵🇭',
  ID: '🇮🇩', MY: '🇲🇾', ZA: '🇿🇦', NG: '🇳🇬', EG: '🇪🇬', SA: '🇸🇦',
  AE: '🇦🇪', AT: '🇦🇹', DK: '🇩🇰', CL: '🇨🇱', CO: '🇨🇴', NZ: '🇳🇿',
  IE: '🇮🇪', UA: '🇺🇦', CZ: '🇨🇿', GE: '🇬🇪', LB: '🇱🇧', PK: '🇵🇰',
  PT: '🇵🇹', AR: '🇦🇷', BB: '🇧🇧', BG: '🇧🇬', GR: '🇬🇷', KE: '🇰🇪',
  ZW: '🇿🇼', DZ: '🇩🇿', KW: '🇰🇼', FI: '🇫🇮', LV: '🇱🇻', IR: '🇮🇷',
  HU: '🇭🇺', MC: '🇲🇨', UZ: '🇺🇿', ET: '🇪🇹',
};

function getFlag(nationality: string): string {
  return FLAG_MAP[nationality.split('/')[0]] || '🌍';
}

const USD_TO_KRW = 1480.71;

function formatNetWorthKrw(netWorthBillionsUsd: number): string {
  const eokKrw = netWorthBillionsUsd * 10 * USD_TO_KRW;
  const trillions = eokKrw / 10000;
  if (trillions >= 1) {
    const fixed = trillions >= 10 ? Math.round(trillions).toLocaleString() : trillions.toFixed(1);
    return `${fixed}조 원`;
  }
  const eok = Math.round(eokKrw / 100) * 100;
  return `${eok.toLocaleString('ko-KR')}억 원`;
}

function formatNetWorthUsd(netWorth: number): string {
  if (netWorth >= 1) return `$${netWorth.toFixed(1)}B`;
  return `$${(netWorth * 1000).toFixed(0)}M`;
}

function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&bold=true`;
  }
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

export default function SingleMatchCard({ person, saju, matches, onReset, totalMatches }: Props) {
  const { t, lang } = useLanguage();
  const [showChart, setShowChart] = useState(false);
  const [showDeepBio, setShowDeepBio] = useState(false);

  const summaryState = useSajuSummary({
    user: {
      ilju: saju.ilju,
      wolji: saju.wolji,
      gyeokguk: saju.gyeokguk,
      ilgan: saju.saju.day.stem,
    },
    matches,
  });

  const personSaju = person.saju;
  const displayBio = lang === 'ko' ? (person.bioKo ?? person.bio) : person.bio;

  const isStreaming = summaryState.status === 'streaming';
  const summaryText = summaryState.status === 'idle' ? '' : summaryState.text;


  return (
    <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
        {/* 당신의 사주 — user's 4-pillar chart */}
        <div className="text-center mb-3">
          <div className="text-xs font-semibold text-indigo-500 tracking-widest uppercase">
            {t.yourSaju}
          </div>
        </div>
        <div className="flex justify-center gap-1.5 sm:gap-2 mb-3">
          <HeroPillar label="時" ju={saju.saju.hour} ilgan={saju.saju.day.stem as CheonGan} compact />
          <HeroPillar label="日" ju={saju.saju.day} ilgan={saju.saju.day.stem as CheonGan} isDayPillar compact />
          <HeroPillar label="月" ju={saju.saju.month} ilgan={saju.saju.day.stem as CheonGan} compact />
          <HeroPillar label="年" ju={saju.saju.year} ilgan={saju.saju.day.stem as CheonGan} compact />
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs mb-4">
          <div>
            <span className="text-gray-500">{t.yourIlju}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span className="font-bold text-indigo-600">{saju.ilju}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.yourWolji}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span className="font-bold text-indigo-600">{saju.wolji}</span>
          </div>
          <div>
            <span className="text-gray-500">{t.yourGyeokguk}</span>
            <span className="mx-1.5 text-gray-300">·</span>
            <span className="font-bold text-indigo-600">
              {saju.gyeokguk}
              {(() => { const h = GYEOKGUK_NAMES[saju.gyeokguk]; return h ? <span className="text-gray-400 font-normal ml-1">{h}</span> : null; })()}
            </span>
          </div>
        </div>

        {/* Match count + reset */}
        <div className="text-center mb-5">
          {totalMatches != null && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full mb-2">
              <span className="text-indigo-400">✨</span>
              <span className="text-sm">
                <span className="font-bold text-indigo-600">{t.countPeople(totalMatches)}</span>
                <span className="text-gray-500">{t.heroMatchTagline}</span>
              </span>
            </div>
          )}
          {onReset && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                {t.resetMyBirthday}
              </button>
            </div>
          )}
        </div>

        {/* 사주 풀이 — streaming Claude text */}
        {summaryState.status !== 'idle' && (
          <div className="mb-5">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-lg">✨</span>
              <h4 className="text-sm font-bold text-gray-900">사주 풀이</h4>
              {isStreaming && (
                <span className="inline-flex gap-1">
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" style={{ animationDelay: '300ms' }} />
                </span>
              )}
            </div>
            <p className="text-[14px] leading-relaxed text-gray-700 whitespace-pre-wrap">
              {summaryText}
              {isStreaming && <span className="inline-block w-[2px] h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />}
            </p>
            {!isStreaming && summaryText && hasDeepBioSync(person.id) && (
              <button
                onClick={() => setShowDeepBio(true)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14" fill="currentColor">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                </svg>
                {lang === 'ko' ? `${person.nameKo ?? person.name}의 스토리 보기` : `View ${person.name}'s story`}
              </button>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2 mb-5">
          <span className="text-xl">🥇</span>
          <h3 className="text-base font-bold text-gray-900">{t.monthJuTitle}</h3>
        </div>

        {/* Person hero — photo + info side by side */}
        <div className="flex gap-4 sm:gap-5">
          {/* Photo */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
            <img
              src={normalizePhotoUrl(person.photoUrl, person.name)}
              alt={person.name}
              width={288}
              height={288}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=400&background=random&bold=true`;
              }}
            />
            <div className="absolute top-1.5 left-1.5 text-base">
              {getFlag(person.nationality)}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            {person.nameKo ? (
              <>
                <h4 className="text-lg font-bold text-gray-900 truncate">{person.nameKo}</h4>
                <p className="text-sm text-gray-400 truncate">{person.name}</p>
              </>
            ) : (
              <h4 className="text-lg font-bold text-gray-900 truncate">{person.name}</h4>
            )}
            <p className="text-sm text-gray-500 mt-1 truncate">
              {person.source || person.industry}
            </p>
            <p className="text-sm font-semibold text-gray-700 mt-1">
              {lang === 'ko' ? formatNetWorthKrw(person.netWorth) : formatNetWorthUsd(person.netWorth)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ko' ? nationalityToKorean(person.nationality) : person.nationality}
            </p>
          </div>
        </div>

        {/* Bio — shows what made them rich */}
        {displayBio && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            {displayBio}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 flex gap-2">
        {hasDeepBioSync(person.id) && (
          <button
            onClick={() => setShowDeepBio(true)}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            {lang === 'ko' ? '자세히 보기' : 'View profile'}
          </button>
        )}
        <button
          onClick={() => setShowChart(!showChart)}
          className="flex-1 py-2.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
        >
          {t.viewChart} {showChart ? '▲' : '▼'}
        </button>
      </div>

      {/* Full saju chart (expandable) */}
      {showChart && (
        <div className="mx-5 sm:mx-6 mb-5 sm:mb-6 border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-center text-xs">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-1.5 text-gray-400 font-normal">{t.hourPillar}</th>
                <th className="py-1.5 text-gray-400 font-normal bg-indigo-50">{t.cardDayPillar}</th>
                <th className="py-1.5 text-gray-400 font-normal">{t.monthPillar}</th>
                <th className="py-1.5 text-gray-400 font-normal">{t.yearPillar}</th>
              </tr>
            </thead>
            <tbody>
              {/* 십성 */}
              <tr>
                <td className="pt-2 text-[9px] text-gray-400">?</td>
                <td className="pt-2 text-[9px] text-indigo-500 font-medium bg-indigo-50/30">일간</td>
                <td className="pt-2 text-[9px] text-gray-500 font-medium">
                  {getSipSin(personSaju.saju.day.stem as CheonGan, personSaju.saju.month.stem as CheonGan)}
                </td>
                <td className="pt-2 text-[9px] text-gray-500 font-medium">
                  {getSipSin(personSaju.saju.day.stem as CheonGan, personSaju.saju.year.stem as CheonGan)}
                </td>
              </tr>
              {/* 천간 */}
              <tr>
                <td className="py-1.5 text-gray-300">?</td>
                <td className="py-1.5 bg-indigo-50/30">
                  <SajuBadge stem={personSaju.saju.day.stem} size="sm" />
                </td>
                <td className="py-1.5">
                  <SajuBadge stem={personSaju.saju.month.stem} size="sm" />
                </td>
                <td className="py-1.5">
                  <SajuBadge stem={personSaju.saju.year.stem} size="sm" />
                </td>
              </tr>
              {/* 지지 */}
              <tr>
                <td className="py-1.5 text-gray-300">?</td>
                <td className="py-1.5 bg-indigo-50/30">
                  <SajuBadge branch={personSaju.saju.day.branch} size="sm" />
                </td>
                <td className="py-1.5">
                  <SajuBadge branch={personSaju.saju.month.branch} size="sm" />
                </td>
                <td className="py-1.5">
                  <SajuBadge branch={personSaju.saju.year.branch} size="sm" />
                </td>
              </tr>
              {/* 본기 십성 */}
              <tr>
                <td className="pb-2 text-[9px] text-gray-400">?</td>
                <td className="pb-2 text-[9px] text-gray-500 font-medium bg-indigo-50/30">
                  {getSipSin(personSaju.saju.day.stem as CheonGan, getBongi(personSaju.saju.day.branch as JiJi))}
                </td>
                <td className="pb-2 text-[9px] text-gray-500 font-medium">
                  {getSipSin(personSaju.saju.day.stem as CheonGan, getBongi(personSaju.saju.month.branch as JiJi))}
                </td>
                <td className="pb-2 text-[9px] text-gray-500 font-medium">
                  {getSipSin(personSaju.saju.day.stem as CheonGan, getBongi(personSaju.saju.year.branch as JiJi))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Deep bio modal */}
      {showDeepBio && (
        <Suspense fallback={null}>
          <DeepBioModal person={person} onClose={() => setShowDeepBio(false)} />
        </Suspense>
      )}
    </div>
  );
}
