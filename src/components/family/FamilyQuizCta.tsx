'use client';

import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

/**
 * Quiz prompt at the bottom of a family page. Family pages are reached from
 * search, like profiles, so this is the step from reading about other
 * people's charts to entering your own. Tracked as `cta_click` so it can be
 * compared with the profile-page link (cta: profile_compare).
 */
export default function FamilyQuizCta({ slug }: { slug: string }) {
  return (
    <section className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
      <p className="text-sm font-medium text-gray-900">내 사주와 닮은 부자는 누구일까?</p>
      <p className="mt-1 text-[13px] text-gray-600 leading-relaxed">
        생년월일만 입력하면 나와 같은 일주를 가진 부자를 바로 찾아드려요.
      </p>
      <Link
        href="/"
        onClick={() => trackEvent('cta_click', { cta: 'family_quiz', family: slug })}
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-gray-700 hover:text-black"
      >
        내 사주 입력하기 →
      </Link>
    </section>
  );
}
