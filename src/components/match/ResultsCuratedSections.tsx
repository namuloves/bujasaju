'use client';

/**
 * ResultsCuratedSections — browsable themed shelves shown below the match
 * results. Reuses the existing CuratedSection component + CURATED_SECTIONS
 * config (from Browse tab) to give users something to click into after
 * they've seen their top match.
 *
 * Ordering logic:
 *  1. User's own 일간 section first (e.g. 갑목 부자 for a 갑 일간 user) —
 *     this is the strongest "also like you" signal.
 *  2. Broad-interest sections next — Korean chaebol + self-made, then tech.
 *     KR-first since the default market is Korean.
 *  3. Everything else hidden behind "더 많은 테마 보기" so the page doesn't
 *     become a 28-shelf wall.
 *
 * "더 보기 →" on each section navigates to the Browse tab with the filter
 * pre-applied.
 */

import { useMemo, useState } from 'react';
import type { EnrichedPerson, SajuResult } from '@/lib/saju/types';
import type { Filters } from '@/components/FilterPanel';
import CURATED_SECTIONS from '@/components/browse/curatedSections';
import CuratedSection from '@/components/browse/CuratedSection';

const CARDS_PER_SECTION = 6; // 1 cover + 5 minis = one full grid row

/**
 * Map of 일간 → curated section id. Aligned with curatedSections.ts —
 * if ids change there, they must stay in sync here.
 */
const ILGAN_TO_SECTION_ID: Record<string, string> = {
  갑: 'ilgan-gap',
  을: 'ilgan-eul',
  병: 'ilgan-byeong',
  정: 'ilgan-jeong',
  무: 'ilgan-mu',
  기: 'ilgan-gi',
  경: 'ilgan-gyeong',
  신: 'ilgan-sin',
  임: 'ilgan-im',
  계: 'ilgan-gye',
};

/**
 * Sections we always want visible by default (after the user's own 일간).
 * Ordered intentionally — first rows get more eyeballs.
 */
const DEFAULT_TOP_SECTION_IDS = [
  'kr-chaebol',
  'kr-newrich',
  'tech',
  'selfmade',
  'kr-celeb',
];

interface Props {
  me: SajuResult;
  people: EnrichedPerson[];
  /** IDs to filter OUT of curated sections (e.g. the featured person). */
  excludeIds?: Set<string>;
}

export default function ResultsCuratedSections({ me, people, excludeIds }: Props) {
  const [expanded, setExpanded] = useState(false);

  const { topSections, restSections } = useMemo(() => {
    const userIlganSectionId = ILGAN_TO_SECTION_ID[me.saju.day.stem];

    // Build an ordering: user's 일간 first, then default tops, then everything
    // else. De-duplicate as we go.
    const seen = new Set<string>();
    const orderedIds: string[] = [];
    const push = (id: string | undefined) => {
      if (!id) return;
      if (seen.has(id)) return;
      seen.add(id);
      orderedIds.push(id);
    };
    push(userIlganSectionId);
    DEFAULT_TOP_SECTION_IDS.forEach(push);
    CURATED_SECTIONS.forEach((c) => push(c.id));

    // Compute each section's people once.
    const sectionsById = new Map(CURATED_SECTIONS.map((c) => [c.id, c]));
    const filtered = (excludeIds && excludeIds.size > 0)
      ? people.filter((p) => !excludeIds.has(p.id))
      : people;

    const built = orderedIds
      .map((id) => sectionsById.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((config) => {
        const inSection = filtered.filter(config.filter);
        const sorted = [...inSection].sort((a, b) => b.netWorth - a.netWorth);
        return {
          config,
          people: sorted.slice(0, CARDS_PER_SECTION),
          total: inSection.length,
        };
      })
      // Drop empty sections (e.g. user's 일간 has 0 billionaires matching —
      // shouldn't happen with 3K+ people but be defensive).
      .filter((s) => s.people.length > 0);

    // First 4 are "top" (user 일간 + next 3 broad), rest are behind expand.
    const topCount = 4;
    return {
      topSections: built.slice(0, topCount),
      restSections: built.slice(topCount),
    };
  }, [me, people, excludeIds]);

  const handleApplyFilter = (partial: Partial<Filters>) => {
    // Navigate to Browse tab with filters in URL. BrowseTab reads filters
    // from URL on mount, so this arrives pre-filtered. We use a full
    // navigation (assign) rather than pushState because Home() doesn't
    // subscribe to popstate to flip tabs — simpler to just navigate and
    // let the Browse bundle lazy-load.
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'browse');
    for (const [key, value] of Object.entries(partial)) {
      if (value) url.searchParams.set(key, String(value));
      else url.searchParams.delete(key);
    }
    window.location.assign(url.toString());
  };

  if (topSections.length === 0) return null;

  return (
    <section className="space-y-10">
      <div className="flex items-baseline gap-2">
        <span className="text-xl">🔎</span>
        <h2 className="text-base font-bold text-gray-900">
          다른 부자들도 둘러보세요
        </h2>
      </div>

      {topSections.map(({ config, people: sectionPeople, total }) => (
        <CuratedSection
          key={config.id}
          config={config}
          people={sectionPeople}
          totalInSection={total}
          onShowMore={
            config.applyFilter
              ? () => handleApplyFilter(config.applyFilter!)
              : null
          }
        />
      ))}

      {restSections.length > 0 && !expanded && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg px-5 py-2.5 transition-colors"
          >
            더 많은 테마 보기 ({restSections.length})
          </button>
        </div>
      )}

      {expanded && restSections.map(({ config, people: sectionPeople, total }) => (
        <CuratedSection
          key={config.id}
          config={config}
          people={sectionPeople}
          totalInSection={total}
          onShowMore={
            config.applyFilter
              ? () => handleApplyFilter(config.applyFilter!)
              : null
          }
        />
      ))}
    </section>
  );
}
