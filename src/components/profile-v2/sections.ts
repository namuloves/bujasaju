/**
 * Profile v2 section ids — shared by the page (which puts them on the
 * sections) and the left-margin nav (which jumps to them), so the two
 * can't drift apart.
 *
 * `overview`, `timeline`, `failures` and `sources` are rendered by
 * DeepBioContent; the rest by the v2 page.
 */

import type { SectionNavItem } from './SectionNavV2';

export const SECTION = {
  saju: 'saju',
  reading: 'reading',
  daeun: 'daeun',
  background: 'background',
  overview: 'overview',
  timeline: 'timeline',
  failures: 'failures',
  sources: 'sources',
  related: 'related',
} as const;

/** Nav labels in page order. Module-level so the nav gets stable arrays.
 *  The nav only shows the ones that rendered for the current person. */
export const NAV_ITEMS: Record<'ko' | 'en', SectionNavItem[]> = {
  ko: [
    { id: SECTION.saju, label: '사주' },
    { id: SECTION.reading, label: '사주 풀이' },
    { id: SECTION.daeun, label: '대운' },
    { id: SECTION.background, label: '배경' },
    { id: SECTION.overview, label: '인물' },
    { id: SECTION.timeline, label: '타임라인' },
    { id: SECTION.failures, label: '실패와 교훈' },
    { id: SECTION.sources, label: '출처' },
    { id: SECTION.related, label: '비슷한 부자' },
  ],
  en: [
    { id: SECTION.saju, label: 'Saju' },
    { id: SECTION.reading, label: 'Reading' },
    { id: SECTION.daeun, label: 'Luck cycles' },
    { id: SECTION.background, label: 'Background' },
    { id: SECTION.overview, label: 'Character' },
    { id: SECTION.timeline, label: 'Timeline' },
    { id: SECTION.failures, label: 'Setbacks' },
    { id: SECTION.sources, label: 'Sources' },
    { id: SECTION.related, label: 'Similar people' },
  ],
};
