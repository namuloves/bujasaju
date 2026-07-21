import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getEnrichedPersonById } from '@/lib/data/enriched-server';
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
  const title = `${displayName}의 사주 분석 | 부자사주`;
  const description =
    person.bioKo || person.bio || `${displayName} - ${person.industry}, 순자산 $${person.netWorth}B`;
  const truncatedDesc = description.length > 160 ? description.slice(0, 157) + '...' : description;

  const photoUrl = normalizePhotoForSchema(person.photoUrl);

  return {
    title,
    description: truncatedDesc,
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
  const jsonLd = person
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: person.name,
        ...(person.nameKo ? { alternateName: person.nameKo } : {}),
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
