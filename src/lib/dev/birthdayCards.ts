import type { CheonGan, EnrichedPerson, JiJi, Ju, OHaeng } from '@/lib/saju/types';
import { STEM_TO_OHAENG, BRANCH_TO_OHAENG, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import { getAllEnrichedPeople, getEnrichedPersonById } from '@/lib/data/enriched-server';

// Mirrors DEFAULT_PALETTE in components/dev/ColorPicker.tsx (a 'use client'
// module, so it can't be imported here). Keep the two in sync.
const PALETTE: Record<OHaeng, { from: string; to: string; angle: number }> = {
  목: { from: '#56BD7E', to: '#5EBA82', angle: 116 },
  화: { from: '#F88681', to: '#F47873', angle: 113 },
  토: { from: '#EEB059', to: '#F0B25C', angle: 105 },
  금: { from: '#B8B8B8', to: '#B8B8B8', angle: 109 },
  수: { from: '#0087DB', to: '#0B8BDA', angle: 113 },
};

/**
 * Data + formatting shared by the "오늘 태어난 부자" marketing card tools
 * (/dev/birthday-cards page and /api/dev/birthday-card PNG route).
 */

const USD_TO_KRW = 1480.71;

export const NAT_KO: Record<string, string> = {
  US: '미국', KR: '한국', CN: '중국', JP: '일본', IN: '인도', FR: '프랑스',
  DE: '독일', GB: '영국', IT: '이탈리아', ES: '스페인', CA: '캐나다', AU: '호주',
  BR: '브라질', MX: '멕시코', RU: '러시아', HK: '홍콩', TW: '대만', SG: '싱가포르',
  IL: '이스라엘', SE: '스웨덴', NL: '네덜란드', CH: '스위스', TH: '태국',
  ID: '인도네시아', MY: '말레이시아', ZA: '남아공', SA: '사우디', AE: 'UAE',
  AT: '오스트리아', DK: '덴마크', IE: '아일랜드', UA: '우크라이나', CZ: '체코',
  PH: '필리핀', PK: '파키스탄', PT: '포르투갈', AR: '아르헨티나', GR: '그리스',
  FI: '핀란드', HU: '헝가리', MC: '모나코', CL: '칠레', CO: '콜롬비아',
  NZ: '뉴질랜드', NG: '나이지리아', EG: '이집트', GE: '조지아', LB: '레바논',
  NO: '노르웨이', BE: '벨기에', PL: '폴란드', TR: '터키', VN: '베트남',
};

export function natKo(code: string | undefined): string {
  if (!code) return '';
  return NAT_KO[code] || code;
}

export function worthKo(netWorthB: number): string {
  const eok = netWorthB * 10 * USD_TO_KRW;
  const jo = eok / 10000;
  if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조원`;
  return `${Math.round(eok).toLocaleString('ko-KR')}억원`;
}

export function worthUsd(netWorthB: number): string {
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

/** "MM-DD" for a date in Korea Standard Time (the audience's "today"). */
export function todayKstMmDd(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  return `${mm}-${dd}`;
}

export function normalizeMmDd(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/^(\d{1,2})[-./](\d{1,2})$/);
  if (!m) return null;
  const mm = Number(m[1]);
  const dd = Number(m[2]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function shiftMmDd(mmdd: string, days: number): string {
  const [mm, dd] = mmdd.split('-').map(Number);
  // Use a leap year so 02-29 round-trips.
  const d = new Date(Date.UTC(2024, mm - 1, dd + days));
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function mmDdLabel(mmdd: string): string {
  const [mm, dd] = mmdd.split('-').map(Number);
  return `${mm}월 ${dd}일`;
}

/**
 * Everyone in the visible dataset born on this month/day, richest first.
 * 01-01 is the historical "unknown birthday" placeholder, so on that day we
 * drop rows whose 01-01 was never verified (they carry no saju month/day
 * pillar confidence) — the card would otherwise be full of guesses.
 */
export function getPeopleBornOn(mmdd: string): EnrichedPerson[] {
  return getAllEnrichedPeople()
    .filter((p) => typeof p.birthday === 'string' && p.birthday.slice(5) === mmdd)
    .sort((a, b) => b.netWorth - a.netWorth);
}

export function getPersonForCard(id: string): EnrichedPerson | undefined {
  return getEnrichedPersonById(id);
}

export interface PillarView {
  label: '年' | '月' | '日';
  stem: CheonGan;
  branch: JiJi;
  stemColor: string;
  branchColor: string;
  stemSipsin: string;
  branchSipsin: string;
}

function gradient(oh: OHaeng): string {
  const { from, to, angle } = PALETTE[oh];
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
}

function pillarView(label: PillarView['label'], ju: Ju, ilgan: CheonGan, isDay: boolean): PillarView {
  return {
    label,
    stem: ju.stem,
    branch: ju.branch,
    stemColor: gradient(STEM_TO_OHAENG[ju.stem]),
    branchColor: gradient(BRANCH_TO_OHAENG[ju.branch]),
    stemSipsin: isDay ? '일간' : getSipSin(ilgan, ju.stem),
    branchSipsin: getSipSin(ilgan, getBongi(ju.branch)),
  };
}

/** Year · Month · Day pillars (hour is never public), left-to-right for display. */
export function pillarsFor(p: EnrichedPerson): PillarView[] | null {
  const s = p.saju?.saju;
  if (!s?.year || !s?.month || !s?.day) return null;
  const ilgan = s.day.stem;
  return [
    pillarView('年', s.year, ilgan, false),
    pillarView('月', s.month, ilgan, false),
    pillarView('日', s.day, ilgan, true),
  ];
}

export function companyLabel(p: EnrichedPerson): string {
  return p.companyKo || p.company || p.source || p.industry || '';
}

/** Draft X post text for a day, mirroring the format used in docs/x-posts-*.md. */
export function draftPost(mmdd: string, people: EnrichedPerson[], max = 4): string {
  const [mm, dd] = mmdd.split('-').map(Number);
  const lines = people.slice(0, max).map((p) => {
    const name = p.nameKo || p.name;
    const co = companyLabel(p);
    return `${name}${co ? `(${co})` : ''} · ${worthUsd(p.netWorth)} · ${p.saju?.ilju ?? ''}일주`;
  });
  return [`${mm}/${dd} 오늘 태어난 부자 🎂`, '', ...lines, '', '오늘 생일이면 나와 일주 같은 부자는? 👇'].join('\n');
}

/**
 * Fetch a portrait and inline it as a data URL so the PNG renderer never
 * depends on a third-party host honouring a hotlink. Failures fall back to
 * null and the card draws an initials tile instead.
 */
const photoCache = new Map<string, string | null>();

function sniffImageType(b: Buffer): 'image/jpeg' | 'image/png' | 'image/gif' | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  return null; // webp/avif/svg/html error pages
}

export async function photoDataUrl(p: EnrichedPerson): Promise<string | null> {
  let url = p.photoUrl;
  if (!url) return null;
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('http://')) url = url.replace(/^http:/, 'https:');
  if (url.includes('ui-avatars.com')) return null;
  url = url.replace('416x416', '800x800');

  const cached = photoCache.get(url);
  if (cached !== undefined) return cached;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; bujasaju/1.0; +https://bujasaju.com)',
        // Satori's data-URL decoder only understands JPEG/PNG/GIF. CDNs with
        // image optimizers (Forbes/Fastly) content-negotiate, so asking for
        // webp/avif here would hand back a format the renderer chokes on
        // ("u2 is not iterable").
        Accept: 'image/jpeg,image/png;q=0.9,*/*;q=0.5',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const buf = Buffer.from(await res.arrayBuffer());
    // Trust the bytes, not the header.
    const type = sniffImageType(buf);
    if (!type) throw new Error(`unsupported format (${res.headers.get('content-type')})`);
    const dataUrl = `data:${type};base64,${buf.toString('base64')}`;
    photoCache.set(url, dataUrl);
    return dataUrl;
  } catch (err) {
    console.warn('[birthday-card] photo failed:', p.id, p.name, err instanceof Error ? err.message : err);
    photoCache.set(url, null);
    return null;
  }
}
