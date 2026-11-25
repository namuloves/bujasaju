import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CleanNav from '@/components/browse-clean/CleanNav';
import FamilyQuizCta from '@/components/family/FamilyQuizCta';
import { FAMILIES, getFamily, type Family } from '@/lib/families';
import { getEnrichedPersonById } from '@/lib/data/enriched-server';
import { OHAENG_COLORS, STEM_TO_OHAENG } from '@/lib/saju/constants';
import type { CheonGan, EnrichedPerson, OHaeng } from '@/lib/saju/types';

/**
 * /family/[slug] — one Korean business family's saju side by side.
 * See src/lib/families.ts for why these pages exist and who is on them.
 *
 * Statically generated for the slugs in FAMILIES; anything else 404s.
 * Not metered: it shows each member's chart summary only, and every name
 * links to the (metered) full profile.
 */

interface Props {
  params: Promise<{ slug: string }>;
}

const SITE_URL = 'https://bujasaju.com';

export const dynamicParams = false;

export function generateStaticParams() {
  return FAMILIES.map((f) => ({ slug: f.slug }));
}

interface Row {
  person: EnrichedPerson;
  relation: string;
  name: string;
  ilgan: CheonGan;
  ohaeng: OHaeng;
}

function rowsFor(family: Family): Row[] {
  return family.members.flatMap((m) => {
    const person = getEnrichedPersonById(m.id);
    if (!person?.saju) return [];
    const ilgan = person.saju.saju.day.stem;
    return [
      {
        person,
        relation: m.relation,
        name: person.commonNameKo ?? person.nameKo ?? person.name,
        ilgan,
        ohaeng: STEM_TO_OHAENG[ilgan],
      },
    ];
  });
}

function groupsOf(rows: Row[], key: (r: Row) => string): [string, Row[]][] {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    const k = key(r);
    map.set(k, [...(map.get(k) ?? []), r]);
  }
  return [...map.entries()]
    .filter(([, rs]) => rs.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
}

const joinNames = (rs: Row[]) => rs.map((r) => r.name).join('·');

/**
 * What family members share — the part a visitor can't see by opening
 * profiles one at a time. Same 일주 first (1-in-60 odds, and it implies the
 * same 일간), with the 격국 folded in when that matches too; then 격국 and
 * 일간 groups not already covered. Written "A·B — 같은 X" so no particle has
 * to agree with a name.
 */
function sharedTraits(rows: Row[]): string[] {
  const out: string[] = [];
  const setKey = (rs: Row[]) => rs.map((r) => r.person.id).sort().join(',');
  const iljuSets = new Set<string>();
  for (const [ilju, rs] of groupsOf(rows, (r) => r.person.saju.ilju)) {
    const g = rs[0].person.saju.gyeokguk;
    const sameGyeokguk = rs.every((r) => r.person.saju.gyeokguk === g);
    out.push(`${joinNames(rs)} — 같은 ${ilju} 일주${sameGyeokguk ? ` · ${g}` : ''}`);
    iljuSets.add(setKey(rs));
  }
  for (const [gyeokguk, rs] of groupsOf(rows, (r) => r.person.saju.gyeokguk)) {
    if (iljuSets.has(setKey(rs))) continue;
    out.push(`${joinNames(rs)} — 같은 ${gyeokguk}`);
  }
  for (const [ilgan, rs] of groupsOf(rows, (r) => r.ilgan)) {
    if (iljuSets.has(setKey(rs))) continue;
    out.push(`${joinNames(rs)} — 같은 ${ilgan}${STEM_TO_OHAENG[ilgan as CheonGan]} 일간`);
  }
  return out.slice(0, 4);
}

function ohaengCounts(rows: Row[]): [OHaeng, number][] {
  const order: OHaeng[] = ['목', '화', '토', '금', '수'];
  return order
    .map((o) => [o, rows.filter((r) => r.ohaeng === o).length] as [OHaeng, number])
    .filter(([, n]) => n > 0);
}

function photo(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=160&background=f3f4f6&color=9ca3af`;
  }
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const family = getFamily(slug);
  if (!family) return { title: '가문을 찾을 수 없습니다 | 부자사주' };

  const rows = rowsFor(family);
  // "삼성가 사주" is how it is typed into a search box; the page itself
  // uses 家.
  const title = `${family.name}가 사주 비교 — ${family.titleNames.join('·')} | 부자사주`;
  const firstShared = sharedTraits(rows)[0];
  const description = firstShared ? `${family.intro} ${firstShared}.` : family.intro;
  const keywords = [
    `${family.name}가 사주`,
    `${family.name} 일가 사주`,
    ...rows.map((r) => `${r.name} 사주`),
    '재벌 사주',
    '부자 사주',
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: `/family/${slug}` },
    openGraph: { title, description, url: `/family/${slug}`, type: 'article' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function FamilyPage({ params }: Props) {
  const { slug } = await params;
  const family = getFamily(slug);
  if (!family) notFound();

  const rows = rowsFor(family);
  const shared = sharedTraits(rows);
  const counts = ohaengCounts(rows);
  const others = [
    ...(family.related ?? []).map(getFamily).filter((f): f is Family => !!f),
    ...FAMILIES.filter((f) => f.slug !== slug && !(family.related ?? []).includes(f.slug)),
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${family.name}家 사주`,
    itemListElement: rows.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: r.name,
      url: `${SITE_URL}/profile/${r.person.id}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CleanNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-10 pb-16">
        <nav className="text-xs text-gray-400">
          <Link href="/family" className="hover:text-gray-700">
            재벌가 사주
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-gray-500">{family.name}家</span>
        </nav>

        <h1 className="mt-3 text-2xl sm:text-3xl font-medium tracking-tight text-gray-900">
          {family.name}家 사주
        </h1>
        <p className="mt-3 text-[15px] leading-7 text-gray-600">{family.intro}</p>

        {(shared.length > 0 || counts.length > 0) && (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-4 sm:px-5">
            {shared.length > 0 && (
              <ul className="space-y-1.5 text-sm text-gray-700">
                {shared.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
            {counts.length > 0 && (
              <div className={`flex flex-wrap items-center gap-1.5 ${shared.length > 0 ? 'mt-3' : ''}`}>
                <span className="text-xs text-gray-500 mr-1">일간 오행</span>
                {counts.map(([o, n]) => (
                  <span
                    key={o}
                    className={`rounded-full border px-2 py-0.5 text-xs ${OHAENG_COLORS[o].bg} ${OHAENG_COLORS[o].text} ${OHAENG_COLORS[o].border}`}
                  >
                    {o} {n}명
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-900">가족 구성원</h2>
          <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows.map((r) => (
              <li key={r.person.id}>
                <Link
                  href={`/profile/${r.person.id}`}
                  className="flex gap-3 rounded-2xl border border-gray-200 p-3 hover:border-gray-300 transition-colors"
                >
                  <div className="w-16 h-20 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={photo(r.person.photoUrl, r.person.name)}
                      alt={r.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-gray-900">{r.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-5">{r.relation}</p>
                    <p className="mt-1.5 text-xs text-gray-700">
                      {r.person.saju.ilju} 일주 · {r.person.saju.gyeokguk}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-medium text-gray-900">사주 한눈에 비교</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">이름</th>
                  <th className="px-3 py-2 text-left font-normal">일간</th>
                  <th className="px-3 py-2 text-left font-normal">일주</th>
                  <th className="px-3 py-2 text-left font-normal">월지</th>
                  <th className="px-3 py-2 text-left font-normal">격국</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {rows.map((r) => (
                  <tr key={r.person.id}>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link href={`/profile/${r.person.id}`} className="hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {r.ilgan}
                      {r.ohaeng}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.person.saju.ilju}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.person.saju.wolji}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.person.saju.gyeokguk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <FamilyQuizCta slug={family.slug} />

        {others.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-medium text-gray-900">다른 가문 사주</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map((f) => (
                <Link
                  key={f.slug}
                  href={`/family/${f.slug}`}
                  className="rounded-full border border-gray-200 px-3 py-1.5 text-[13px] text-gray-700 hover:border-gray-300 hover:text-gray-900"
                >
                  {f.name}家
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
