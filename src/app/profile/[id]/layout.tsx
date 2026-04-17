import type { Metadata } from 'next';
import { getEnrichedPersonById } from '@/lib/data/enriched-server';

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

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
