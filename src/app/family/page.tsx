import type { Metadata } from 'next';
import Link from 'next/link';
import CleanNav from '@/components/browse-clean/CleanNav';
import { FAMILIES } from '@/lib/families';
import { getEnrichedPersonById } from '@/lib/data/enriched-server';

/** /family — index of the family comparison pages (see src/lib/families.ts). */

export const metadata: Metadata = {
  title: '재벌가 사주 비교 — 삼성·현대·LG·SK·신세계 | 부자사주',
  description:
    '삼성·범현대·LG·신세계·한화·SK 등 한국 재벌가 일가의 일주와 격국을 가문별로 나란히 비교해요.',
  alternates: { canonical: '/family' },
};

export default function FamilyIndexPage() {
  return (
    <>
      <CleanNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-gray-900">
          재벌가 사주
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-gray-600">
          창업주부터 지금의 총수까지, 한 집안 사람들의 사주는 얼마나 닮았을까요? 가문별로
          일주와 격국을 나란히 비교해요.
        </p>

        <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FAMILIES.map((f) => {
            const names = f.members
              .map((m) => {
                const p = getEnrichedPersonById(m.id);
                return p ? (p.commonNameKo ?? p.nameKo ?? p.name) : null;
              })
              .filter((n): n is string => !!n);
            return (
              <li key={f.slug}>
                <Link
                  href={`/family/${f.slug}`}
                  className="block rounded-2xl border border-gray-200 px-4 py-4 hover:border-gray-300 transition-colors"
                >
                  <p className="text-[15px] font-medium text-gray-900">
                    {f.name}家 <span className="text-xs font-normal text-gray-400">{names.length}명</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500 leading-5">{names.join(' · ')}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
