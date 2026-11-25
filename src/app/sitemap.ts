import type { MetadataRoute } from 'next';
import { getAllEnrichedPeople } from '@/lib/data/enriched-server';
import { FAMILIES } from '@/lib/families';

const BASE_URL = 'https://bujasaju.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const people = getAllEnrichedPeople();

  const profileEntries = people.map((person) => ({
    url: `${BASE_URL}/profile/${person.id}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/family`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    ...FAMILIES.map((f) => ({
      url: `${BASE_URL}/family/${f.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...profileEntries,
  ];
}
