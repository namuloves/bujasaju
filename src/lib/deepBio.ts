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
  '41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59','60',
  '61','62','63','64','65','66','67','68','69','70','71','72','73','74','75','76','77','78','79','80',
  '81','82','83','84','85','86','87','88','89','90','91','92','93','94','95','96','97','98','99','100',
  '101','102','103','104','106','107','108','109','110','111','112','113','114','115','116','117','118','119','120','121',
  '122','123','124','125','126','127','129','130','131','132','133','134','135','136','137','138','139','140','141','142',
  '143','144','146','147','149','151','152','153','154','155','156','157','158','159','162','163','164','165','166','167',
  '168','169','170','171','172','173','174','175','178','180','182','184','186','187','188','189','190','191','192','193',
  '194','195','197','198','199','200','201','202','203','208','211','213','214','215','216','217','218','219','220','221',
  '222','223','224','225','226','227','228','229','230','231','232','233','234','235','236','237','238','239','240','241',
  '242','243','244','245','246','247','248','249','250','251','252','253','254','255','256','257','258','259','260','261',
  '262','263','264','265','266','267','268','269','270','271','272','273','274','275','276','277','278','279','280','281',
  '282','283','284','285','286','287','288','289','290','291','292','293','294','295','296','297','299','301','304','305',
  '309','314','317','319','321','322','323','324','325','326','327','328','329','330','331','332','333','334','335','336',
  '337','338','339','340','341','342','343','344','345','346','347','348','349','350','351','352','353','354','355','356',
  '357','358','359','360','361','362','363','364','365','366','367','368','369','370','371','372','373','374','375','376',
  '377','378','379','380','381','382','383','384','385','386','387','388','389','390','391','392','393','394','395','396',
  '397','398','399','400','401','402','403','404','405','406','407','408','409','410','411','412','413','414','415','416',
  '417','418','419','420','421','422','423','424','425','426','427','428','429','430','431','432','433','434','435','436',
  '437','438','439','440','441','442','443','444','445','446','447','448','449','450','451','452','453','454','455','456',
  '457','458','459','460','461','462','463','464','465','466','468','469','479','485','486','487','505','510','511','513',
  '516','517','518','522','533','534','536','542','544','550','551','552','554','557','566','575','576','577','580','586',
  '589','593','600','616','619','629','630','631','641','649','650','653','656','658','659','662','665','666','672','674',
  '675','681','683','690','691','693','697','708','711','715','717','721','728','736','737','740','752','758','761','763',
  '773','776','788','789','813','816','817','819','822','829','836','843','844','866','873','892','895','914','925','930',
  '936','948','954','968','973','980','982','984','989','1006','1012','1023','1033','1034','1052','1058','1068','1069','1088','1091',
  '1094','1107','1113','1115','1127','1141','1142','1168','1171','1175','1176','1180','1182','1189','1190','1195','1196','1206','1207','1230',
  '1248','1267','1270','1272','1282','1289','1301','1304','1312','1315','1320','1321','1324','1346','1347','1362','1367','1375','1382','1383',
  '1421','1422','1433','1454','1464','1468','1481','1522','1531','1555','1556','1570','1591','1594','1617','1629','1662','1670','1705','1716',
  '1721','1732','1743','1773','1816','1849','1887','1925','1933','1962','1967','1976','1999','2002','2003','2032','2042','2053','2089','2154',
  '2218','2230','2239','2287','2348','2389','2409','2455','2660','2691','2693','2697','2710','2729','2741','2767','2802','2821','2828','2889',
  '2894','2906','2912','2917','2918','2919',
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
