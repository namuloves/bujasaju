'use client';

import React, { useState, lazy, Suspense } from 'react';
import type { EnrichedPerson } from '@/lib/saju/types';
import type { CuratedSectionConfig } from './curatedSections';
import { hasDeepBioSync } from '@/lib/deepBio';
import MiniPersonCard from './MiniPersonCard';
import { useLanguage } from '@/lib/i18n';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

/**
 * Same normalizePhotoUrl from PersonCard — extract if we ever need a 3rd copy.
 */
function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&bold=true`;
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
      return `약 ${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조 원`;
    }
    return `약 ${Math.round(eok).toLocaleString('ko-KR')}억 원`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

interface Props {
  config: CuratedSectionConfig;
  /** First person = cover, rest = mini cards. Pre-sorted by netWorth desc. */
  people: EnrichedPerson[];
  totalInSection: number;
  onShowMore: (() => void) | null;
}

export default function CuratedSection({ config, people, totalInSection, onShowMore }: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';
  const [coverBioOpen, setCoverBioOpen] = useState(false);

  if (people.length === 0) return null;

  const [cover, ...rest] = people;
  const coverName = isKo ? (cover.nameKo ?? cover.name) : cover.name;
  const label = isKo ? config.labelKo : config.labelEn;
  const description = isKo ? config.descriptionKo : config.descriptionEn;
  const remaining = totalInSection - people.length;
  const coverHasBio = hasDeepBioSync(cover.id);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900">
            {label}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {description} · {totalInSection}{isKo ? '명' : ' people'}
          </p>
        </div>
        {onShowMore && remaining > 0 && (
          <button
            type="button"
            onClick={onShowMore}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap"
          >
            {isKo ? '더 보기' : 'Show more'} →
          </button>
        )}
      </div>

      {/* Grid: all same-size cards, cover person gets a photo overlay style */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Cover card — photo overlay style, clickable for deep bio */}
        <div
          role={coverHasBio ? 'button' : undefined}
          tabIndex={coverHasBio ? 0 : undefined}
          onClick={coverHasBio ? () => setCoverBioOpen(true) : undefined}
          onKeyDown={coverHasBio ? (e) => { if (e.key === 'Enter') setCoverBioOpen(true); } : undefined}
          className={`relative rounded overflow-hidden bg-gray-100 group ${coverHasBio ? 'cursor-pointer' : ''}`}
        >
          <div className="aspect-[3/4] relative">
            <img
              src={normalizePhotoUrl(cover.photoUrl, cover.name)}
              alt={cover.name}
              width={240}
              height={320}
              className="w-full h-full object-cover "
              loading="lazy"
              decoding="async"
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
            {/* Text overlay */}
            <div className="absolute bottom-0 left-0 right-0 px-2.5 py-2 flex items-end justify-between gap-1">
              <div className="min-w-0">
                <h4 className="text-white text-[10px] font-bold leading-tight whitespace-nowrap">
                  {shortName(cover, isKo)}
                </h4>
                {cover.source && (
                  <p className="text-white/80 text-[9px] font-medium whitespace-nowrap">
                    {cover.source}
                  </p>
                )}
                <p className="text-white/80 text-[9px] font-medium">
                  {formatNetWorthShort(cover.netWorth, isKo)}
                </p>
              </div>
              <p className="text-white/90 text-[10px] font-semibold shrink-0">
                {cover.saju.ilju}
              </p>
            </div>
          </div>
        </div>

        {/* Mini cards */}
        {rest.map((person) => (
          <MiniPersonCard key={person.id} person={person} />
        ))}
      </div>

      {coverBioOpen && (
        <Suspense fallback={null}>
          <DeepBioModal person={cover} onClose={() => setCoverBioOpen(false)} />
        </Suspense>
      )}
    </section>
  );
}
