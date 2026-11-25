'use client';

import Link from 'next/link';
import { familiesForPerson } from '@/lib/families';
import { trackEvent } from '@/lib/analytics';
import { useLanguage } from '@/lib/i18n';

/**
 * On a family member's profile, a link to the family comparison page
 * ("삼성家 사주 비교"). Renders nothing for everyone else.
 */
export default function FamilyLink({ personId }: { personId: string }) {
  const { lang } = useLanguage();
  const families = familiesForPerson(personId);
  if (families.length === 0) return null;

  return (
    <section className="mt-12 space-y-2">
      {families.map((f) => (
        <Link
          key={f.slug}
          href={`/family/${f.slug}`}
          onClick={() =>
            trackEvent('cta_click', { cta: 'profile_family', person_id: personId, family: f.slug })
          }
          className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 px-4 py-3.5 hover:border-gray-300 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {lang === 'ko' ? `${f.name}家 사주 비교` : `Compare the ${f.name} family's charts`}
            </p>
            <p className="mt-0.5 text-[12px] text-gray-500">
              {lang === 'ko'
                ? `${f.members.length}명의 일주·격국을 한눈에`
                : `${f.members.length} family members side by side`}
            </p>
          </div>
          <span className="text-xs text-gray-500 shrink-0">{lang === 'ko' ? '보기 →' : 'View →'}</span>
        </Link>
      ))}
    </section>
  );
}
