import { track } from '@vercel/analytics';

/**
 * Client-side event tracking, fanned out to both analytics backends.
 *
 * WHY BOTH: Vercel Analytics is where the quiz events already went, and its
 * dashboard is the quickest read. Google Analytics is the queryable one —
 * it is also the only place profile traffic is recorded, via the automatic
 * `page_view` on /profile/[id]. Sending quiz events to Vercel alone made
 * "how many people took the quiz vs. just browsed profiles?" unanswerable,
 * because the two halves of the funnel lived in different tools. Anything
 * you want to compare against profile views has to reach GA4.
 *
 * Fire-and-forget and fully synchronous: neither call awaits, so this is
 * safe inside handlers that must preserve user activation (the Kakao share
 * popup is the case that matters — an await there gets the popup blocked).
 *
 * `gtag` is absent until @next/third-parties has loaded, and absent for the
 * whole session for anyone running an ad blocker, so the call is guarded.
 * A missed GA event is not worth an exception inside a click handler.
 *
 * Client components only — `track` is a no-op on the server.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * GA4 rejects a param whose value is a non-finite number and silently drops
 * the whole event, so keep the value type narrow and let callers pass null
 * for "known to be absent".
 */
export type EventProps = Record<string, string | number | boolean | null>;

export function trackEvent(name: string, props?: EventProps): void {
  track(name, props);

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, props ?? {});
  }
}
