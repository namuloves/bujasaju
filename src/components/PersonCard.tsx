'use client';

import React, { useState, lazy, Suspense } from 'react';
import { EnrichedPerson } from '@/lib/saju/types';

const DeepBioModal = lazy(() => import('./deep-bio/DeepBioModal'));
import { hasDeepBioSync } from '@/lib/deepBio';
import { GYEOKGUK_NAMES, BRANCH_TO_OHAENG, OHAENG_COLORS, getBongi } from '@/lib/saju/constants';
import { getSipSin } from '@/lib/saju/tenGods';
import type { CheonGan, JiJi } from '@/lib/saju/types';
import SajuBadge from './SajuBadge';
import { useLanguage } from '@/lib/i18n';
import { nationalityToKorean } from './FilterPanel';

interface PersonCardProps {
  person: EnrichedPerson;
  /** If true, the 사주 chart starts expanded instead of hidden behind "사주 확인". */
  defaultShowChart?: boolean;
}

const FLAG_MAP: Record<string, string> = {
  US: '🇺🇸', KR: '🇰🇷', CN: '🇨🇳', JP: '🇯🇵', IN: '🇮🇳', FR: '🇫🇷',
  DE: '🇩🇪', GB: '🇬🇧', IT: '🇮🇹', ES: '🇪🇸', CA: '🇨🇦', AU: '🇦🇺',
  BR: '🇧🇷', MX: '🇲🇽', RU: '🇷🇺', HK: '🇭🇰', TW: '🇹🇼', SG: '🇸🇬',
  IL: '🇮🇱', SE: '🇸🇪', NL: '🇳🇱', CH: '🇨🇭', TH: '🇹🇭', PH: '🇵🇭',
  ID: '🇮🇩', MY: '🇲🇾', ZA: '🇿🇦', NG: '🇳🇬', EG: '🇪🇬', SA: '🇸🇦',
  AE: '🇦🇪', AT: '🇦🇹', DK: '🇩🇰', CL: '🇨🇱', CO: '🇨🇴', NZ: '🇳🇿',
  IE: '🇮🇪', UA: '🇺🇦', CZ: '🇨🇿', GE: '🇬🇪', LB: '🇱🇧', PK: '🇵🇰',
  PT: '🇵🇹', AR: '🇦🇷', BB: '🇧🇧', BG: '🇧🇬', GR: '🇬🇷', KE: '🇰🇪',
  ZW: '🇿🇼', DZ: '🇩🇿', KW: '🇰🇼', FI: '🇫🇮', LV: '🇱🇻', IR: '🇮🇷',
  HU: '🇭🇺', MC: '🇲🇨', UZ: '🇺🇿', ET: '🇪🇹',
};

const COUNTRY_NAME: Record<string, string> = {
  US: 'United States', KR: 'South Korea', CN: 'China', JP: 'Japan', IN: 'India', FR: 'France',
  DE: 'Germany', GB: 'United Kingdom', IT: 'Italy', ES: 'Spain', CA: 'Canada', AU: 'Australia',
  BR: 'Brazil', MX: 'Mexico', RU: 'Russia', HK: 'Hong Kong', TW: 'Taiwan', SG: 'Singapore',
  IL: 'Israel', SE: 'Sweden', NL: 'Netherlands', CH: 'Switzerland', TH: 'Thailand', PH: 'Philippines',
  ID: 'Indonesia', MY: 'Malaysia', ZA: 'South Africa', NG: 'Nigeria', EG: 'Egypt', SA: 'Saudi Arabia',
  AE: 'UAE', AT: 'Austria', DK: 'Denmark', CL: 'Chile', CO: 'Colombia', NZ: 'New Zealand',
  IE: 'Ireland', UA: 'Ukraine', CZ: 'Czech Republic', GE: 'Georgia', LB: 'Lebanon', PK: 'Pakistan',
  PT: 'Portugal', AR: 'Argentina', BB: 'Barbados', BG: 'Bulgaria', GR: 'Greece', KE: 'Kenya',
  ZW: 'Zimbabwe', DZ: 'Algeria', KW: 'Kuwait', FI: 'Finland', LV: 'Latvia', IR: 'Iran',
  HU: 'Hungary', MC: 'Monaco', UZ: 'Uzbekistan', ET: 'Ethiopia',
};

function getFlag(nationality: string): string {
  const primary = nationality.split('/')[0];
  return FLAG_MAP[primary] || '🌍';
}

function getBirthplace(nationality: string): string {
  const parts = nationality.split('/');
  return parts.map((code) => COUNTRY_NAME[code] || code).join(' / ');
}

// USD to KRW conversion. Hardcoded ballpark rate — we're showing order of
// magnitude, not a live ticker. Bump this once a year if it drifts far.
/**
 * Forbes URLs in the dataset are often stored protocol-relative
 * (`//specials-images.forbesimg.com/...`). That works in most browsers
 * but is unreliable in some contexts (e.g. SSR, file://). Force https.
 * Also falls back to a generated avatar if the url is missing entirely.
 */
function normalizePhotoUrl(url: string | undefined | null, name: string): string {
  if (!url) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=200&background=random&bold=true`;
  }
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

const USD_TO_KRW = 1470;

function formatNetWorthUsd(netWorth: number): string {
  if (netWorth >= 1) return `$${netWorth.toFixed(1)}B`;
  return `$${(netWorth * 1000).toFixed(0)}M`;
}

// Format billions-USD as a Korean-language net worth string. Uses 조 (trillion
// KRW) when ≥1조, otherwise 억 (hundred-million KRW). Billionaires always
// clear the 1조 threshold in practice (1B USD ≈ 1.47조) but we handle both
// for safety.
function formatNetWorthKrw(netWorthBillionsUsd: number): string {
  const krwBillions = netWorthBillionsUsd * USD_TO_KRW; // KRW in units of 10억
  // 1조 = 10,000억. `krwBillions` is already in 억, so /10000 → 조.
  const trillions = krwBillions / 10000;
  if (trillions >= 1) {
    // Show 1 decimal for <10조, no decimal for ≥10조 to avoid noise.
    const fixed = trillions >= 10 ? trillions.toFixed(0) : trillions.toFixed(1);
    return `${fixed}조 원`;
  }
  // Under 1조: show in 억 원, comma-separated and rounded to nearest 100억.
  const eok = Math.round(krwBillions / 100) * 100;
  return `${eok.toLocaleString('ko-KR')}억 원`;
}

function formatBirthday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
}

// Render a bio string with links. Supports two forms, processed in order:
//   1. `[label](https://…)` — markdown-style link; only the label is shown
//   2. raw `https://…` URLs — fallback, shown as-is but clickable
// Used only for the expanded view. Keeps bios readable without showing
// ugly full URLs inline.
function renderBioWithLinks(text: string): React.ReactNode[] {
  // Single regex that matches either form. Group 1/2 = label/url for
  // markdown links, group 3 = bare URL.
  const combined = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const label = match[1] ?? match[3];
    const url = match[2] ?? match[3];
    parts.push(
      <a
        key={`link-${key++}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-indigo-500 hover:text-indigo-700 underline"
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

// Take the first N words of a bio and append an ellipsis if truncated.
// For Korean text (no spaces between words), fall back to a character cap.
function bioTeaser(bio: string, maxWords = 12, maxKoChars = 40): { text: string; truncated: boolean } {
  const hasHangul = /[\uAC00-\uD7AF]/.test(bio);
  if (hasHangul) {
    if (bio.length <= maxKoChars) return { text: bio, truncated: false };
    return { text: bio.slice(0, maxKoChars) + '…', truncated: true };
  }
  const words = bio.split(/\s+/);
  if (words.length <= maxWords) return { text: bio, truncated: false };
  return { text: words.slice(0, maxWords).join(' ') + '…', truncated: true };
}

export default function PersonCard({ person, defaultShowChart = false }: PersonCardProps) {
  const [showChart, setShowChart] = useState(defaultShowChart);
  const [showBio, setShowBio] = useState(false);
  const [showDeepBio, setShowDeepBio] = useState(false);
  const { t, lang } = useLanguage();
  const { saju } = person;
  const hanja = GYEOKGUK_NAMES[saju.gyeokguk] || '';
  // Prefer Korean bio when in KO mode, fall back to English if not yet translated.
  const displayBio = lang === 'ko' ? (person.bioKo ?? person.bio) : person.bio;
  const teaser = displayBio ? bioTeaser(displayBio) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Photo */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
        <img
          src={normalizePhotoUrl(person.photoUrl, person.name)}
          alt={person.name}
          // Intrinsic size matches our aspect-square container. Declaring
          // width/height lets the browser reserve space and avoids layout
          // shift as images stream in. Most source photos are 416×416 from
          // Forbes' CDN, so this is a natural fit.
          width={200}
          height={200}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          // Hint to the browser that off-screen card images aren't critical
          // for first paint. The first row (above the fold) will still be
          // fetched promptly because browsers ignore `low` for in-viewport
          // images.
          // @ts-expect-error – not yet in React's typings
          fetchpriority="low"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=200&background=random&bold=true`;
          }}
        />
        <div className="absolute top-2 left-2 text-lg">
          {getFlag(person.nationality)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        {person.nameKo ? (
          <>
            <h3 className="font-semibold text-gray-900 text-sm truncate">{person.nameKo}</h3>
            <p className="text-[11px] text-gray-400 truncate">{person.name}</p>
          </>
        ) : (
          <h3 className="font-semibold text-gray-900 text-sm truncate">{person.name}</h3>
        )}
        {/* Source */}
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {person.source || person.industry}
        </p>

        {/* Birthday */}
        <p className="text-xs text-gray-400 mt-1">{formatBirthday(person.birthday)}</p>

        {/* Net Worth */}
        <p className="text-xs text-gray-400 mt-0.5">
          {lang === 'ko' ? formatNetWorthKrw(person.netWorth) : formatNetWorthUsd(person.netWorth)}
        </p>

        {/* Birthplace */}
        <p className="text-xs text-gray-400 mt-0.5">
          {lang === 'ko' ? nationalityToKorean(person.nationality) : getBirthplace(person.nationality)}
        </p>

        {/* Bio teaser + expand toggle */}
        {teaser && (
          <div className="mt-2">
            <p className="text-xs text-gray-600 leading-snug">
              {showBio ? renderBioWithLinks(displayBio!) : teaser.text}
            </p>
            {teaser.truncated && (
              <button
                onClick={() => setShowBio(!showBio)}
                className="text-[11px] text-indigo-500 hover:text-indigo-700 font-medium mt-0.5 transition-colors"
              >
                {showBio ? `${t.showLess} ▲` : `${t.showMore} ▼`}
              </button>
            )}
          </div>
        )}

        {/* Saju Info */}
        <div className="mt-3 space-y-2">
          {/* 일주 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{t.cardDayPillar}</span>
            <SajuBadge stem={saju.saju.day.stem} branch={saju.saju.day.branch} size="sm" />
          </div>

          {/* 격국 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{t.cardPattern}</span>
            <span className="text-xs font-medium text-gray-700">
              {saju.gyeokguk} <span className="text-gray-400">{hanja}</span>
            </span>
          </div>

          {/* 월지 */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{t.cardMonthBranch}</span>
            <SajuBadge branch={saju.wolji} size="sm" />
          </div>

          {/* 사주 확인 toggle */}
          <button
            onClick={() => setShowChart(!showChart)}
            className="w-full text-xs text-indigo-500 hover:text-indigo-700 font-medium pt-1 border-t border-gray-100 transition-colors flex items-center justify-center gap-1"
          >
            {t.viewChart} {showChart ? '▲' : '▼'}
          </button>

          {/* 사주팔자 Chart (3 columns: 년주, 월주, 일주) */}
          {showChart && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-1 text-gray-400 font-normal">{t.hourPillar}</th>
                    <th className="py-1 text-gray-400 font-normal bg-indigo-50">{t.cardDayPillar}</th>
                    <th className="py-1 text-gray-400 font-normal">{t.monthPillar}</th>
                    <th className="py-1 text-gray-400 font-normal">{t.yearPillar}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 천간 십성 row — day column is 일간 (self) */}
                  <tr>
                    <td className="pt-1.5 text-[9px] text-gray-400">?</td>
                    <td className="pt-1.5 text-[9px] text-indigo-500 font-medium bg-indigo-50/30">
                      일간
                    </td>
                    <td className="pt-1.5 text-[9px] text-gray-500 font-medium">
                      {getSipSin(saju.saju.day.stem as CheonGan, saju.saju.month.stem as CheonGan)}
                    </td>
                    <td className="pt-1.5 text-[9px] text-gray-500 font-medium">
                      {getSipSin(saju.saju.day.stem as CheonGan, saju.saju.year.stem as CheonGan)}
                    </td>
                  </tr>
                  {/* 천간 row */}
                  <tr>
                    <td className="py-1.5 text-gray-300">?</td>
                    <td className="py-1.5 bg-indigo-50/30">
                      <SajuBadge stem={saju.saju.day.stem} size="sm" />
                    </td>
                    <td className="py-1.5">
                      <SajuBadge stem={saju.saju.month.stem} size="sm" />
                    </td>
                    <td className="py-1.5">
                      <SajuBadge stem={saju.saju.year.stem} size="sm" />
                    </td>
                  </tr>
                  {/* 지지 row */}
                  <tr>
                    <td className="py-1.5 text-gray-300">?</td>
                    <td className="py-1.5 bg-indigo-50/30">
                      <SajuBadge branch={saju.saju.day.branch} size="sm" />
                    </td>
                    <td className="py-1.5">
                      <SajuBadge branch={saju.saju.month.branch} size="sm" />
                    </td>
                    <td className="py-1.5">
                      <SajuBadge branch={saju.saju.year.branch} size="sm" />
                    </td>
                  </tr>
                  {/* 지지 본기 십성 row */}
                  <tr>
                    <td className="pb-1.5 text-[9px] text-gray-400">?</td>
                    <td className="pb-1.5 text-[9px] text-gray-500 font-medium bg-indigo-50/30">
                      {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.day.branch as JiJi))}
                    </td>
                    <td className="pb-1.5 text-[9px] text-gray-500 font-medium">
                      {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.month.branch as JiJi))}
                    </td>
                    <td className="pb-1.5 text-[9px] text-gray-500 font-medium">
                      {getSipSin(saju.saju.day.stem as CheonGan, getBongi(saju.saju.year.branch as JiJi))}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Deep bio button */}
        {hasDeepBioSync(person.id) ? (
          <button
            onClick={() => setShowDeepBio(true)}
            className="w-full mt-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
          >
            {lang === 'ko' ? '자세히 보기 →' : 'View profile →'}
          </button>
        ) : (
          <div className="w-full mt-3 py-2 text-xs font-medium text-gray-400 bg-gray-50 rounded-lg text-center cursor-default">
            {lang === 'ko' ? '상세 프로필 준비 중' : 'Profile coming soon'}
          </div>
        )}
      </div>

      {/* Deep bio modal */}
      {showDeepBio && (
        <Suspense fallback={null}>
          <DeepBioModal person={person} onClose={() => setShowDeepBio(false)} />
        </Suspense>
      )}
    </div>
  );
}
