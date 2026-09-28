import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getEnrichedPersonById } from '@/lib/data/enriched-server';
import { getDeepBioV2ById } from '@/lib/data/deep-bio-server';
import { hasStructuredReading } from '@/lib/deepBio';
import {
  UNLOCK_COOKIE,
  VIEWS_COOKIE,
  evaluateAccess,
  parseViewedIds,
} from '@/lib/paywall';
import ProfileWall from '@/components/paywall/ProfileWall';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

const SITE_URL = 'https://bujasaju.com';

function normalizePhotoForSchema(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const person = getEnrichedPersonById(id);

  if (!person) {
    return { title: '인물을 찾을 수 없습니다 | 부자사주' };
  }

  const displayName = person.nameKo || person.name;
  const bio = getDeepBioV2ById(id);
  const aliases = person.aliasesKo ?? bio?.aliasesKo ?? [];

  // Title carries the press spelling when there is one, so a query on
  // "아르테 모레노" matches the title and not just a body the crawler may
  // never render. Kept to the first alias — titles get clipped ~60 chars.
  const title = aliases[0]
    ? `${displayName}(${aliases[0]}) 사주 분석 | 부자사주`
    : `${displayName}의 사주 분석 | 부자사주`;

  // Description: lead with the chart, because "경신 일주 · 건록격" is what a
  // saju reader is searching for and what no news article has; then the
  // reading's one-line hook when a hand-written one exists, else the
  // Korean bio. The Forbes fallback is last — "852위에 올랐다" tells a
  // visitor nothing they came for.
  const chartLead = person.saju
    ? `${person.saju.ilju} 일주 · ${person.saju.gyeokguk}`
    : null;
  const sc = bio?.sajuConnection;
  const body =
    (hasStructuredReading(sc) && sc?.oneLineKo) ||
    person.bioKo ||
    bio?.personalTraits?.knownForKo ||
    person.bio ||
    `${displayName} - ${person.industry}, 순자산 $${person.netWorth}B`;
  const description = chartLead ? `${chartLead}. ${body}` : body;
  const truncatedDesc = description.length > 160 ? description.slice(0, 157) + '...' : description;

  const photoUrl = normalizePhotoForSchema(person.photoUrl);

  const keywords = [
    displayName,
    ...aliases,
    person.name,
    `${displayName} 사주`,
    ...aliases.map((a) => `${a} 사주`),
    ...(person.saju ? [`${person.saju.ilju} 일주`, person.saju.gyeokguk] : []),
    '부자 사주',
  ].filter((k): k is string => !!k);

  return {
    title,
    description: truncatedDesc,
    keywords,
    alternates: {
      canonical: `/profile/${id}`,
    },
    openGraph: {
      title,
      description: truncatedDesc,
      url: `/profile/${id}`,
      type: 'article',
      ...(photoUrl ? { images: [{ url: photoUrl, alt: person.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: truncatedDesc,
      ...(photoUrl ? { images: [photoUrl] } : {}),
    },
  };
}

export default async function ProfileLayout({ params, children }: Props) {
  const { id } = await params;
  const person = getEnrichedPersonById(id);

  // Person JSON-LD — helps Google/Bing understand the page is about a specific
  // real person. Enables richer snippets (photo + birthday + occupation).
  const bio = person ? getDeepBioV2ById(id) : null;
  const alternateNames = person
    ? [person.nameKo, ...(person.aliasesKo ?? bio?.aliasesKo ?? [])].filter(
        (n): n is string => !!n,
      )
    : [];
  const jsonLd = person
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: person.name,
        ...(alternateNames.length
          ? { alternateName: alternateNames.length === 1 ? alternateNames[0] : alternateNames }
          : {}),
        url: `${SITE_URL}/profile/${id}`,
        ...(normalizePhotoForSchema(person.photoUrl)
          ? { image: normalizePhotoForSchema(person.photoUrl) }
          : {}),
        ...(person.birthday ? { birthDate: person.birthday } : {}),
        ...(person.deathDate ? { deathDate: person.deathDate } : {}),
        ...(person.nationality ? { nationality: person.nationality } : {}),
        ...(person.industry ? { jobTitle: person.industry } : {}),
        ...(person.source
          ? { worksFor: { '@type': 'Organization', name: person.source } }
          : {}),
        ...(person.bio || person.bioKo
          ? { description: person.bioKo || person.bio }
          : {}),
      }
    : null;

  // Metered access. Evaluated on the server so it can't be bypassed by
  // disabling JS — the walled profile's content is never sent to the client.
  //
  // The quota applies to crawlers too (Google's "flexible sampling"): serving
  // bots unlimited pages while walling humans is cloaking. Googlebot indexes
  // the free sample, and the JSON-LD below is emitted either way so a walled
  // page still carries its structured data.
  //
  // NOTE: the cookie can only be *written* in a Route Handler or Server
  // Action, not while rendering. The counter is therefore advanced by
  // proxy.ts on navigation; here we only read it and decide.
  const cookieStore = await cookies();
  const unlocked = cookieStore.get(UNLOCK_COOKIE)?.value === '1';
  const viewedIds = parseViewedIds(cookieStore.get(VIEWS_COOKIE)?.value);
  const { allowed } = evaluateAccess({ profileId: id, viewedIds, unlocked });

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {allowed ? (
        children
      ) : (
        <ProfileWall personName={person ? person.nameKo || person.name : undefined} />
      )}
    </>
  );
}
