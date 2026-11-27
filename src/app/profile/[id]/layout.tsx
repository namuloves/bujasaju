import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getAllEnrichedPeople, getEnrichedPersonById } from '@/lib/data/enriched-server';
import { relatedPeople } from '@/lib/relatedPeople';
import type { EnrichedPerson } from '@/lib/saju/types';
import { getDeepBioV2ById } from '@/lib/data/deep-bio-server';
import { hasStructuredReading } from '@/lib/deepBio';
import {
  UNLOCK_COOKIE,
  VIEWS_COOKIE,
  evaluateAccess,
  parseViewedIds,
} from '@/lib/paywall';
import ProfileWall from '@/components/paywall/ProfileWall';
import { EnrichedSeedProvider } from '@/lib/data/enriched';

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

/** True/false for a Hangul syllable's final consonant; null if not Hangul. */
function hasFinalConsonant(word: string): boolean | null {
  const code = word.trim().slice(-1).charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28 !== 0;
}

const PARTICLE_PAIRS: Record<string, [string, string]> = {
  은: ['은', '는'],
  는: ['은', '는'],
  이: ['이', '가'],
  가: ['이', '가'],
};

/**
 * Swap the first mention of `from` names for `to`, re-picking the subject
 * particle that follows (은/는, 이/가) for the new name's last syllable —
 * "Behdad Eghbali는" → "베흐다드 에그발리는", "윌리엄 헨리 게이츠 3세는" →
 * "빌 게이츠는".
 */
function swapName(text: string, from: (string | undefined)[], to: string): string {
  for (const name of from) {
    if (!name || name === to) continue;
    const at = text.indexOf(name);
    if (at === -1) continue;
    let rest = text.slice(at + name.length);
    const pair = PARTICLE_PAIRS[rest[0]];
    const final = hasFinalConsonant(to);
    if (pair && final !== null && (rest[1] === ' ' || rest[1] === ',')) {
      rest = (final ? pair[0] : pair[1]) + rest.slice(1);
    }
    return text.slice(0, at) + to + rest;
  }
  return text;
}

/**
 * "Who is this" opener for a foreign profile's description: the Korean bio's
 * first sentence (two if the first is short), naming the person as Korean
 * searchers write them.
 */
function whoLine(person: { bioKo?: string; nameKo?: string; name: string }, proseName: string): string | null {
  if (!person.bioKo) return null;
  const text = swapName(person.bioKo.trim(), [person.nameKo, person.name], proseName);
  const sentences = text.split(/(?<=[.!?])\s+/);
  let out = sentences[0] ?? '';
  if (out.length < 40 && sentences[1]) out = `${out} ${sentences[1]}`;
  return out || null;
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

  // Title leads with the name people actually search, so it matches
  // "[이름] 사주" queries: the common Korean name where `nameKo` is the long
  // legal form ("테일러 스위프트", not "테일러 앨리슨 스위프트"), else the
  // press spelling in brackets when there is one ("아르테 모레노"). Then the
  // day pillar — what no news article has. Titles get clipped ~60 chars,
  // so nothing else goes in.
  const proseName = person.commonNameKo ?? displayName;
  const searchName =
    person.commonNameKo ??
    (aliases[0] ? `${displayName}(${aliases[0]})` : displayName);
  const title = person.saju
    ? `${searchName} 사주 분석 · ${person.saju.ilju} 일주 | 부자사주`
    : `${searchName} 사주 분석 | 부자사주`;

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
  // Foreign billionaires are mostly searched by name alone ("디터 뮐러") —
  // people looking up who someone is. A chart-first snippet showed up for
  // those searches but got no clicks, so foreign profiles lead with who the
  // person is and put the chart second. Korean profiles keep the chart
  // first: their searches are "[이름] 사주".
  const who = person.nationality !== 'KR' ? whoLine(person, proseName) : null;
  const description = who
    ? person.saju
      ? `${who} 사주는 ${person.saju.ilju} 일주, ${person.saju.gyeokguk}.`
      : who
    : chartLead
      ? `${chartLead}. ${body}`
      : body;
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

  // Unknown or hidden (netWorth 0) IDs used to answer 200 with a client-side
  // "인물을 찾을 수 없어요" page, a soft 404 that search engines keep as a thin
  // duplicate. A real 404 lets them drop it.
  if (!person) notFound();

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

  // First-render data for the client page: this person, plus the people
  // RelatedPeople will show, so the server HTML carries real <a href> links
  // to other profiles. Crawlers find pages through those links
  // (https://searchadvisor.naver.com/guide/resource-and-link); before this,
  // the HTML of a profile linked to no other profile at all. Bios are
  // dropped from the related cards to keep the payload small; they don't
  // show them.
  const { sameIlju, sameIndustry } = relatedPeople(getAllEnrichedPeople(), person);
  const related = new Map<string, EnrichedPerson>();
  for (const p of [...sameIlju, ...sameIndustry]) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { bio: _bio, bioKo: _bioKo, ...card } = p;
    related.set(p.id, card);
  }
  const seed = [person, ...related.values()];

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {allowed ? (
        // Seeding the person lets the client page server-render its hero
        // (name, bio, chart) instead of a spinner. See EnrichedSeedProvider.
        <EnrichedSeedProvider people={seed}>{children}</EnrichedSeedProvider>
      ) : (
        <ProfileWall personName={person ? person.nameKo || person.name : undefined} />
      )}
    </>
  );
}
