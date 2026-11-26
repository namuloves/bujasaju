'use client';

import type { DeepBio } from '@/lib/deepBio';
import type { EnrichedPerson } from '@/lib/saju/types';
import { ko } from '@/components/deep-bio/DeepBioTabs';
import ExpandableBio from '@/components/profile/ExpandableBio';
import { formatNetWorth, netWorthAsOfLabel } from '@/components/profile/format';
import { rewriteUsdToKrwInline } from '@/lib/usdToKrw';
import Portrait from './Portrait';

interface Props {
  person: EnrichedPerson;
  bio: DeepBio | null;
  displayName: string;
  /** One-line "who is this" from the bio, when there is one. */
  knownFor: string | null;
  lang: string;
}

/**
 * Profile v2 hero. Three text sizes (name 24/30px, net worth 20px, body
 * 14px) and two text grays (gray-900 content, gray-500 labels/secondary).
 *
 * Top: name, English name, then 생일 · 일주 · 출생지 in one wrapping row and
 * 학력 on the row after. Below a divider: net worth, who they are, short
 * bio. On phones the photo sits beside the names and the rest runs full
 * width below.
 */
export default function ProfileHeroV2({ person, bio, displayName, knownFor, lang }: Props) {
  const isKo = lang === 'ko';
  const worthMeta = [isKo ? `$${person.netWorth}B` : null, netWorthAsOfLabel(bio, lang)]
    .filter(Boolean)
    .join(' · ');
  const whoLine = knownFor ?? (person.company && person.company !== person.industry ? person.company : null);

  return (
    <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[192px_1fr] gap-x-4 sm:gap-x-8 gap-y-5">
      <Portrait
        person={person}
        className="w-24 h-30 sm:w-48 sm:h-60 sm:row-span-2 rounded-lg overflow-hidden"
        textClass="text-2xl sm:text-4xl"
      />

      <div className="self-center sm:self-start sm:pt-1 min-w-0">
        <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 leading-tight break-keep">
          {displayName}
        </h1>
        {person.nameKo && (
          <p className="mt-1 text-sm text-gray-500">{isKo ? person.name : person.nameKo}</p>
        )}
        <div className="mt-3">
          <HeroFacts person={person} bio={bio} lang={lang} />
        </div>
      </div>

      <div className="col-span-2 sm:col-span-1 sm:col-start-2 min-w-0">
        <div className="border-t border-gray-200 pt-5">
          <div className="flex items-baseline gap-x-2 gap-y-1 flex-wrap">
            <span className="text-xl font-medium text-gray-900 whitespace-nowrap">
              {formatNetWorth(person.netWorth, isKo)}
            </span>
            <span className="text-sm text-gray-500">{worthMeta}</span>
          </div>

          {whoLine && (
            <p className="mt-3 text-sm text-gray-900 leading-relaxed">{whoLine}</p>
          )}

          {/* The short dataset bio mostly restates the one-line summary
              above, so it only shows when there is no summary. */}
          {person.bio && !knownFor && (
            <ExpandableBio
              text={isKo ? rewriteUsdToKrwInline(person.bioKo ?? person.bio, person.netWorth) : person.bio}
              lang={lang}
              className="mt-3"
              textClassName="text-sm text-gray-900 leading-relaxed text-left"
              buttonClassName="mt-1 -ml-2 h-11 px-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 transition-colors"
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** 생일 · 일주 · 출생지 as one row of label + value pairs (wraps on narrow
 *  screens), then 학력 on its own row — it is often a full sentence. */
function HeroFacts({ person, bio, lang }: { person: EnrichedPerson; bio: DeepBio | null; lang: string }) {
  const isKo = lang === 'ko';
  const rows: { label: string; value: string }[] = [
    {
      label: isKo ? (person.deathDate ? '생몰' : '생일') : (person.deathDate ? 'Lived' : 'Born'),
      value: person.birthday.replace(/-/g, '.') + (person.deathDate ? ` – ${person.deathDate.replace(/-/g, '.')}` : ''),
    },
  ];
  if (person.saju) {
    rows.push({ label: isKo ? '일주' : 'Day pillar', value: `${person.saju.ilju} 일주` });
  }
  if (bio?.childhood?.birthPlace) {
    rows.push({
      label: isKo ? '출생지' : 'Birthplace',
      value: ko(lang, bio.childhood.birthPlace, bio.childhood.birthPlaceKo),
    });
  }

  return (
    <dl className="text-sm">
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-1.5 min-w-0">
            <dt className="text-gray-500 shrink-0">{r.label}</dt>
            <dd className="text-gray-900">{r.value}</dd>
          </div>
        ))}
      </div>
      {bio?.childhood?.education && (
        <div className="mt-1.5 flex gap-1.5">
          <dt className="text-gray-500 shrink-0">{isKo ? '학력' : 'Education'}</dt>
          <dd className="text-gray-900 leading-relaxed">
            {ko(lang, bio.childhood.education, bio.childhood.educationKo)}
          </dd>
        </div>
      )}
    </dl>
  );
}
