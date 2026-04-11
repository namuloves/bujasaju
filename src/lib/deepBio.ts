/**
 * Deep biography types and data loading.
 *
 * Deep bios are stored as individual JSON files in public/deep-bios/
 * and lazily fetched when a user opens a person's full profile.
 */

export interface TimelineEvent {
  year: number;
  event: string;
  eventKo?: string;
}

export interface Failure {
  year: number;
  description: string;
  descriptionKo?: string;
  lesson: string;
  lessonKo?: string;
  source?: string;
}

export interface WealthDataPoint {
  year: number;
  netWorth: number; // billions USD
}

export interface Quote {
  text: string;
  textKo?: string;
  context?: string | null;
  contextKo?: string | null;
  source?: string;
}

export interface Book {
  title: string;
  author?: string;
  why?: string;
  whyKo?: string;
  note?: string;
  noteKo?: string;
}

export interface DeepBio {
  id: string;
  name: string;

  childhood: {
    birthPlace: string;
    birthPlaceKo?: string;
    familyBackground: string;
    familyBackgroundKo?: string;
    education: string;
    educationKo?: string;
    earlyLife: string;
    earlyLifeKo?: string;
    source?: string;
  } | null;

  careerTimeline: TimelineEvent[];

  failures: Failure[];

  wealthHistory: WealthDataPoint[];

  quotes: Quote[];

  books: {
    authored: Book[];
    recommended: Book[];
  };

  personalTraits: {
    knownFor: string;
    knownForKo?: string;
    philanthropy?: string;
    philanthropyKo?: string;
    controversies?: string;
    controversiesKo?: string;
  } | null;
}

// Cache fetched deep bios in memory
const cache = new Map<string, DeepBio | null>();

/**
 * Fetch a deep bio by person ID. Returns null if not available.
 * Results are cached so repeated opens don't re-fetch.
 */
export async function fetchDeepBio(personId: string): Promise<DeepBio | null> {
  if (cache.has(personId)) return cache.get(personId) ?? null;

  try {
    const res = await fetch(`/deep-bios/${personId}.json`);
    if (!res.ok) {
      cache.set(personId, null);
      return null;
    }
    const data: DeepBio = await res.json();
    cache.set(personId, data);
    return data;
  } catch {
    cache.set(personId, null);
    return null;
  }
}

/** IDs of billionaires that have deep bio files in public/deep-bios/. */
const DEEP_BIO_IDS = new Set([
  '1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20',
  '21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40',
  '41','42','43','44','45','46','47','49','50','51','52','54','55','56','57','58','59','60',
  '61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80',
  '81','82','83','84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99','100',
  '101','102','103','104','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120',
  '121','122','123','124','125','126',
  '166','322','357','422','455','533','653','697','1068','1127','1142','1196','1312',
]);

/** Synchronous check — no network request needed. */
export function hasDeepBioSync(personId: string): boolean {
  return DEEP_BIO_IDS.has(personId);
}

/**
 * Check if a deep bio exists (preflight, no full fetch).
 * Uses HEAD request to avoid downloading the full JSON.
 */
export async function hasDeepBio(personId: string): Promise<boolean> {
  if (cache.has(personId)) return cache.get(personId) !== null;
  try {
    const res = await fetch(`/deep-bios/${personId}.json`, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}
