/**
 * Curated chip presets for the clean browse page.
 *
 * Each preset is an *editorial entry point*, not a raw facet — see the research
 * notes in /lazyweb/design-improve/. A preset can either:
 *  - apply a slice of the standard `Filters` shape, or
 *  - apply a `customPredicate` that runs over the people list directly
 *    (used for MZ cohort, hidden-gems, deficient-element rotations, etc.)
 *
 * Only ONE preset may be active at a time — tapping a second replaces the first
 * (Robinhood-style preset screeners). This is different from filter chips,
 * which would toggle independently.
 */

import type { EnrichedPerson, OHaeng } from '@/lib/saju/types';
import type { Filters } from '@/components/FilterPanel';
import { isMissingOhaeng } from '@/components/browse/curatedSections';

export type PresetId =
  | 'self-made'
  | 'women'
  | 'mz'
  | 'same-ilju'
  | 'missing-hwa'
  | 'gyeokguk-siksin'
  | 'kr'
  | 'hidden-gems';

export interface ChipPreset {
  id: PresetId;
  /** Label rendered on the chip. */
  labelKo: string;
  labelEn: string;
  /** Optional colored dot (used for 오행 chips to teach vocabulary). */
  dotColor?: string;
  /** Optional emoji glyph. */
  emoji?: string;
  /** Optional inline tooltip explainer — used for jargon-heavy presets. */
  tooltipKo?: string;
  tooltipEn?: string;
  /** When set, the chip renders disabled — used for "coming soon" features. */
  disabled?: boolean;
  /**
   * Editorial section title that replaces the default "필터 결과" heading
   * when this preset is active. Keeps the result page feeling curated.
   */
  resultTitleKo: string;
  resultTitleEn: string;
  /** One-line subtitle under the result title. */
  resultBlurbKo: string;
  resultBlurbEn: string;
  /** Standard filter patch (overlaid on default filters). */
  patch?: Partial<Filters>;
  /** Custom predicate run after standard filtering. */
  customPredicate?: (person: EnrichedPerson) => boolean;
  /** Optional custom sort applied after filtering. */
  customSort?: (a: EnrichedPerson, b: EnrichedPerson) => number;
}

/** Threshold dividing MZ generation (born 1981+). */
const MZ_BIRTH_YEAR_THRESHOLD = 1981;

function birthYear(p: EnrichedPerson): number {
  const y = Number((p.birthday ?? '').slice(0, 4));
  return Number.isFinite(y) ? y : 0;
}

export const CHIP_PRESETS: ChipPreset[] = [
  {
    id: 'self-made',
    labelKo: '자수성가',
    labelEn: 'Self-made',
    resultTitleKo: '자수성가 부자',
    resultTitleEn: 'Self-made billionaires',
    resultBlurbKo: '맨손으로 부를 일군 사람들',
    resultBlurbEn: 'Built their wealth from scratch',
    patch: { wealthOrigin: 'self-made' },
  },
  {
    id: 'women',
    labelKo: '여성 부자',
    labelEn: 'Women billionaires',
    resultTitleKo: '여성 부자',
    resultTitleEn: 'Women billionaires',
    resultBlurbKo: '세계에서 가장 부유한 여성들',
    resultBlurbEn: "The world's wealthiest women",
    patch: { gender: 'F' },
  },
  {
    id: 'mz',
    labelKo: 'MZ 부자',
    labelEn: 'Gen MZ',
    resultTitleKo: 'MZ 세대 부자',
    resultTitleEn: 'Gen MZ billionaires',
    resultBlurbKo: '1981년 이후 태어난 젊은 부자들',
    resultBlurbEn: 'Billionaires born 1981 or later',
    customPredicate: (p) => birthYear(p) >= MZ_BIRTH_YEAR_THRESHOLD,
  },
  {
    id: 'same-ilju',
    labelKo: '나와 같은 일주',
    labelEn: 'My day pillar',
    tooltipKo: '내 사주를 등록하면 같은 일주를 가진 부자들을 볼 수 있어요. 곧 출시!',
    tooltipEn: 'Save your saju to find billionaires sharing your day pillar. Coming soon.',
    disabled: true,
    resultTitleKo: '나와 같은 일주',
    resultTitleEn: 'Same day pillar as you',
    resultBlurbKo: '곧 출시 예정',
    resultBlurbEn: 'Coming soon',
  },
  {
    id: 'missing-hwa',
    labelKo: '화 火 부족',
    labelEn: 'Missing Fire 火',
    dotColor: '#dc2626',
    tooltipKo: '오행 중 화(火)가 사주에 없는 사람들. 그 기운을 가진 사람과 잘 맞는다고 봐요.',
    tooltipEn: 'People without the Fire element in their saju — said to be drawn to those who carry it.',
    resultTitleKo: '화 火가 부족한 부자',
    resultTitleEn: 'Billionaires without Fire 火',
    resultBlurbKo: '오행 중 화의 기운이 사주에 없는 부자들',
    resultBlurbEn: 'Billionaires whose four pillars lack the Fire element',
    customPredicate: (p) => isMissingOhaeng(p, '화' as OHaeng),
  },
  {
    id: 'gyeokguk-siksin',
    labelKo: '식신격',
    labelEn: 'Siksin-gyeok',
    tooltipKo: '먹고 누리는 복이 두터운 격국. 창의력과 풍요로움의 기질.',
    tooltipEn: 'A pattern said to bring abundance, creativity, and ease of living.',
    resultTitleKo: '식신격 부자',
    resultTitleEn: 'Siksin-gyeok billionaires',
    resultBlurbKo: '풍요와 창의의 격국을 타고난 부자들',
    resultBlurbEn: 'Billionaires born under the abundance pattern',
    patch: { gyeokguk: '식신격' },
  },
  {
    id: 'kr',
    labelKo: '🇰🇷 한국 부자',
    labelEn: '🇰🇷 Korean billionaires',
    resultTitleKo: '한국의 부자',
    resultTitleEn: 'Korean billionaires',
    resultBlurbKo: '대한민국 국적의 부자들',
    resultBlurbEn: 'Billionaires of Korean nationality',
    patch: { nationality: 'KR' },
  },
  {
    id: 'hidden-gems',
    labelKo: '숨은 보석',
    labelEn: 'Hidden gems',
    tooltipKo: '잘 알려지지 않았지만 흥미로운 사주를 가진 부자들.',
    tooltipEn: 'Less famous billionaires with intriguing four-pillars stories.',
    resultTitleKo: '숨은 보석',
    resultTitleEn: 'Hidden gems',
    resultBlurbKo: '랭킹은 낮지만 흥미로운 부자들',
    resultBlurbEn: 'Lower-ranked names worth a second look',
    // Pick from the long tail (rank > 300) — sorted lower-net-worth first to
    // surface names the user almost certainly hasn't seen.
    customPredicate: (p) => p.netWorth > 0 && p.netWorth < 5,
    customSort: (a, b) => a.netWorth - b.netWorth,
  },
];

export function findPreset(id: PresetId | null): ChipPreset | null {
  if (!id) return null;
  return CHIP_PRESETS.find((p) => p.id === id) ?? null;
}
