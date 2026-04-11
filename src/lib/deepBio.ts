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
  '41','42','43','44','45','46','47','49','50','51','52','53','54','55','56','57','58','59','60','61',
  '62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80','81',
  '82','83','84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99','100','101',
  '102','103','104','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121','122',
  '123','124','125','126','127','129','130','131','132','133','134','135','136','137','138','139','140','141','142','143',
  '144','146','147','149','151','152','154','155','156','157','159','162','164','165','166','167','168','170','171','172',
  '173','174','178','180','182','184','189','192','193','194','197','198','199','200','201','202','203','211','213','214',
  '217','225','229','230','235','236','237','239','240','244','248','249','251','253','254','260','261','262','265','266',
  '270','271','272','273','277','280','287','289','291','293','295','296','297','299','301','304','314','322','338','344',
  '354','357','362','379','392','395','396','403','422','429','440','443','452','513','516','518','533','629','653','697',
  '737','829','1068','1091','1094','1127','1142','1196','1304','1312','1346','1367','1375','1382','1454','1522','1555','1617','1670','1716',
  '1721','1887','1925','1962','2002','2154','2218','2348','2389','2455','2693','2697','2710','2729','2767','2802','2821','2828','2912','2917',
  '2918','2919',
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
