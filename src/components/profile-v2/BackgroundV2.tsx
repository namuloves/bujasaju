'use client';

import type { DeepBio } from '@/lib/deepBio';
import type { EnrichedPerson } from '@/lib/saju/types';
import { ko } from '@/components/deep-bio/DeepBioTabs';

interface Props {
  person: EnrichedPerson;
  bio: DeepBio | null;
  lang: string;
  id?: string;
}

const WEALTH_ORIGIN_KO: Record<NonNullable<EnrichedPerson['wealthOrigin']>, string> = {
  'self-made': '자수성가',
  inherited: '상속',
  mixed: '상속 후 성장',
};

/** 집안 and 부의 출처 — the background facts not already in the hero
 *  (birthplace and education are up there). Renders nothing when empty. */
export default function BackgroundV2({ person, bio, lang, id }: Props) {
  const isKo = lang === 'ko';
  const rows: { label: string; value: string }[] = [];
  if (bio?.childhood?.familyBackground) {
    rows.push({
      label: isKo ? '집안' : 'Family',
      value: ko(lang, bio.childhood.familyBackground, bio.childhood.familyBackgroundKo),
    });
  }
  if (person.wealthOrigin) {
    rows.push({
      label: isKo ? '부의 출처' : 'Source',
      value: isKo ? WEALTH_ORIGIN_KO[person.wealthOrigin] : person.wealthOrigin,
    });
  }
  if (rows.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-20 mt-10">
      <h2 className="text-base font-medium text-gray-900 mb-3">{isKo ? '배경' : 'Background'}</h2>
      <dl className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-3 px-4 py-3">
            <dt className="text-xs text-gray-500 font-medium w-16 shrink-0 pt-0.5">{r.label}</dt>
            <dd className="text-sm text-gray-800 leading-relaxed flex-1">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
