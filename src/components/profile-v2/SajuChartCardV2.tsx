'use client';

import type { CheonGan, EnrichedPerson } from '@/lib/saju/types';
import { HeroPillar } from '@/components/match/SajuHero';

interface Props {
  person: EnrichedPerson;
  displayName: string;
  /** Show the four pillars. Off for quiz-takers, who see this chart inside
   *  the comparison card instead. */
  showChart: boolean;
  /** One-line summary from the reading, shown beside the chart on desktop. */
  oneLine?: string;
  lang: string;
  id?: string;
}

/** White chart card. With a one-line reading it becomes two columns on
 *  desktop (chart | summary); without one the chart sits centered. */
export default function SajuChartCardV2({ person, displayName, showChart, oneLine, lang, id }: Props) {
  if (!person.saju || (!showChart && !oneLine)) return null;
  const { saju } = person;
  const ilgan = saju.saju.day.stem as CheonGan;

  return (
    <section id={id} className="scroll-mt-20 mt-6 rounded-2xl bg-white border border-gray-200 px-4 sm:px-6 py-5 sm:py-6">
      <div className={showChart && oneLine ? 'grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10' : ''}>
        {showChart && (
          <div className={oneLine ? '' : 'max-w-md mx-auto'}>
            <h2 className="text-sm font-medium text-gray-900 mb-4 text-center">
              {lang === 'ko' ? `${displayName}의 사주` : `${displayName}'s Saju`}
            </h2>
            <div className="flex justify-center gap-2 sm:gap-2.5">
              <HeroPillar label="時" ju={saju.saju.hour} ilgan={ilgan} />
              <HeroPillar label="日" ju={saju.saju.day} ilgan={ilgan} isDayPillar />
              <HeroPillar label="月" ju={saju.saju.month} ilgan={ilgan} />
              <HeroPillar label="年" ju={saju.saju.year} ilgan={ilgan} />
            </div>
            <p className="text-[12px] text-gray-600 text-center mt-3">
              {saju.ilju}일주 · {saju.wolji}월지 · {saju.gyeokguk}
            </p>
            {!saju.saju.hour && (
              <p className="text-[11px] text-gray-500 text-center mt-1">
                {lang === 'ko'
                  ? '출생 시각이 공개되지 않아 시주(時柱)는 제외했습니다.'
                  : 'Birth time is not public, so the hour pillar is omitted.'}
              </p>
            )}
          </div>
        )}
        {oneLine && (
          <div className={showChart ? 'md:border-l md:border-gray-100 md:pl-10' : ''}>
            <p className="text-xs text-gray-500 mb-2">{lang === 'ko' ? '한 줄 풀이' : 'In one line'}</p>
            <p className="text-base sm:text-lg text-gray-900 leading-relaxed">{oneLine}</p>
          </div>
        )}
      </div>
    </section>
  );
}
