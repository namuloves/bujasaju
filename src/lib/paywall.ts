/**
 * Metered profile access ("flexible sampling").
 *
 * Visitors get FREE_PROFILE_VIEWS distinct profiles, after which they're
 * asked for an email to continue. Giving one sets a long-lived cookie and
 * lifts the limit — there are no passwords or accounts, which keeps friction
 * low and reuses the /api/subscribe flow that already backs the match gate.
 *
 * WHY THE QUOTA APPLIES TO CRAWLERS TOO: serving Googlebot unlimited pages
 * while walling humans is cloaking, which Google can penalise. Google's
 * documented "flexible sampling" pattern is to give everyone — crawlers
 * included — the same free allowance. Googlebot indexes the free sample and
 * the site stays compliant. That's why there is deliberately no
 * bot-exemption branch here.
 *
 * WHAT THIS DOES AND DOESN'T STOP: cookie state is client-controlled, so a
 * scraper that clears cookies (or runs headless with a fresh profile each
 * time) resets its own counter. This is a funnel, not a security boundary —
 * the actual scraping defences are proxy.ts (UA blocking + IP rate limiting)
 * and keeping the bulk dataset out of public/. What this adds is friction
 * for casual copying plus email capture from engaged readers.
 *
 * Counting is per-profile-ID, not per-request: re-reading the same person,
 * refreshing, or navigating back doesn't burn quota. Only distinct people do.
 */

/** Distinct profiles a visitor may read before the wall appears. */
export const FREE_PROFILE_VIEWS = 5;

/** Marks a visitor who has given an email. Presence alone lifts the wall. */
export const UNLOCK_COOKIE = 'bs_unlocked';

/** Stores the set of profile IDs already viewed. */
export const VIEWS_COOKIE = 'bs_views';

/** Unlock lasts a year; viewers shouldn't be re-asked every week. */
export const UNLOCK_MAX_AGE = 60 * 60 * 24 * 365;

/** The view counter rolls over monthly, restoring a free sample. */
export const VIEWS_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Cap what we store in the cookie. Once the wall is hit we stop appending,
 * so this only bounds the pre-wall list — but a hand-crafted cookie could
 * otherwise grow unbounded and blow the 4KB header limit.
 */
const MAX_TRACKED_IDS = 50;

/** Parse the viewed-IDs cookie. Tolerates absent or malformed values. */
export function parseViewedIds(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^\d{1,12}$/.test(s))
    .slice(0, MAX_TRACKED_IDS);
}

/** Serialize viewed IDs back to a cookie value. */
export function serializeViewedIds(ids: string[]): string {
  return ids.slice(-MAX_TRACKED_IDS).join(',');
}

/**
 * Decide what a visitor may do with `profileId` given their current state.
 *
 * `alreadyViewed` keeps the result stable: someone at the limit can still
 * revisit the profiles they've already read, so bookmarks and the back
 * button don't suddenly hit a wall.
 */
export function evaluateAccess(opts: {
  profileId: string;
  viewedIds: string[];
  unlocked: boolean;
}): { allowed: boolean; nextViewedIds: string[]; remaining: number } {
  const { profileId, viewedIds, unlocked } = opts;

  if (unlocked) {
    return { allowed: true, nextViewedIds: viewedIds, remaining: Infinity };
  }

  const alreadyViewed = viewedIds.includes(profileId);
  if (alreadyViewed) {
    return {
      allowed: true,
      nextViewedIds: viewedIds,
      remaining: Math.max(0, FREE_PROFILE_VIEWS - viewedIds.length),
    };
  }

  if (viewedIds.length >= FREE_PROFILE_VIEWS) {
    // At the limit and this is a new person — wall it, and don't record the
    // view so the counter can't creep past the cap.
    return { allowed: false, nextViewedIds: viewedIds, remaining: 0 };
  }

  const nextViewedIds = [...viewedIds, profileId];
  return {
    allowed: true,
    nextViewedIds,
    remaining: Math.max(0, FREE_PROFILE_VIEWS - nextViewedIds.length),
  };
}
