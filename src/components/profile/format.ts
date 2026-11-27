/**
 * Small formatting helpers shared by the profile pages (v1 and v2).
 */

import type { DeepBio } from '@/lib/deepBio';
import { USD_TO_KRW } from '@/lib/usdToKrw';

/** Net worth in billions USD → "68조원" / "6,219억원" (ko) or "$46.0B" / "$420M". */
export function formatNetWorth(netWorthB: number, isKo: boolean): string {
  if (isKo) {
    const eok = netWorthB * 10 * USD_TO_KRW; // 10억 달러 단위 → 억원 단위
    const jo = eok / 10000;
    if (jo >= 1) {
      return `${jo >= 10 ? Math.round(jo) : jo.toFixed(1)}조원`;
    }
    return `${Math.round(eok).toLocaleString('ko-KR')}억원`;
  }
  if (netWorthB >= 1) return `$${netWorthB.toFixed(1)}B`;
  return `$${(netWorthB * 1000).toFixed(0)}M`;
}

/**
 * "As of" for the headline number: the last editorial pass on the bio when
 * there is one, else the latest year in the wealth history.
 */
export function netWorthAsOfLabel(bio: DeepBio | null, lang: string): string | null {
  if (bio?.updatedAt) {
    const d = bio.updatedAt.replace(/-/g, '.');
    return lang === 'ko' ? `${d} 업데이트` : `updated ${d}`;
  }
  const last = bio?.wealthHistory?.[bio.wealthHistory.length - 1]?.year;
  if (last) return lang === 'ko' ? `${last}년 포브스 기준` : `Forbes, ${last}`;
  return null;
}

/** Protocol-relative and http photo URLs → https. Null when there is none. */
export function normalizePhotoUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http://')) return url.replace(/^http:/, 'https:');
  return url;
}

/** Wikimedia hotlinks → our /api/wiki-image proxy (browser ORB and hotlink
 *  rate limits), as the cards and the old overlay do. Other URLs unchanged. */
export function proxyWikimedia(url: string | null): string | null {
  if (url && url.includes('upload.wikimedia.org/')) {
    return `/api/wiki-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Generated initials avatar (ui-avatars.com) — v1's no-photo fallback. */
export function uiAvatarUrl(name: string, size: number): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=${size}&background=random&bold=true`;
}
