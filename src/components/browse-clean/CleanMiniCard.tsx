'use client';

import React, { useState, lazy, Suspense } from 'react';
import Link from 'next/link';
import type { EnrichedPerson } from '@/lib/saju/types';
import { hasDeepBioSync } from '@/lib/deepBio';
import { useLanguage } from '@/lib/i18n';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=f3f4f6&color=9ca3af&bold=true`;
  }
  let normalized = url;
  if (normalized.startsWith('/')) normalized = `https:${normalized}`;
  if (normalized.startsWith('http://')) normalized = normalized.replace(/^http:/, 'https:');
  if (normalized.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

const USD_TO_KRW = 1480.71;

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
  const hasBio = hasDeepBioSync(person.id);
  const name = shortName(person, isKo);
  const netWorth = formatNetWorthShort(person.netWorth, isKo);

  const body = (
    <>
      <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-50">
        <img
          src={normalizePhotoUrl(person.photoUrl, person.name)}
          alt={person.name}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${hasBio ? '' : 'grayscale opacity-60'}`}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="mt-2.5 px-0.5">
        <h4 className="text-[13px] font-semibold text-gray-900 leading-tight truncate">
          {name}
        </h4>
        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
          {person.source ? `${person.source} · ` : ''}{netWorth}
        </p>
      </div>
    </>
  );

  return (
    <>
      {hasBio ? (
        <Link
          href={`/profile/${person.id}`}
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
