'use client';

/**
 * Profile v2 — the structured saju reading, split out of DeepBioContent so
 * the v2 page can place it right under the chart, and the 대운 paragraphs
 * next to the 대운 strip.
 *
 * Same data and same copy as DeepBioContent's "사주와 부의 연결" block; the
 * differences are layout only: a real section heading, darker basis text,
 * and 대운 rows that stack on phones instead of squeezing the text column.
 */

import type { SajuConnection, SajuClaim, SajuDaeun } from '@/lib/deepBio';
import { DaeunPillarCells } from '@/components/deep-bio/DeepBioContent';

interface ReadingProps {
  sc: SajuConnection;
  lang: string;
}

export function SajuReadingV2({ sc, lang }: ReadingProps) {
  const claims: Array<{ label: string; claim?: SajuClaim }> = [
    { label: lang === 'ko' ? '조후' : 'Season', claim: sc.johuKo },
    { label: lang === 'ko' ? '구조' : 'Structure', claim: sc.structureKo },
    { label: lang === 'ko' ? '재물' : 'Wealth', claim: sc.wealthKo },
    { label: lang === 'ko' ? '리스크' : 'Risk', claim: sc.riskKo },
  ].filter((c) => c.claim?.textKo);

  if (claims.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-medium text-gray-900 mb-1">
        {lang === 'ko' ? '사주 풀이' : 'Saju reading'}
      </h2>
      <p className="text-xs text-gray-500 mb-5">
        {lang === 'ko'
          ? '회색 글씨는 각 문단이 근거로 삼은 사주 글자입니다.'
          : 'Gray text shows the chart characters each paragraph rests on.'}
      </p>
      <div className="space-y-6">
        {claims.map(({ label, claim }) => (
          <div key={label}>
            <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
              <span className="text-sm font-medium text-gray-900">{label}</span>
              {claim!.basis?.length > 0 && (
                <span className="text-xs text-gray-500">{claim!.basis.join(' · ')}</span>
              )}
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{claim!.textKo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface DaeunListProps {
  items: SajuDaeun[];
  lang: string;
}

/** 대운 paragraphs. Phones: pillars + ages on one row, text full width
 *  below. sm and up: pillars in a left column, text on the right. */
export function DaeunReadingList({ items, lang }: DaeunListProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="text-sm font-medium text-gray-900 mb-3">
        {lang === 'ko' ? '시기별 풀이' : 'Period by period'}
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((d, i) => (
          <div key={i} className="py-4 first:pt-0 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <div className="flex items-center gap-3 sm:block sm:w-[104px] sm:shrink-0">
              <DaeunPillarCells pillar={d.pillar} />
              <div className="text-xs text-gray-500 tabular-nums sm:mt-1">
                {d.range}
                {lang === 'ko' ? '세' : ''}
                {d.years ? (
                  <>
                    <span className="sm:hidden"> · </span>
                    <br className="hidden sm:block" />
                    {d.years}
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800 leading-relaxed">{d.textKo}</p>
              {d.linkedEvents && d.linkedEvents.length > 0 && (
                <p className="mt-1.5 text-xs text-gray-500">{d.linkedEvents.join(' · ')}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** First 대운 range in the reading → the start age the strip should use,
 *  so the strip and the paragraphs never disagree on the same page. */
export function startAgeFromReading(items: SajuDaeun[] | undefined): number | undefined {
  const first = items?.[0]?.range;
  if (!first) return undefined;
  let start = parseInt(first, 10);
  if (!Number.isFinite(start) || start < 0) return undefined;
  while (start > 10) start -= 10;
  return start;
}
