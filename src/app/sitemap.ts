import type { MetadataRoute } from 'next';
import { getAllEnrichedPeople } from '@/lib/data/enriched-server';

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
    ...profileEntries,
  ];
}
