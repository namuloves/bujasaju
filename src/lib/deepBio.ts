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

// ---------- v2 deep bio (richer schema for 사주 풀이) ----------
//
// v2 mirrors scripts/deep-bio-schema-v2.json. It adds:
//   - capitalOrigin (self-made / inherited / mixed / political)
//   - turningPoints (decisive choices with alternatives)
//   - moneyMechanics (how the wealth was actually built)
//   - characterKo (observed traits — for contrast with saju)
//   - careerTimeline[i].age + whyItMatteredKo + whatTheyRiskedKo + whoHelpedKo
//   - failures[i].age + howTheyOvercameKo
//
// v2 bios live at public/deep-bios-v2/{id}.json. They are generated via
// Cowork (scripts/deep-bio-v2-prompt.md) and accumulated incrementally.

export interface DeepBioV2CareerEvent {
  year: number;
  age: number;
  event: string;
  eventKo: string;
  whyItMatteredKo: string;
  whatTheyRiskedKo?: string;
  whoHelpedKo?: string;
  source?: string;
}

export interface DeepBioV2TurningPoint {
  year: number;
  age: number;
  decisionKo: string;
  alternativeKo: string;
  outcomeKo: string;
  source?: string;
}

export interface DeepBioV2MoneyMechanics {
  coreBusinessKo: string;
  moatKo: string;
  luckVsSkillKo: string;
  politicalCapitalKo: string;
  capitalHistoryKo: string;
  source?: string;
}

/**
 * v2 failure entry. Cowork has been inconsistent about the field name —
 * some bios use `description`/`descriptionKo`, others use `failure`/`failureKo`.
 * Both are accepted; consumers should use `getFailureKo(f)` to read.
 */
export interface DeepBioV2Failure {
  year: number;
  age: number;
  description?: string;
  descriptionKo?: string;
  failure?: string;
  failureKo?: string;
  howTheyOvercameKo: string;
  lessonKo: string;
  source?: string;
}

/** Read the Korean failure description regardless of which key Cowork used. */
export function getFailureKo(f: DeepBioV2Failure): string {
  return f.descriptionKo ?? f.failureKo ?? f.description ?? f.failure ?? '';
}

export interface DeepBioV2CapitalOrigin {
  typeKo: 'self-made' | 'inherited' | 'mixed' | 'political' | string;
  explanationKo: string;
  source?: string;
}

export interface DeepBioV2CharacterKo {
  observedTraitsKo: string;
  leadershipStyleKo: string;
  conflictBehaviorKo: string;
  knownQuirksKo: string;
  source?: string;
}

export interface DeepBioV2 {
  id: string;
  name: string;
  nameKo?: string;
  netWorth?: string;
  nationality?: string;
  industry?: string;

  childhood: {
    birthPlace: string;
    birthPlaceKo: string;
    familyBackground?: string;
    familyBackgroundKo: string;
    education?: string;
    educationKo?: string;
    earlyLife?: string;
    earlyLifeKo?: string;
    capitalTypeKo?: string;
    source?: string;
  };

  capitalOrigin: DeepBioV2CapitalOrigin;
  careerTimeline: DeepBioV2CareerEvent[];
  turningPoints: DeepBioV2TurningPoint[];
  moneyMechanics: DeepBioV2MoneyMechanics;
  failures: DeepBioV2Failure[];
  wealthHistory: WealthDataPoint[];
  characterKo: DeepBioV2CharacterKo;

  // Carried over from v1, kept loose:
  quotes?: Quote[];
  books?: { authored: Book[]; recommended: Book[] };
  personalTraits?: DeepBio['personalTraits'];
  sajuConnection?: unknown;
}

const cacheV2 = new Map<string, DeepBioV2 | null>();

/**
 * Fetch a v2 deep bio by person ID. Returns null if not available.
 * Cached per session.
 */
export async function fetchDeepBioV2(personId: string): Promise<DeepBioV2 | null> {
  if (cacheV2.has(personId)) return cacheV2.get(personId) ?? null;
  try {
    const res = await fetch(`/deep-bios-v2/${personId}.json`);
    if (!res.ok) {
      cacheV2.set(personId, null);
      return null;
    }
    const data = (await res.json()) as DeepBioV2;
    cacheV2.set(personId, data);
    return data;
  } catch {
    cacheV2.set(personId, null);
    return null;
  }
}

/**
 * IDs of billionaires that have v2 deep bios in public/deep-bios-v2/.
 *
 * Seeded manually for now. Will grow as Cowork batches drop new files.
 * Regenerate via `scripts/regen-v2-manifest.ts` (TODO) once we have many.
 */
const DEEP_BIO_V2_IDS = new Set<string>([
  // Global Top 10
  '1',  // Elon Musk
  '2',  // Larry Page
  '3',  // Sergey Brin
  '4',  // Jeff Bezos
  '5',  // Mark Zuckerberg
  '6',  // Larry Ellison
  '7',  // Jensen Huang
  '8',  // Michael Dell
  '9',  // Bernard Arnault
  '10', // Rob Walton
  // Korean (18 done)
  '111',  // 이재용
  '417',  // 이부진
  '455',  // 이서현
  '467',  // 조정호
  '470',  // 서정진
  '480',  // 홍라희
  '550',  // 정몽구
  '675',  // 정의선
  '794',  // 곽동신
  '894',  // 박현주
  '1187', // 김범수
  '1190', // 윤대인
  '1437', // 조현준
  '1484', // 김준기
  '1510', // 정몽준
  '1518', // 최태원
  '1528', // 김병훈
  '1609', // 박순재
  '1691', // 유정현
  '1728', // 송치형
  '1798', // 이동채
  '1861', // 구본능
  '1913', // 정용지
  '1918', // 정용진
  '2111', // 이채윤
  '2156', // 구광모
  '3357', // 권혁빈
]);

/** Synchronous check — no network request. */
export function hasDeepBioV2Sync(personId: string): boolean {
  return DEEP_BIO_V2_IDS.has(personId);
}

// ---------- v1 ----------

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
  '41','42','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59','62','63','64',
  '65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80','81','82','83','85',
  '86','87','88','89','90','91','92','93','94','95','96','97','98','99','100','101','102','103','104','105',
  '106','107','109','110','111','112','113','114','115','116','118','119','120','121','122','123','124','125','126','127','128',
  '129','130','131','133','134','135','136','137','138','139','140','141','142','143','144','145','147','150','151','153',
  '154','155','156','159','160','161','162','163','164','165','166','167','169','170','171','173','174','175','177','178',
  '179','180','181','182','183','184','185','188','190','192','194','195','196','197','198','199','200','201','202','203',
  '204','205','206','207','208','209','210','211','212','213','215','218','221','222','223','224','226','227','228','230','233','234',
  '235','239','240','241','242','243','246','247','248','249','250','251','252','253','254','255','256','265','267','268','269','270','271','273','274',
  '275','276','277','279','280','282','283','285','287','288','289','290','292','293','297','299','300','302','303','304','305',
  '307','308','309','310','311','313','315','316','317','318','319','320','321','324','325','326','330','331','333','334','336',
  '338','339','340','341','344','345','346','347','348','352','353','354','358','359','360','362','363','364','365','366','367','369','372','373','374','375','376','377','380',
  '381','383','385','386','387','388','390','391','392','394','395','396','401','402','403','405','406','407','409','412','413','414','417','420','421','422','423',
  '424','425','426','428','429','430','432','433','435','437','441','446','447','448','449','450','451','453','455','456','458','463','464',
  '467','468','469','470','471','472','474','475','476','477','480','481','482','483','484','485','486','487','490','491',
  '492','495','496','497','498','499','501','502','503','504','506','508','509','510','513','514','515','516','518','519','520',
  '521','523','524','525','526','527','530','531','536','537','538','539','541','542','544','545','547','549','550','551',
  '552','553','555','556','557','559','560','561','567','568','569','571','572','573','574','575','576','578','579','582',
  '583','584','585','586','587','588','590','591','592','594','595','596','597','598','599','601','602','603','604','606',
  '608','610','611','612','613','614','617','618','619','622','623','629','632','633','637','644','648','650','652','657',
  '660','661','665','667','668','670','674','675','676','677','687','689','690','691','694','695','696','697','699','702',
  '704','705','709','713','714','715','717','718','725','727','728','734','737','740','741','742','744','745','747','748','751',
  '752','761','762','765','769','771','772','773','777','781','784','793','794','795','798','804','806','809','812','815',
  '816','817','820','822','823','825','833','834','836','839','841','844','850','851','852','857','863','866','874','876',
  '878','881','882','884','887','894','906','912','913','914','930','933','936','940','947','949','952','953','956','957',
  '967','970','974','977','990','991','993','996','998','1009','1012','1014','1015','1020','1021','1034','1035','1036','1037','1041',
  '1048','1056','1062','1068','1069','1071','1072','1073','1076','1078','1085','1096','1102','1103','1104','1113','1125','1126','1130','1146',
  '1147','1152','1163','1164','1168','1169','1184','1187','1190','1198','1207','1213','1216','1222','1224','1227','1228','1235','1242','1244',
  '1245','1274','1277','1282','1283','1287','1289','1299','1300','1305','1306','1310','1319','1321','1332','1347','1357','1359','1369','1388',
  '1392','1395','1398','1399','1410','1417','1420','1434','1437','1441','1445','1448','1453','1454','1455','1457','1469','1475','1480','1484',
  '1486','1498','1503','1509','1510','1517','1518','1526','1528','1529','1541','1571','1573','1574','1586','1599','1609','1611','1620','1622',
  '1627','1641','1674','1691','1694','1699','1700','1728','1730','1739','1744','1759','1767','1770','1798','1802','1806','1814','1824','1852',
  '1853','1861','1886','1891','1900','1913','1918','1923','1929','1941','1977','2007','2026','2069','2084','2110','2111','2156','2165','2170',
  '2190','2200','2210','2219','2229','2244','2245','2248','2249','2250','2279','2281','2293','2308','2350','2385','2416','2431','2491','2509',
  '2511','2524','2536','2588','2633','2659','2670','2706','2730','2785','2849','2932','3001','3002','3003','3004','3005','3006','3007','3008','3015',
  '3009','3010','3011','3012','3013','3014','3016','3017','3018','3019','3020','3021','3022','3023','3024','3025','3026','3027','3028','3029',
  '3030','3055','3058','3062','3077','3081','3097','3112','3120','3142','3147','3180','3204','3211','3248','3283','3288','3294','3301','3304','3307',
  '3313','3314','3315'
]);

/** Synchronous check — no network request needed. */
export function hasDeepBioSync(personId: string): boolean {
  return DEEP_BIO_IDS.has(personId);
}

// ---------- Full-text search index ----------

type SearchIndex = Record<string, string>; // { personId: "all searchable text" }
let searchIndexPromise: Promise<SearchIndex> | null = null;

/**
 * Lazily fetch the deep-bio search index.
 * Called once on first search; cached for the session.
 */
export function fetchSearchIndex(): Promise<SearchIndex> {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch('/deep-bio-search.json')
      .then(res => res.ok ? res.json() as Promise<SearchIndex> : {})
      .catch(() => ({}));
  }
  return searchIndexPromise;
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
