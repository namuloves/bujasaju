'use client';

import Link from 'next/link';
import type { EnrichedPerson } from '@/lib/saju/types';
import { useLanguage } from '@/lib/i18n';
import { industryToKorean } from '@/components/FilterPanel';

/**
 * "Where next" for a visitor who landed on a profile from a search or a
 * news link. Two rows, each capped at six, richest first:
 *
 *   같은 일주 — the saju hook. 1-in-60 odds, so it reads as a real link
 *              between strangers and is the thing this site has that a
 *              news article doesn't.
 *   같은 분야 — the obvious next click for someone who came for the
 *              person, not the chart (other team owners, other founders).
 *
 * Rows that come up empty (no one else shares the ilju, or the industry
 * is a category of one) are skipped rather than padded.
 */

const USD_TO_KRW = 1480.71;

function worthShort(netWorthB: number, isKo: boolean): string {
  if (isKo) {
    const eok = netWorthB * 10 * USD_TO_KRW;
    const jo = eok / 10000;
    if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
    return `${Math.round(eok).toLocaleString('ko-KR')}억`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

function photo(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=160&background=f3f4f6&color=9ca3af&bold=true`;
  }
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

function pick(
  people: EnrichedPerson[],
  self: EnrichedPerson,
  pred: (p: EnrichedPerson) => boolean,
  limit = 6,
): EnrichedPerson[] {
  return people
    .filter((p) => p.id !== self.id && pred(p))
    .sort((a, b) => b.netWorth - a.netWorth)
    .slice(0, limit);
}

interface Props {
  person: EnrichedPerson;
  people: EnrichedPerson[];
}

export default function RelatedPeople({ person, people }: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  const sameIlju = person.saju
    ? pick(people, person, (p) => p.saju?.ilju === person.saju.ilju)
    : [];
  const sameIndustry = pick(people, person, (p) => p.industry === person.industry);

  if (sameIlju.length === 0 && sameIndustry.length === 0) return null;

  const industryLabel = isKo ? industryToKorean(person.industry) : person.industry;

  return (
    <section className="mt-12 space-y-8">
      {sameIlju.length > 0 && (
        <Row
          title={isKo ? `같은 ${person.saju.ilju} 일주 부자` : `Also ${person.saju.ilju} day pillar`}
          hint={
            isKo
              ? '일주가 같을 확률은 60분의 1 — 기질의 뼈대를 공유하는 사람들'
              : '1-in-60 odds — people who share the same core temperament'
          }
          href={`/?tab=browse&ilju=${encodeURIComponent(person.saju.ilju)}`}
          people={sameIlju}
          isKo={isKo}
        />
      )}
      {sameIndustry.length > 0 && (
        <Row
          title={isKo ? `${industryLabel} 분야의 다른 부자` : `Others in ${industryLabel}`}
          href={`/?tab=browse&industry=${encodeURIComponent(person.industry)}`}
          people={sameIndustry}
          isKo={isKo}
        />
      )}
    </section>
  );
}

function Row({
  title,
  hint,
  href,
  people,
  isKo,
}: {
  title: string;
  hint?: string;
  href: string;
  people: EnrichedPerson[];
  isKo: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
          {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
        </div>
        <Link href={href} className="text-xs text-gray-500 hover:text-gray-900 shrink-0">
          {isKo ? '더 보기 →' : 'See all →'}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1">
        {people.map((p) => {
          const name = isKo ? (p.nameKo ?? p.name) : p.name;
          return (
            <Link
              key={p.id}
              href={`/profile/${p.id}`}
              className="shrink-0 w-[112px] group"
            >
              <div className="w-[112px] h-[140px] rounded-xl overflow-hidden bg-gray-100">
                <img
                  src={photo(p.photoUrl, p.name)}
                  alt={p.name}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = photo(null, p.name);
                  }}
                />
              </div>
              <div className="mt-1.5 text-[13px] font-semibold text-gray-900 truncate">{name}</div>
              <div className="text-[11px] text-gray-500 truncate">
                {worthShort(p.netWorth, isKo)}
                {p.saju && ` · ${p.saju.ilju}`}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
