import type { Metadata } from 'next';
import { getEnrichedPersonById } from '@/lib/data/enriched-server';

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
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

  let photoUrl = person.photoUrl;
  if (photoUrl?.startsWith('//')) photoUrl = `https:${photoUrl}`;

  return {
    title,
    description: truncatedDesc,
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

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
