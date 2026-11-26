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

/**
 * Vercel's Pro plan keeps only 2 properties per custom event, so each event
 * names the 2 worth breaking down in the Vercel dashboard. GA4 still gets
 * every property — it is the place for detailed breakdowns. Events not
 * listed here send their first 2 properties to Vercel.
 */
const VERCEL_MAX_PROPS = 2;
const VERCEL_PROPS: Record<string, readonly string[]> = {
  quiz_started: ['mode', 'gender'],
  quiz_confirmed: ['ilju', 'mode'],
  quiz_results_shown: ['ilju', 'gyeokguk'],
  results_revisited: ['ilju'],
  cta_click: ['cta', 'person_id'],
  share_click: ['channel'],
  feedback_vote: ['vote', 'ilju'],
  feedback_comment: ['vote'],
  interest_pick: ['interest', 'ilju'],
  email_gate_viewed: ['capture_source', 'ui_language'],
  email_form_started: ['capture_source', 'ui_language'],
  sign_up: ['capture_source', 'subscriber_status'],
  email_signup_repeated: ['capture_source', 'subscriber_status'],
  email_signup_failed: ['capture_source', 'failure_reason'],
};

function vercelProps(name: string, props?: EventProps): EventProps | undefined {
  if (!props) return undefined;
  const keys = (VERCEL_PROPS[name] ?? Object.keys(props)).slice(0, VERCEL_MAX_PROPS);
  const picked: EventProps = {};
  for (const key of keys) {
    if (key in props) picked[key] = props[key];
  }
  return Object.keys(picked).length > 0 ? picked : undefined;
}

export function trackEvent(name: string, props?: EventProps): void {
  track(name, vercelProps(name, props));

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', name, props ?? {});
  }
}
