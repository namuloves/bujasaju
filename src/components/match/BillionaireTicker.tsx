'use client';

import { useMemo } from 'react';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { STEM_TO_OHAENG } from '@/lib/saju/constants';
import type { CheonGan, EnrichedPerson, OHaeng } from '@/lib/saju/types';

/**
 * Horizontal marquee of billionaire faces with their 일주 in 오행 colors.
 * Faces are picked from the enriched dataset to maximize ilju variety —
 * one famous, photo-having billionaire per stem (갑·을·…·계), with extra
 * household names mixed in. Loops seamlessly via duplicate-and-translate.
 */

type Stem = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

const OHAENG_TO_STEM: Record<OHaeng, Stem> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
};

const STEM_GRADIENT: Record<Stem, string> = {
  wood:  'linear-gradient(116deg, #00C74C 7.97%, #0A9D42 100%)',
  fire:  'linear-gradient(113deg, #D66340 0%, #EF714A 100%)',
  earth: 'linear-gradient(105deg, #EC9212 0%, #F2A02C 151.02%)',
  metal: 'linear-gradient(109deg, #A1A1A1 2.57%, #828282 97.43%)',
  water: 'linear-gradient(113deg, #005A92 -6.33%, #1B8ACF 116.68%)',
};

// Famous billionaires we want guaranteed in the ticker if their data is loaded.
// Matched by `id` against the enriched dataset; missing ones are silently
// skipped. IDs come from public/billionaires.json (numeric strings).
//
// Heavy Korean weighting on purpose — this is a Korean product and same-country
// faces feel more relatable than a sea of Walton heirs.
const PRIORITY_IDS = [
  // 한국 대기업 오너 & 자수성가
  '111',   // 이재용 (Samsung)
  '417',   // 이부진 (Samsung)
  '467',   // 조정호 (메리츠금융)
  '470',   // 서정진 (셀트리온)
  '550',   // 정몽구 (Hyundai)
  '675',   // 정의선 (Hyundai)
  '894',   // 박현주 (미래에셋)
  '1187',  // 김범수 (카카오)
  '1518',  // 최태원 (SK)
  '1728',  // 송치형 (두나무)
  '2156',  // 구광모 (LG)
  '2706',  // 이해진 (네이버)
  // 글로벌 슈퍼리치 (다양한 일주를 위해)
  '1',     // 일론 머스크
  '5',     // 마크 저커버그
  '4',     // 제프 베조스
  '7',     // 젠슨 황 (Nvidia)
  '2',     // 래리 페이지
  '3',     // 세르게이 브린
  '11',    // 워런 버핏
  '19',    // 빌 게이츠
];

const TARGET_COUNT = 22;
const FALLBACK_PHOTO_HOSTS = /(forbesimg|forbes|weforum|wikimedia|gettyimages|ftcdn|cdn)/i;

// IDs whose Forbes "photo" actually serves the grey "F" placeholder. They have
// a real photoUrl set but no real image behind it. Hard-skip them in the
// ticker so users never see the placeholder.
const BROKEN_PHOTO_IDS = new Set<string>([
  '1691', // 유정현 (넥슨)
]);

// Some Forbes records use "source" for industry/wealth-type ("Semiconductors",
// "Real estate") rather than the actual company. Override known cases so the
// ticker shows the household-name brand.
const SOURCE_OVERRIDES: Record<string, string> = {
  // SK / LG stay as-is — those Latin letters are how Koreans actually write them.
  '1518': 'SK',          // 최태원
  '111':  '삼성',         // 이재용 — bio-extracted company started with a date
  '550':  '현대자동차',     // 정몽구 — bio-extracted company was a long sentence
  '1':    '테슬라·스페이스X', // 일론 머스크
  '2':    '구글',          // 래리 페이지
  '3':    '구글',          // 세르게이 브린
  '5':    '메타',          // 마크 저커버그 — modernized from "Facebook"
  '6':    '오라클',         // 래리 엘리슨
  '7':    '엔비디아',       // 젠슨 황
  '8':    '델',            // 마이클 델 (also covers "델 테크놀로지스" short form)
  '19':   '마이크로소프트',  // 빌 게이츠
};

// English company / industry → Korean. Applied when the display text would
// otherwise be Latin-only. Covers both well-known brand names and Forbes's
// industry tags ("Real estate" etc) that leak through for filler entries.
const EN_TO_KO_LABEL: Record<string, string> = {
  // Companies
  'Walmart': '월마트',
  'Cargill': '카길',
  'Tesla': '테슬라',
  'SpaceX': '스페이스X',
  'Facebook': '페이스북',
  'Meta': '메타',
  'Google': '구글',
  'Nvidia': '엔비디아',
  'Microsoft': '마이크로소프트',
  'Oracle': '오라클',
  'Amazon': '아마존',
  'Apple': '애플',
  'Tencent': '텐센트',
  'Alibaba': '알리바바',
  'Atlassian': '아틀라시안',
  // Industries (Forbes "source" sometimes carries these instead of a brand)
  'Real estate':         '부동산',
  'Investments':         '투자',
  'Pharmaceuticals':     '제약',
  'Private equity':      '사모펀드',
  'Diversified':         '복합 기업',
  'Software':            '소프트웨어',
  'Hedge funds':         '헤지펀드',
  'Banking':             '은행',
  'Chemicals':           '화학',
  'Shipping':            '해운',
  'Manufacturing':       '제조업',
  'Semiconductors':      '반도체',
  'Mining':              '광업',
  'Consumer goods':      '소비재',
  'Financial services':  '금융',
  'Retail':              '소매',
  'Supermarkets':        '슈퍼마켓',
  'Medical devices':     '의료기기',
  'Finance':             '금융',
  'Fintech':             '핀테크',
  'Artificial intelligence': 'AI',
  'Electronics':         '전자',
  'Construction':        '건설',
  'Shoes':               '신발',
  'Cryptocurrency':      '암호화폐',
  'Steel':               '철강',
  'Media':               '미디어',
  'Fashion retail':      '패션',
  'Restaurant':          '외식업',
  'Energy':              '에너지',
  'Technology':          '기술',
  'Healthcare':          '헬스케어',
  'Automotive':          '자동차',
  'Entertainment':       '엔터테인먼트',
  'Hotels':              '호텔',
  'Insurance':           '보험',
  'Logistics':           '물류',
  'Telecom':             '통신',
};

function localizeLabel(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  if (EN_TO_KO_LABEL[trimmed]) return EN_TO_KO_LABEL[trimmed];
  // Comma- or slash-separated multi-tags like "Hotels, investments" — try
  // mapping each part individually, fall back to original if no match.
  if (/[,/]/.test(trimmed)) {
    const parts = trimmed.split(/[,/]/).map((p) => p.trim()).filter(Boolean);
    const mapped = parts.map((p) => {
      const key = Object.keys(EN_TO_KO_LABEL).find(
        (k) => k.toLowerCase() === p.toLowerCase(),
      );
      return key ? EN_TO_KO_LABEL[key] : p;
    });
    return mapped.join('·');
  }
  return trimmed;
}

// 풀네임이 너무 길거나 영문 음차가 어색한 경우 통용 호칭으로 교체.
// IDs는 public/billionaires.json 기준.
const NAME_OVERRIDES: Record<string, string> = {
  '2':  '래리 페이지',     // Lawrence Edward Page
  '3':  '세르게이 브린',   // Sergey Mikhailovich Brin
  '4':  '제프 베조스',     // Jeffrey Preston Bezos
  '5':  '마크 저커버그',   // Mark Elliot Zuckerberg
  '6':  '래리 엘리슨',     // Lawrence Joseph Ellison
  '7':  '젠슨 황',         // Jen-Hsun "Jensen" Huang — common is 젠슨
  '9':  '베르나르 아르노', // Bernard Jean Étienne Arnault
  '11': '워런 버핏',       // Warren Edward Buffett
  '19': '빌 게이츠',       // William Henry Gates III
  '20': '무케시 암바니',   // Mukesh Dhirubhai Ambani
};

// Cap how many people from any one Forbes "source" can appear, so e.g. the
// Walton heirs don't fill the ticker just because Walmart prints money.
const MAX_PER_SOURCE = 1;

// Only allow photos that look like real portraits — i.e. hosted on a known
// image CDN (Forbes / WEF / Wikimedia). Generic avatars and empty/relative
// URLs are excluded so the ticker never shows a grey silhouette placeholder.
function isUsablePhoto(url: string | null | undefined): boolean {
  if (!url) return false;
  if (!/^https?:\/\//i.test(url) && !url.startsWith('//')) return false;
  if (url.includes('ui-avatars.com')) return false;
  return FALLBACK_PHOTO_HOSTS.test(url);
}

function pickTickerPeople(all: EnrichedPerson[]): EnrichedPerson[] {
  if (all.length === 0) return [];
  const byId = new Map(all.map((p) => [p.id, p]));
  const picked: EnrichedPerson[] = [];
  const used = new Set<string>();
  const sourceCounts = new Map<string, number>();

  const bumpSource = (p: EnrichedPerson) => {
    const s = (p.source ?? '').trim().toLowerCase();
    if (!s) return;
    sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  };

  // 1. Priority list first — keeps household names visible.
  for (const id of PRIORITY_IDS) {
    const p = byId.get(id);
    if (
      p &&
      isUsablePhoto(p.photoUrl) &&
      !BROKEN_PHOTO_IDS.has(p.id) &&
      !used.has(p.id)
    ) {
      picked.push(p);
      used.add(p.id);
      bumpSource(p);
    }
  }

  // 2. Fill up to TARGET_COUNT with top-net-worth people, but cap any one
  //    "source" (Walmart heirs, L'Oréal heirs, …) at MAX_PER_SOURCE so the
  //    ticker doesn't turn into one family reunion. Also bias toward stems
  //    that aren't already represented, for 오행 color variety.
  const remaining = all
    .filter(
      (p) =>
        !used.has(p.id) &&
        !BROKEN_PHOTO_IDS.has(p.id) &&
        isUsablePhoto(p.photoUrl),
    )
    .sort((a, b) => b.netWorth - a.netWorth);

  const stemCounts = new Map<string, number>();
  for (const p of picked) {
    const stem = p.saju?.ilju?.[0];
    if (stem) stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
  }

  const isSourceFull = (p: EnrichedPerson) => {
    const s = (p.source ?? '').trim().toLowerCase();
    if (!s) return false;
    return (sourceCounts.get(s) ?? 0) >= MAX_PER_SOURCE;
  };

  while (picked.length < TARGET_COUNT && remaining.length > 0) {
    const minStem = Math.min(...stemCounts.values(), 0);
    let idx = remaining.findIndex((p) => {
      if (isSourceFull(p)) return false;
      const stem = p.saju?.ilju?.[0];
      return stem ? (stemCounts.get(stem) ?? 0) <= minStem : false;
    });
    // Fall back to next eligible (any stem) if none matched the stem hint.
    if (idx < 0) idx = remaining.findIndex((p) => !isSourceFull(p));
    if (idx < 0) break;
    const next = remaining.splice(idx, 1)[0];
    picked.push(next);
    used.add(next.id);
    bumpSource(next);
    const stem = next.saju?.ilju?.[0];
    if (stem) stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
  }

  return picked;
}

function normalizePhotoUrl(url: string): string {
  let n = url;
  if (n.startsWith('/')) n = `https:${n}`;
  if (n.startsWith('http://')) n = n.replace(/^http:/, 'https:');
  // Wikipedia images go through our proxy to avoid CSP / hotlink issues.
  if (n.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(n)}`;
  }
  return n;
}

function stemOf(person: EnrichedPerson): Stem {
  const stemChar = person.saju?.ilju?.[0] as CheonGan | undefined;
  const ohaeng = stemChar ? STEM_TO_OHAENG[stemChar] : '토';
  return OHAENG_TO_STEM[ohaeng];
}

function Face({ person }: { person: EnrichedPerson }) {
  const display = NAME_OVERRIDES[person.id] ?? person.nameKo ?? person.name;
  const ilju = person.saju?.ilju ?? '';
  const stem = stemOf(person);
  // Prefer the bio-extracted `company` field; fall back to Forbes's `source`
  // (which may be an industry tag). SOURCE_OVERRIDES is a small hand-curated
  // list that takes priority over both. `localizeLabel` then maps common
  // English brand / industry names to Korean so the ticker doesn't mix
  // scripts mid-row.
  const rawSource = SOURCE_OVERRIDES[person.id] ?? person.company ?? person.source ?? '';
  const source = localizeLabel(rawSource);
  return (
    <div className="shrink-0 w-[92px] sm:w-[124px] text-center">
      <img
        src={normalizePhotoUrl(person.photoUrl)}
        alt={display}
        loading="lazy"
        decoding="async"
        className="w-[92px] h-[92px] sm:w-[124px] sm:h-[124px] object-cover rounded-2xl bg-gray-100"
      />
      <div className="mt-2 text-[12px] sm:text-[13px] font-semibold text-gray-900 truncate">
        {display}
      </div>
      {source && (
        <div className="mt-0.5 text-[10.5px] sm:text-[11px] text-gray-500 truncate">
          {source}
        </div>
      )}
      <div
        className="mt-0.5 text-[11px] sm:text-[12px] font-semibold tracking-wide"
        style={{
          backgroundImage: STEM_GRADIENT[stem],
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {ilju}
      </div>
    </div>
  );
}

export default function BillionaireTicker() {
  const { people } = useEnrichedPeople();
  const ticker = useMemo(() => pickTickerPeople(people), [people]);

  // Reserve vertical space while data is loading so the layout doesn't jump.
  if (ticker.length === 0) {
    return <div className="h-[150px] sm:h-[180px]" aria-hidden="true" />;
  }

  // Render the list twice for a seamless wrap-around when translating by -50%.
  const doubled = [...ticker, ...ticker];

  return (
    <section
      aria-label="부자 일주 미리보기"
      className="relative overflow-hidden py-3 sm:py-6"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[60px] sm:w-[160px] z-10 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[60px] sm:w-[160px] z-10 bg-gradient-to-l from-white to-transparent" />

      <div className="flex gap-4 sm:gap-7 w-max ticker-marquee hover:[animation-play-state:paused]">
        {doubled.map((p, i) => (
          <Face key={`${p.id}-${i}`} person={p} />
        ))}
      </div>
    </section>
  );
}
