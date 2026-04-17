'use client';

import React, { useState, lazy, Suspense } from 'react';
import Link from 'next/link';
import type { EnrichedPerson } from '@/lib/saju/types';
import { hasDeepBioSync } from '@/lib/deepBio';
import { useLanguage } from '@/lib/i18n';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

/** Same fallback as PersonCard.tsx */
function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&bold=true`;
  }
  let normalized = url;
  if (normalized.startsWith('/')) normalized = `https:${normalized}`;
  if (normalized.startsWith('http://')) normalized = normalized.replace(/^http:/, 'https:');
  // Wikimedia hotlinks get blocked by browser ORB — proxy them through our API.
  if (normalized.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
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
  /** Optional category label shown above card. Pass empty string to reserve space without text. */
  categoryLabel?: string;
  /** When true, always reserve space for the label row (for grid alignment). */
  reserveLabelSpace?: boolean;
}

function CardInner({
  person,
  isKo,
  hasBio,
}: {
  person: EnrichedPerson;
  isKo: boolean;
  hasBio: boolean;
}) {
  return (
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
            {person.netWorthEstimated && (
              <span className="ml-1 text-white/60" title={isKo ? '언론 추정치' : 'Press estimate'}>
                {isKo ? '(추정)' : '(est.)'}
              </span>
            )}
          </p>
        </div>
        <p className="text-white/90 text-[10px] font-semibold shrink-0">
          {person.saju.ilju}
        </p>
      </div>
      {/* Bio status label */}
      {!hasBio && (
        <div className="absolute top-1.5 right-1.5">
          <span className="text-[8px] font-medium text-white/50 bg-black/20 px-1.5 py-0.5 rounded">
            준비중
          </span>
        </div>
      )}
    </div>
  );
}

export default function MiniPersonCard({ person, categoryLabel, reserveLabelSpace }: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';
  const [showBio, setShowBio] = useState(false);
  const hasBio = hasDeepBioSync(person.id);

  return (
    <>
      <div className="flex flex-col">
        {false && (categoryLabel || reserveLabelSpace) && (
          <p className={`text-sm font-bold mb-2 truncate ${categoryLabel ? 'text-gray-900' : 'invisible'}`}>
            {categoryLabel || '\u00A0'}
          </p>
        )}
        {/* Wrap the card in a real <Link> so search engines and users opening
            a new tab (cmd-click, right-click) reach the canonical profile
            page. Normal left-clicks are intercepted to preserve the overlay
            UX. When there's no bio, render a plain div (no nav target). */}
        {hasBio ? (
          <Link
            href={`/profile/${person.id}`}
            onClick={(e) => {
              // Let cmd/ctrl/shift/middle-click go through to full page.
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              setShowBio(true);
            }}
            aria-label={`${shortName(person, isKo)} 사주 상세 보기`}
            className="relative rounded overflow-hidden bg-gray-100 cursor-pointer block"
          >
            <CardInner person={person} isKo={isKo} hasBio={hasBio} />
          </Link>
        ) : (
          <div className="relative rounded overflow-hidden bg-gray-100">
            <CardInner person={person} isKo={isKo} hasBio={hasBio} />
          </div>
        )}
      </div>
      {showBio && (
        <Suspense fallback={null}>
          <DeepBioModal person={person} onClose={() => setShowBio(false)} />
        </Suspense>
      )}
    </>
  );
}
