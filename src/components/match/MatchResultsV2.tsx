'use client';

import { useEffect, useMemo, useRef, useState, useCallback, lazy, Suspense } from 'react';
import Image from 'next/image';
import { track } from '@vercel/analytics';
import { useLanguage } from '@/lib/i18n';
import { useEnrichedPeople } from '@/lib/data/enriched';
import { matchBillionaires } from '@/lib/saju/match';
import type { EnrichedPerson, SajuResult, CheonGan } from '@/lib/saju/types';
import { hasDeepBioSync, hasDeepBioV2Sync, loadDeepBioIndex } from '@/lib/deepBio';
import { HeroPillar } from './SajuHero';
import ShareButtons from './ShareButtons';
import IljuReading from './IljuReading';
import MatchSummary from './MatchSummary';
import DeepInterpretation from './DeepInterpretation';
import Top5FacesRow from './Top5FacesRow';
import LockedMatchesGate from './LockedMatchesGate';
import FeedbackCard from './FeedbackCard';

const DeepBioModal = lazy(() => import('@/components/deep-bio/DeepBioModal'));

const USD_TO_KRW = 1480.71;
function formatWorthKrwShort(netWorthB: number): string {
  const eok = netWorthB * 10 * USD_TO_KRW;
  const jo = eok / 10000;
  if (jo >= 1) return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조`;
  return `${Math.round(eok).toLocaleString('ko-KR')}억`;
}

function buildOgUrl(me: SajuResult, featured: EnrichedPerson): string {
  const displayName = featured.nameKo ?? featured.name;
  const enName = featured.name && featured.name !== displayName ? featured.name : '';
  const params = new URLSearchParams({
    ilju: me.ilju,
    featuredName: displayName,
    featuredNameEn: enName,
    featuredSource: featured.source ?? featured.industry,
    featuredWorth: formatWorthKrwShort(featured.netWorth),
    featuredPhoto: featured.photoUrl ?? '',
    featuredIlju: featured.saju.ilju,
    featuredNat: featured.nationality,
  });
  return `/api/og?${params.toString()}`;
}

// Minimal Korean industry map for the v3 share image. Full map lives in
// Top5FacesRow.tsx; this is the top ~25 covering >90% of the dataset.
const INDUSTRY_KO_NOUN: Record<string, string> = {
  Technology: '테크',
  'Finance & Investments': '금융',
  Finance: '금융',
  'Fashion & Retail': '패션·유통',
  Retail: '유통',
  'Real Estate': '부동산',
  'Real estate': '부동산',
  Energy: '에너지',
  Healthcare: '헬스케어',
  Pharmaceuticals: '제약',
  Manufacturing: '제조업',
  Telecom: '통신',
  Automotive: '자동차',
  'Media & Entertainment': '미디어·엔터',
  Media: '미디어',
  'Food & Beverage': '식음료',
  Food: '식품',
  'Metals & Mining': '광업',
  Mining: '광업',
  Logistics: '물류',
  Shipping: '해운',
  Diversified: '복합 기업',
  Construction: '건설',
  Chemicals: '화학',
  Gaming: '게임',
  Fintech: '핀테크',
  Insurance: '보험',
  Semiconductors: '반도체',
  Software: '소프트웨어',
  Service: '서비스업',
  'Gambling & Casinos': '게이밍·카지노',
  Hospitality: '호스피탈리티',
};
function industryNounKo(industry: string | undefined | null): string {
  if (!industry) return '';
  const key = Object.keys(INDUSTRY_KO_NOUN).find(
    (k) => k.toLowerCase() === industry.trim().toLowerCase(),
  );
  return key ? INDUSTRY_KO_NOUN[key] : industry;
}

/**
 * Build the 9:16 story-ratio share image URL. Includes the user's 4
 * pillars so the mini chart can render, plus rank + sameCount for the
 * achievement badge and bottom meta line. Used by the result page's
 * share-card preview and the "이미지로 저장" download flow.
 */
function buildOgStoryUrl(
  me: SajuResult,
  featured: EnrichedPerson,
  opts: { rank?: number; sameCount?: number } = {},
): string {
  const displayName = featured.nameKo ?? featured.name;
  const enName = featured.name && featured.name !== displayName ? featured.name : '';
  const pillarToString = (p: { stem: string; branch: string } | null) =>
    p ? `${p.stem}${p.branch}` : '';
  const params = new URLSearchParams({
    ilju: me.ilju,
    featuredName: displayName,
    featuredNameEn: enName,
    featuredSource: featured.source ?? featured.industry,
    featuredWorth: formatWorthKrwShort(featured.netWorth),
    featuredPhoto: featured.photoUrl ?? '',
    featuredNat: featured.nationality,
    year: pillarToString(me.saju.year),
    month: pillarToString(me.saju.month),
    day: pillarToString(me.saju.day),
    hour: pillarToString(me.saju.hour),
  });
  if (opts.rank) params.set('rank', String(opts.rank));
  if (opts.sameCount) params.set('sameCount', String(opts.sameCount));
  return `/api/og-story?${params.toString()}`;
}

/**
 * Build the v3 (Year-in-Review style) share image URL. Doesn't depend on
 * a single featured person — instead the whole pool of same-일주 people
 * is summarized: counts of self-made/inherited/mixed, top industries,
 * and up to 5 tribe-row faces. The trait paragraph and percentile come
 * from the caller (derived from existing useMemos).
 */
function buildOgStoryV3Url(opts: {
  rank?: number;
  percentile?: number;
  sameCount?: number;
  ilju?: string;
  trait?: string;
  selfMade?: number;
  inherited?: number;
  mixed?: number;
  industries?: string;
  tribeFaces?: { photoUrl?: string | null; name: string }[];
}): string {
  const params = new URLSearchParams();
  if (opts.rank) params.set('rank', String(opts.rank));
  if (opts.percentile != null) params.set('percentile', String(opts.percentile));
  if (opts.sameCount) params.set('sameCount', String(opts.sameCount));
  if (opts.ilju) params.set('ilju', opts.ilju);
  if (opts.trait) params.set('trait', opts.trait);
  if (opts.selfMade) params.set('selfMade', String(opts.selfMade));
  if (opts.inherited) params.set('inherited', String(opts.inherited));
  if (opts.mixed) params.set('mixed', String(opts.mixed));
  if (opts.industries) params.set('industries', opts.industries);
  if (opts.tribeFaces?.length) {
    params.set(
      'facePhotos',
      opts.tribeFaces.map(f => f.photoUrl ?? '').join('|'),
    );
    params.set(
      'faceNames',
      opts.tribeFaces.map(f => f.name).join('|'),
    );
  }
  return `/api/og-story-v3?${params.toString()}`;
}

function normalizePhoto(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=random&bold=true`;
  }
  let normalized = url;
  if (normalized.startsWith('//')) normalized = `https:${normalized}`;
  if (normalized.startsWith('http://')) normalized = normalized.replace(/^http:/, 'https:');
  if (normalized.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}

const NATIONALITY_KO: Record<string, string> = {
  US: '미국', KR: '한국', CN: '중국', JP: '일본', IN: '인도', FR: '프랑스',
  DE: '독일', GB: '영국', RU: '러시아', BR: '브라질', CA: '캐나다',
  AE: 'UAE', SA: '사우디', SE: '스웨덴', AU: '호주', IT: '이탈리아',
  ES: '스페인', NL: '네덜란드', CH: '스위스', SG: '싱가포르', HK: '홍콩',
  TW: '대만', TH: '태국', MX: '멕시코', AR: '아르헨티나', NO: '노르웨이',
};

interface Props {
  me: SajuResult;
  onReset: () => void;
  userBirthday?: string;
  userGender?: 'M' | 'F';
}

export default function MatchResultsV2({ me, onReset, userBirthday, userGender }: Props) {
  const { t } = useLanguage();
  const { people: enrichedPeople, loading } = useEnrichedPeople();

  const groups = useMemo(
    () => matchBillionaires(me, enrichedPeople),
    [me, enrichedPeople],
  );

  const totalMatches =
    groups.iljuPlusMonthJu.length +
    groups.chartTwins.length +
    groups.iljuPlusWolji.length +
    groups.iljuPlusGyeokguk.length;

  const sameIljuCount = groups.iljuOnly.length;

  // Rank stat for the hero strip. We compute two display modes:
  //   - When rank is in the top 20% of 60 ilju, show "상위 N%" — that's a
  //     genuinely brag-worthy framing.
  //   - Otherwise show "60갑자 중 N위" without the misleading "상위" prefix.
  // myCount === 0 means we don't have any billionaires for this ilju yet;
  // skip the rank stat in that case.
  const iljuStats = useMemo(() => {
    if (enrichedPeople.length === 0) return null;
    const counts = new Map<string, number>();
    for (const p of enrichedPeople) {
      counts.set(p.saju.ilju, (counts.get(p.saju.ilju) ?? 0) + 1);
    }
    const myCount = counts.get(me.ilju) ?? 0;
    const sorted = [...new Set(counts.values())].sort((a, b) => b - a);
    const rank = sorted.indexOf(myCount) + 1;
    const percentile = Math.max(0.1, Math.round((rank / 60) * 100 * 10) / 10);
    const isTopTier = percentile <= 20;
    return { rank, myCount, percentile, isTopTier };
  }, [enrichedPeople, me.ilju]);

  /**
   * Tribe stats for the v3 share image. Buckets the same-일주 pool by
   * wealthOrigin and industry, plus a Korean trait paragraph derived
   * from the dominant pattern. All computed from `groups.iljuOnly` so
   * the breakdown matches what the user sees on the page.
   */
  const tribeStats = useMemo(() => {
    const pool = groups.iljuOnly;
    if (pool.length === 0) return null;

    let selfMade = 0;
    let inherited = 0;
    let mixed = 0;
    const industryCounts = new Map<string, number>();

    for (const p of pool) {
      if (p.wealthOrigin === 'self-made') selfMade++;
      else if (p.wealthOrigin === 'inherited') inherited++;
      else if (p.wealthOrigin === 'mixed') mixed++;
      const ind = industryNounKo(p.industry);
      if (ind) industryCounts.set(ind, (industryCounts.get(ind) ?? 0) + 1);
    }

    const topIndustries = [...industryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    // Trait paragraph — short, specific, derived from the dominant
    // pattern. Keeps a small library of templates that fits the
    // self-made-vs-inherited skew + top industry.
    const total = selfMade + inherited + mixed;
    const selfMadePct = total > 0 ? (selfMade / total) : 0;
    const topInd = topIndustries[0] ?? '';
    let trait = '';
    if (total === 0) {
      trait = `같은 일주의 부자가 ${pool.length}명 모인 일주입니다.`;
    } else if (selfMadePct >= 0.7 && topInd) {
      trait = `${topInd} 업계에 자수성가형 부자가 많이 나오는 일주. 끈기와 직진력으로 큰 사업을 일군 사람들.`;
    } else if (selfMadePct >= 0.7) {
      trait = `자수성가형 부자가 많이 나오는 일주. 끈기와 직진력으로 큰 사업을 일군 사람들.`;
    } else if (selfMadePct <= 0.3 && topInd) {
      trait = `${topInd} 가문의 상속형 부자가 많은 일주. 가족 자산을 안정적으로 키워낸 사람들.`;
    } else if (topInd) {
      trait = `${topInd} 업계에서 자수성가와 상속이 골고루 섞인 일주.`;
    } else {
      trait = `자수성가와 상속이 골고루 섞인 일주.`;
    }

    return {
      pool,
      selfMade,
      inherited,
      mixed,
      topIndustries,
      trait,
    };
  }, [groups.iljuOnly]);

  const stricterMatches = useMemo(
    () => [
      ...groups.iljuPlusMonthJu,
      ...groups.chartTwins,
      ...groups.iljuPlusWolji,
      ...groups.iljuPlusGyeokguk,
    ],
    [groups],
  );
  const summaryMatches = useMemo(
    () => (stricterMatches.length > 0 ? stricterMatches : groups.iljuOnly),
    [stricterMatches, groups.iljuOnly],
  );

  const [bioIndexReady, setBioIndexReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadDeepBioIndex().then(() => {
      if (!cancelled) setBioIndexReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const top3 = useMemo(() => {
    const hasBio = (p: EnrichedPerson) => hasDeepBioV2Sync(p.id);
    const summaryWithBio = summaryMatches.filter(hasBio);
    const iljuOnlyWithBio = groups.iljuOnly.filter(hasBio);
    const seen = new Set<string>();
    const ordered: EnrichedPerson[] = [];
    for (const p of [...summaryWithBio, ...iljuOnlyWithBio]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      ordered.push(p);
    }
    const koreanIdx = ordered.findIndex((p) => p.nationality === 'KR');
    if (koreanIdx > 0) {
      const [korean] = ordered.splice(koreanIdx, 1);
      ordered.unshift(korean);
    }
    return ordered.slice(0, 3);
  }, [summaryMatches, groups.iljuOnly, bioIndexReady]);

  const defaultFeaturedId = top3[0]?.id ?? null;
  const [selectedFeaturedId, setSelectedFeaturedId] = useState<string | null>(defaultFeaturedId);
  const featuredPool = useMemo(() => {
    const seen = new Set<string>();
    const out: EnrichedPerson[] = [];
    for (const p of [...top3, ...summaryMatches]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [top3, summaryMatches]);
  const featuredPerson =
    featuredPool.find((p) => p.id === selectedFeaturedId) || featuredPool[0] || null;

  const lockedPool = useMemo(() => {
    const top3Ids = new Set(top3.map((p) => p.id));
    return featuredPool.filter((p) => !top3Ids.has(p.id)).slice(0, 7);
  }, [featuredPool, top3]);

  const featuredHasBio = featuredPerson ? hasDeepBioSync(featuredPerson.id) : false;
  const [showFeaturedBio, setShowFeaturedBio] = useState(false);

  useEffect(() => {
    if (selectedFeaturedId === null && defaultFeaturedId) {
      setSelectedFeaturedId(defaultFeaturedId);
    }
  }, [defaultFeaturedId, selectedFeaturedId]);

  const tracked = useRef<string | null>(null);
  useEffect(() => {
    if (loading) return;
    const key = `${me.ilju}|${me.wolji}|${featuredPerson?.id ?? 'none'}|v2`;
    if (tracked.current === key) return;
    tracked.current = key;
    track('quiz_results_shown_v2', {
      ilju: me.ilju,
      wolji: me.wolji,
      gyeokguk: me.gyeokguk,
      totalMatches,
      sameIljuCount,
      featuredId: featuredPerson?.id ?? null,
      featuredName: featuredPerson?.name ?? null,
    });
  }, [loading, me.ilju, me.wolji, me.gyeokguk, featuredPerson?.id, featuredPerson?.name, totalMatches, sameIljuCount]);

  // Tribe faces for the v3 share image — uses `top3` (already prioritizes
  // Korean and has photos) and falls back to `groups.iljuOnly` so we can
  // fill up to 5 thumbs even when only 1–2 people have deep bios.
  const tribeFaces = useMemo(() => {
    const seen = new Set<string>();
    const out: { photoUrl?: string | null; name: string }[] = [];
    for (const p of [...top3, ...groups.iljuOnly]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push({
        photoUrl: p.photoUrl,
        name: p.nameKo ?? p.name,
      });
      if (out.length >= 5) break;
    }
    return out;
  }, [top3, groups.iljuOnly]);

  // Memoized v3 share URL — used by both the in-page preview image and
  // the "이미지로 저장" download. Pulls everything from existing
  // useMemos so nothing recomputes at click time.
  const shareUrl = useMemo(
    () =>
      buildOgStoryV3Url({
        rank: iljuStats?.rank,
        percentile: iljuStats?.percentile,
        sameCount: sameIljuCount,
        ilju: me.ilju,
        trait: tribeStats?.trait,
        selfMade: tribeStats?.selfMade,
        inherited: tribeStats?.inherited,
        mixed: tribeStats?.mixed,
        industries: tribeStats?.topIndustries.join(' · '),
        tribeFaces,
      }),
    [
      iljuStats?.rank,
      iljuStats?.percentile,
      sameIljuCount,
      me.ilju,
      tribeStats?.trait,
      tribeStats?.selfMade,
      tribeStats?.inherited,
      tribeStats?.mixed,
      tribeStats?.topIndustries,
      tribeFaces,
    ],
  );

  const [saving, setSaving] = useState(false);
  const handleSaveImage = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(shareUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `부자사주_${me.ilju}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Image save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [shareUrl, me.ilju, saving]);

  const fpName = featuredPerson
    ? (featuredPerson.nameKo ?? featuredPerson.name)
    : '';
  const fpCompany = featuredPerson?.source ?? featuredPerson?.industry ?? '';
  const fpWorth = featuredPerson ? formatWorthKrwShort(featuredPerson.netWorth) : '';
  const fpNationality = featuredPerson
    ? (NATIONALITY_KO[featuredPerson.nationality] ?? featuredPerson.nationality)
    : '';

  // Loading splash
  if (loading && enrichedPeople.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        부자 데이터를 불러오는 중…
      </div>
    );
  }

  if (!featuredPerson) {
    return (
      <div className="max-w-5xl mx-auto px-4">
        <div className="rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 text-center">
          <p className="text-sm text-gray-500 mb-1">
            {me.ilju} 일주 · {me.wolji} 월지 · {me.gyeokguk}
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
            아직 비슷한 사주의 부자를 못 찾았어요
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto">
            부자 데이터는 계속 추가되고 있어요. 곧 다시 확인해주세요.
          </p>
        </div>
      </div>
    );
  }

  const totalUnlockedAndLocked = top3.length + lockedPool.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">

      {/* ─────────────────────────────────────────────────────────────
          1. HERO REVEAL — full-bleed "당신은 ___" moment.
          Photo of featured billionaire + ilju label + 1-line framing.
          This is the dopamine hit; everything else supports it.
          ───────────────────────────────────────────────────────────── */}
      <section className="pt-6 sm:pt-10">
        <div className="rounded-3xl bg-gradient-to-b from-gray-50 to-white border border-gray-200 px-5 sm:px-8 py-8 sm:py-10">
          <p className="text-xs sm:text-sm font-medium text-gray-500 tracking-wide mb-1 text-center">
            당신은
          </p>
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden ring-4 ring-white shadow-lg mb-4">
              <Image
                src={normalizePhoto(featuredPerson.photoUrl, fpName)}
                alt={fpName}
                fill
                sizes="160px"
                className="object-cover"
                unoptimized
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center leading-tight">
              {fpName}과 같은
            </h1>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5">
              <span className="text-amber-600">{me.ilju}</span> 일주
            </p>
            {/* Two-line meta so a long company name (e.g. "영원무역홀딩스
                (KOSPI 009970)") doesn't squeeze 국적/자산 into vertical
                stacks. Line 1: 국적 · 자산 (short, always one line).
                Line 2: company name (clamped to one line with ellipsis). */}
            <div className="flex items-center gap-2 mt-3 text-sm text-gray-600 whitespace-nowrap">
              <span>{fpNationality}</span>
              <span className="text-gray-300">·</span>
              <span className="font-semibold text-gray-900">{fpWorth}</span>
            </div>
            {fpCompany && (
              <p className="mt-1 text-xs text-gray-500 text-center max-w-full truncate px-2">
                {fpCompany}
              </p>
            )}
          </div>

          {/* Quick jumps — scroll to the chart or to the matches. Lets the
              hero stay focused on identity while still giving the user a
              clear next step. */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            <a
              href="#chart"
              className="text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 rounded-full px-4 py-2 transition-colors"
            >
              내 사주 보기
            </a>
            <a
              href="#matches"
              className="text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 rounded-full px-4 py-2 transition-colors"
            >
              같은 일주 부자
            </a>
            <a
              href="#reading"
              className="text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:border-gray-300 rounded-full px-4 py-2 transition-colors"
            >
              사주 풀이
            </a>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. RARITY STAT STRIP — "상위 N%" + supporting numbers.
          A single big number people can claim/share. Sits right under
          the hero so it's the second thing they see.
          ───────────────────────────────────────────────────────────── */}
      {iljuStats && iljuStats.myCount > 0 && (
        <section className="mt-4">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 text-center">
              <p className="text-[11px] sm:text-xs text-gray-500 mb-1 whitespace-nowrap">
                {iljuStats.isTopTier ? '희소도' : '일주 랭킹'}
              </p>
              {iljuStats.isTopTier ? (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none whitespace-nowrap">
                    상위 {iljuStats.percentile}%
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5 whitespace-nowrap">
                    60갑자 중 {iljuStats.rank}위
                  </p>
                </>
              ) : (
                <>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none whitespace-nowrap">
                    {iljuStats.rank}<span className="text-base sm:text-lg font-semibold text-gray-500 ml-0.5">위</span>
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5 whitespace-nowrap">
                    60갑자 중
                  </p>
                </>
              )}
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 text-center">
              <p className="text-[11px] sm:text-xs text-gray-500 mb-1 whitespace-nowrap">같은 일주 부자</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none whitespace-nowrap">
                {sameIljuCount}<span className="text-base sm:text-lg font-semibold text-gray-500 ml-0.5">명</span>
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 whitespace-nowrap">
                전 세계 기준
              </p>
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 text-center">
              <p className="text-[11px] sm:text-xs text-gray-500 mb-1 whitespace-nowrap">자산 합계</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 leading-none whitespace-nowrap">
                {formatWorthKrwShort(
                  groups.iljuOnly.reduce((sum, p) => sum + p.netWorth, 0),
                )}
              </p>
              <p className="text-[11px] text-gray-400 mt-1.5 whitespace-nowrap">
                같은 일주
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MATCHED BILLIONAIRES — Top3 row, full cards with bios.
          The proof behind the hero label. Same component as legacy.
          ───────────────────────────────────────────────────────────── */}
      {top3.length > 0 && (
        <section id="matches" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              나랑 같은 {me.ilju} 일주를 가진 부자
            </h2>
            <span className="text-xs text-gray-400">
              {top3.length} / {totalUnlockedAndLocked}명
            </span>
          </div>
          <Top5FacesRow
            people={top3}
            selectedId={featuredPerson?.id ?? null}
          />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. USER'S CHART — moved below the hero. Still visually
          important but no longer the opening act.
          ───────────────────────────────────────────────────────────── */}
      <section id="chart" className="mt-10 scroll-mt-20">
        <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-7">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-base sm:text-lg font-bold text-gray-900">
              당신의 사주
            </h2>
            <span className="text-xs text-gray-400">
              {me.ilju}일주 · {me.wolji}월지
            </span>
          </div>
          <div className="max-w-[420px] mx-auto">
            <div className="flex justify-center gap-2 sm:gap-2.5">
              <HeroPillar label="時" ju={me.saju.hour} ilgan={me.saju.day.stem as CheonGan} large />
              <HeroPillar label="日" ju={me.saju.day} ilgan={me.saju.day.stem as CheonGan} isDayPillar large />
              <HeroPillar label="月" ju={me.saju.month} ilgan={me.saju.day.stem as CheonGan} large />
              <HeroPillar label="年" ju={me.saju.year} ilgan={me.saju.day.stem as CheonGan} large />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. SAJU READING — IljuReading + MatchSummary + DeepInterpretation.
          The depth. Sits below the chart so visitors who want the full
          read keep scrolling, but skimmers already got the headline.
          ───────────────────────────────────────────────────────────── */}
      <section id="reading" className="mt-10 scroll-mt-20 space-y-6">
        <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-7">
          <IljuReading ilju={me.ilju} />
        </div>
        <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-7">
          <MatchSummary saju={me} matches={summaryMatches} />
        </div>
        {featuredPerson && (
          <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-7">
            <DeepInterpretation
              saju={me}
              featured={featuredPerson}
              userBirthday={userBirthday}
              userGender={userGender}
            />
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. UNLOCK GATE — reframed as progress, not a wall.
          Header reads "N / M 명 공개됨" so the email field feels
          like the action that advances the counter.
          ───────────────────────────────────────────────────────────── */}
      {lockedPool.length > 0 && (
        <section className="mt-10">
          <LockedMatchesGate lockedPeople={lockedPool} ilju={me.ilju} />
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. SHARE CARD — preview-driven, not bare buttons.
          We render the existing OG image inline as the preview so
          the user sees exactly what gets saved/shared. The "이미지로
          저장" button reuses the existing handleSaveImage flow.
          ───────────────────────────────────────────────────────────── */}
      {featuredPerson && (
        <section className="mt-10">
          <div className="rounded-2xl bg-white border border-gray-200 p-5 sm:p-7">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                결과 공유하기
              </h2>
              <span className="text-xs text-gray-400">미리보기</span>
            </div>

            {/* 9:16 story-ratio preview — same image the user downloads.
                Constrained to ~360px wide so the tall canvas doesn't
                dominate the page; centered for a "phone preview" feel. */}
            <div className="flex justify-center mb-5">
              <div
                className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50 w-full max-w-[300px] sm:max-w-[340px]"
                style={{ aspectRatio: '1080 / 1920' }}
              >
                <img
                  src={shareUrl}
                  alt={`${me.ilju} 일주 — 공유 미리보기`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleSaveImage}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 rounded-lg px-5 py-3 transition-colors"
              >
                {saving ? (
                  <>이미지 저장 중…</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    이미지로 저장
                  </>
                )}
              </button>
              <div className="flex-1">
                <ShareButtons title={t.shareTitle} variant="hero" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          8. FEEDBACK — quick vote, anonymous.
          ───────────────────────────────────────────────────────────── */}
      <section className="mt-10 max-w-xl mx-auto">
        <FeedbackCard ilju={me.ilju} />
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. RESET — minimal footer action.
          ───────────────────────────────────────────────────────────── */}
      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg px-5 py-2 transition-colors inline-flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          다시 하기
        </button>
      </div>

      {showFeaturedBio && featuredPerson && (
        <Suspense fallback={null}>
          <DeepBioModal person={featuredPerson} onClose={() => setShowFeaturedBio(false)} userSaju={me} />
        </Suspense>
      )}
    </div>
  );
}
