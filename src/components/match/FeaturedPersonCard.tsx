'use client';

import React, { useState, lazy, Suspense } from 'react';
import type { EnrichedPerson } from '@/lib/saju/types';
import { hasDeepBioSync } from '@/lib/deepBio';
import { useLanguage } from '@/lib/i18n';
import { nationalityToKorean } from '@/components/FilterPanel';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

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

interface Props {
  person: EnrichedPerson;
}

/**
 * A borderless, compact person card designed to be embedded inside the
 * top result card. Shows photo, name, industry, net worth, and bio.
 * No saju chart — that's already shown in SajuHero.
 */
export default function FeaturedPersonCard({ person }: Props) {
  const { lang } = useLanguage();
  const [showDeepBio, setShowDeepBio] = useState(false);
  const displayBio = lang === 'ko' ? (person.bioKo ?? person.bio) : person.bio;

  return (
    <>
      {/* Photo */}
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
        <img
          src={normalizePhotoUrl(person.photoUrl, person.name)}
          alt={person.name}
          width={400}
          height={300}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=400&background=random&bold=true`;
          }}
        />
        <div className="absolute top-2 left-2 text-lg">
          {getFlag(person.nationality)}
        </div>
      </div>

      {/* Info */}
      <div className="mt-3">
        {person.nameKo ? (
          <>
            <h4 className="text-base font-bold text-gray-900">{person.nameKo}</h4>
            <p className="text-sm text-gray-400">{person.name}</p>
          </>
        ) : (
          <h4 className="text-base font-bold text-gray-900">{person.name}</h4>
        )}
        <p className="text-sm text-gray-500 mt-1">
          {person.source || person.industry}
        </p>
        <p className="text-sm font-semibold text-gray-700 mt-1">
          {lang === 'ko' ? formatNetWorthKrw(person.netWorth) : formatNetWorthUsd(person.netWorth)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {lang === 'ko' ? nationalityToKorean(person.nationality) : person.nationality}
        </p>
      </div>

      {/* Bio */}
      {displayBio && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          {displayBio}
        </p>
      )}

      {/* Deep bio button */}
      {hasDeepBioSync(person.id) && (
        <button
          onClick={() => setShowDeepBio(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          {lang === 'ko' ? '자세히 보기 →' : 'View profile →'}
        </button>
      )}

      {/* Deep bio modal */}
      {showDeepBio && (
        <Suspense fallback={null}>
          <DeepBioModal person={person} onClose={() => setShowDeepBio(false)} />
        </Suspense>
      )}
    </>
  );
}
