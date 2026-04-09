'use client';

import { useState } from 'react';
import { EnrichedPerson } from '@/lib/saju/types';
import { GYEOKGUK_NAMES, STEM_TO_OHAENG, BRANCH_TO_OHAENG, OHAENG_COLORS } from '@/lib/saju/constants';
import SajuBadge from './SajuBadge';
import { useLanguage } from '@/lib/i18n';
import { nationalityToKorean } from './FilterPanel';

interface PersonCardProps {
  person: EnrichedPerson;
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

function formatNetWorth(netWorth: number): string {
  if (netWorth >= 1) return `$${netWorth.toFixed(1)}B`;
  return `$${(netWorth * 1000).toFixed(0)}M`;
}

function formatBirthday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
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

export default function PersonCard({ person }: PersonCardProps) {
  const [showChart, setShowChart] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const { t, lang } = useLanguage();
  const { saju } = person;
  const hanja = GYEOKGUK_NAMES[saju.gyeokguk] || '';
  // Prefer Korean bio when in KO mode, fall back to English if not yet translated.
  const displayBio = lang === 'ko' ? (person.bioKo ?? person.bio) : person.bio;
  const teaser = displayBio ? bioTeaser(displayBio) : null;

  return (
    <div className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200">
      {/* Photo */}
      <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden">
        <img
          src={person.photoUrl}
          alt={person.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
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
        <p className="text-xs text-gray-400 mt-0.5">{formatNetWorth(person.netWorth)}</p>

        {/* Birthplace */}
        <p className="text-xs text-gray-400 mt-0.5">
          {lang === 'ko' ? nationalityToKorean(person.nationality) : getBirthplace(person.nationality)}
        </p>

        {/* Bio teaser + expand toggle */}
        {teaser && (
          <div className="mt-2">
            <p className="text-xs text-gray-600 leading-snug">
              {showBio ? displayBio : teaser.text}
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
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
