'use client';

import type { EnrichedPerson } from '@/lib/saju/types';
import type { CuratedSectionConfig } from '@/components/browse/curatedSections';
import { useLanguage } from '@/lib/i18n';
import CleanMiniCard from './CleanMiniCard';

interface Props {
  config: CuratedSectionConfig;
  people: EnrichedPerson[];
  totalInSection: number;
  onShowMore: (() => void) | null;
}

export default function CleanSection({ config, people, totalInSection, onShowMore }: Props) {
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  if (people.length === 0) return null;

  const label = isKo ? config.labelKo : config.labelEn;
  const description = isKo ? config.descriptionKo : config.descriptionEn;
  const moreLabel = isKo ? `전체 ${totalInSection}명 보기` : `View all ${totalInSection} →`;

  return (
    <section className="mb-12">
      <header className="mb-6">
        <h2 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-gray-900 leading-tight">
          {label}
        </h2>
        {/* Description on the left, "전체 N명 보기" on the right, on the same line. */}
        <div className="flex items-baseline justify-between gap-4 mt-1.5">
          <p className="text-[14px] text-gray-500 leading-relaxed max-w-2xl">
            {description || ' '}
          </p>
          {onShowMore && (
            <button
              type="button"
              onClick={onShowMore}
              className="text-[13px] text-gray-500 hover:text-gray-900 border-b border-transparent hover:border-gray-900 transition-colors whitespace-nowrap shrink-0"
            >
              {moreLabel}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
        {people.map((person) => (
          <CleanMiniCard key={person.id} person={person} />
        ))}
      </div>
    </section>
  );
}
