'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import Link from 'next/link';
import type { EnrichedPerson } from '@/lib/saju/types';
import { hasDeepBioSync, hasDeepBioV2Sync, loadDeepBioIndex } from '@/lib/deepBio';
import { useLanguage } from '@/lib/i18n';
import { USD_TO_KRW } from '@/lib/usdToKrw';
import Portrait from '@/components/profile-v2/Portrait';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

/**
 * Card grid — shared by the curated sections and the filtered results so
 * both line up the same. 2 / 3 / 6 columns divide the 6-card sections and
 * the 60-card pages evenly, so no row is left half empty.
 */
export const CARD_GRID_CLASS =
  'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6 sm:gap-x-5 sm:gap-y-8';

/** Generational suffixes that belong with the surname, not instead of it. */
const NAME_SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|주니어|시니어|[2-4]세)$/i;

/** First name + surname ("윌리엄 게이츠 3세", not "윌리엄 3세"). */
function shortName(person: EnrichedPerson, isKo: boolean): string {
  const raw = isKo ? (person.nameKo ?? person.name) : person.name;
  const parts = raw.split(' ');
  const suffix = parts.length > 2 && NAME_SUFFIX.test(parts[parts.length - 1]) ? parts.pop() : null;
  const short = parts.length <= 2 ? parts.join(' ') : `${parts[0]} ${parts[parts.length - 1]}`;
  return suffix ? `${short} ${suffix}` : short;
}

function formatNetWorthShort(netWorthB: number, isKo: boolean): string {
  if (isKo) {
    const eok = netWorthB * 10 * USD_TO_KRW;
    const jo = eok / 10000;
    if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
    return `${Math.round(eok).toLocaleString('ko-KR')}억`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

interface Props {
  person: EnrichedPerson;
}

export default function CleanMiniCard({ person }: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';
  const [showBio, setShowBio] = useState(false);
  const [, setBioIndexReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadDeepBioIndex().then(() => {
      if (!cancelled) setBioIndexReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const hasBio = hasDeepBioSync(person.id) || hasDeepBioV2Sync(person.id);
  const name = shortName(person, isKo);
  const netWorth = formatNetWorthShort(person.netWorth, isKo);

  // One line of key facts: net worth · 일주 · company. Company goes last
  // so it is what truncates on narrow cards.
  const company = person.companyKo || person.company || person.source;
  const facts = [netWorth, person.saju?.ilju, company].filter(Boolean).join(' · ');
  const fullName = isKo ? (person.nameKo ?? person.name) : person.name;

  // Profile v2 language: photo (8px corners, no shadow, initials when there
  // is none), name, one gray line. Single-line text keeps every card in a
  // row the same height.
  const body = (
    <>
      <Portrait
        person={person}
        lazy
        className={`aspect-square w-full rounded-lg overflow-hidden bg-gray-100 ${
          hasBio ? 'transition-opacity group-hover:opacity-90' : 'grayscale opacity-60'
        }`}
        textClass="text-3xl"
      />
      <p className="mt-2 text-sm font-medium text-gray-900 truncate" title={fullName !== name ? fullName : undefined}>
        {name}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 truncate">{facts}</p>
    </>
  );

  return (
    <>
      {hasBio ? (
        <Link
          href={`/profile/${person.id}`}
          // A plain click opens the overlay, never this route, so
          // prefetching it only burned requests (and the rate limit) for
          // every card scrolled past. See config.matcher in src/proxy.ts.
          prefetch={false}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey) return;
            e.preventDefault();
            setShowBio(true);
          }}
          aria-label={`${name} 사주 상세 보기`}
          className="group block"
        >
          {body}
        </Link>
      ) : (
        <div className="group block" aria-disabled="true">
          {body}
        </div>
      )}
      {showBio && (
        <Suspense fallback={null}>
          <DeepBioModal person={person} onClose={() => setShowBio(false)} />
        </Suspense>
      )}
    </>
  );
}
