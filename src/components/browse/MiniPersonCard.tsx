'use client';

import React, { useState, lazy, Suspense } from 'react';
import type { EnrichedPerson } from '@/lib/saju/types';
import { hasDeepBioSync } from '@/lib/deepBio';
import { useLanguage } from '@/lib/i18n';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

/** Same fallback as PersonCard.tsx */
function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&bold=true`;
  }
  if (url.startsWith('/')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

const USD_TO_KRW = 1480.71;

/**
 * Short display name — drops middle names for both Korean and English.
 * "제프리 프레스턴 베조스" → "제프리 베조스"
 * "Jeffrey Preston Bezos" → "Jeffrey Bezos"
 */
function shortName(person: EnrichedPerson, isKo: boolean): string {
  const raw = isKo ? (person.nameKo ?? person.name) : person.name;
  const parts = raw.split(' ');
  if (parts.length <= 2) return raw;
  return `${parts[0]} ${parts[parts.length - 1]}`;
}

function formatNetWorthShort(netWorthB: number, isKo: boolean): string {
  if (isKo) {
    const eok = netWorthB * 10 * USD_TO_KRW;
    const jo = eok / 10000;
    if (jo >= 1) {
      return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
    }
    return `${Math.round(eok).toLocaleString('ko-KR')}억`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

interface Props {
  person: EnrichedPerson;
}

export default function MiniPersonCard({ person }: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';
  const [showBio, setShowBio] = useState(false);
  const hasBio = hasDeepBioSync(person.id);

  return (
    <>
      <div
        role={hasBio ? 'button' : undefined}
        tabIndex={hasBio ? 0 : undefined}
        onClick={hasBio ? () => setShowBio(true) : undefined}
        onKeyDown={hasBio ? (e) => { if (e.key === 'Enter') setShowBio(true); } : undefined}
        className={`relative rounded overflow-hidden bg-gray-100 ${hasBio ? 'cursor-pointer' : ''}`}
      >
        <div className="aspect-[3/4] relative">
          <img
            src={normalizePhotoUrl(person.photoUrl, person.name)}
            alt={person.name}
            width={160}
            height={200}
            className={`w-full h-full object-cover ${hasBio ? '' : 'grayscale'}`}
            loading="lazy"
            decoding="async"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
          {/* Text overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 flex items-end justify-between gap-1">
            <div className="min-w-0">
              <h4 className="text-white text-[11px] font-bold leading-tight whitespace-nowrap">
                {shortName(person, isKo)}
              </h4>
              {person.source && (
                <p className="text-white/80 text-[9px] font-medium whitespace-nowrap">
                  {person.source}
                </p>
              )}
              <p className="text-white/80 text-[9px] font-medium">
                {formatNetWorthShort(person.netWorth, isKo)}
              </p>
            </div>
            <p className="text-white/90 text-[10px] font-semibold shrink-0">
              {person.saju.ilju}
            </p>
          </div>
        </div>
      </div>
      {showBio && (
        <Suspense fallback={null}>
          <DeepBioModal person={person} onClose={() => setShowBio(false)} />
        </Suspense>
      )}
    </>
  );
}
