import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getRedis } from './lib/redis';
import {
  UNLOCK_COOKIE,
  VIEWS_COOKIE,
  VIEWS_MAX_AGE,
  evaluateAccess,
  parseViewedIds,
  serializeViewedIds,
} from './lib/paywall';

/**
 * Bot and scraper blocking.
 *
 * NOTE ON THE FILENAME: this is `proxy.ts`, not `middleware.ts`. The
 * middleware file convention is deprecated and renamed to `proxy` in this
 * Next version — a `middleware.ts` here would simply never run.
 *
 * Two independent layers, because they catch different things:
 *
 *   1. User-agent blocking — stops crawlers that honestly identify
 *      themselves (GPTBot, CCBot, Bytespider, …). Free, instant, zero
 *      false positives. Useless against anyone sending a Chrome UA.
 *
 *   2. Per-IP rate limiting — catches scraping *behavior* regardless of
 *      what the UA claims. This is what stops the real-world case we saw
 *      in the Vercel logs: ~15 profile requests inside one second.
 *
 * Layer 1 is split by path. Two of the agents we block are *user-initiated*
 * — ChatGPT-User and Claude-Web fire when a real person asks an assistant to
 * go read a page, unlike GPTBot/ClaudeBot which harvest in bulk for training.
 * Blocking those two on the marketing pages cost us referral traffic and
 * protected nothing, so they are now allowed on public pages and blocked
 * only on `/profile/*`. See ASSISTANT_UA_FRAGMENTS for why the profile
 * carve-out has to stay.
 *
 * Layer 2 is deliberately tuned LENIENTLY (60 req/min). Korean mobile
 * carriers NAT large numbers of users behind a single IP, and that is our
 * core audience — a strict threshold would block real people. A human
 * browsing hard tops out well under 60/min; the observed scraper was doing
 * roughly 900/min.
 *
 * Requests that fail either check get a 403 plus `X-Robots-Tag: noindex`.
 *
 * WHAT THIS CANNOT DO: a determined scraper rotating IPs and spoofing UAs
 * will still get through. The profile data is public by design. The goal is
 * to make casual/bulk harvesting expensive enough to not be worth it.
 */

/**
 * Crawlers blocked outright by user-agent.
 *
 * Matched case-insensitively as substrings, so 'gptbot' catches
 * "Mozilla/5.0 ... GPTBot/1.2".
 *
 * Kept in sync with the blocklist in app/robots.ts — robots.txt asks
 * politely, this enforces it for the ones that ignore the ask.
 *
 * Deliberately ABSENT (these must keep working):
 *   - googlebot / bingbot / yeti (Naver) / daum — organic search traffic
 *   - applebot — Siri/Spotlight
 *   - twitterbot / facebookexternalhit / slackbot — link preview cards
 *   - oai-searchbot — ChatGPT search citations (links back to us)
 *   - vercel — deployment/monitoring checks
 *   - go-http-client — the Go stdlib default UA. Scrapers use it, but so do
 *     uptime monitors, webhook senders and link-unfurlers; too broad to be
 *     worth the false positives.
 *   - chatgpt-user / claude-web — see ASSISTANT_UA_FRAGMENTS, they are
 *     blocked on profile routes only rather than site-wide.
 */
const BLOCKED_UA_FRAGMENTS = [
  // AI training crawlers
  'gptbot',
  'claudebot',
  'anthropic-ai',
  'google-extended',
  'ccbot',
  'applebot-extended',
  'facebookbot',
  'meta-externalagent',
  'bytespider',
  'perplexitybot',
  'amazonbot',
  'cohere-ai',
  'diffbot',
  'imagesiftbot',
  'omgilibot',
  'timpibot',
  'youbot',
  // SEO backlink crawlers — heavy load, no benefit to us
  'ahrefsbot',
  'semrushbot',
  'mj12bot',
  'dotbot',
  'dataforseobot',
  'blexbot',
  'petalbot',
  // Generic scraping tooling. These are default UAs of scripting libraries;
  // no real browser sends them.
  'scrapy',
  'python-requests',
  'python-urllib',
  'httrack',
  'wget/',
  'libwww-perl',
  'node-fetch',
  'axios/',
  'curl/',
];

/**
 * User-initiated assistant fetchers — allowed on public pages, blocked on
 * `/profile/*`.
 *
 * These fire when a person asks ChatGPT or Claude to go look at a page, so
 * there is a real human behind them and the assistant links back to us.
 * That is worth having on the marketing pages.
 *
 * They stay blocked on profiles because the metered paywall is enforced with
 * a cookie (VIEWS_COOKIE) and these fetchers do not carry cookies between
 * requests. Every fetch would look like a brand-new visitor with a fresh
 * free allowance, so a person could read the dataset profile by profile
 * through the assistant and never hit the meter. The block is what makes the
 * meter mean anything.
 */
const ASSISTANT_UA_FRAGMENTS = ['chatgpt-user', 'claude-web'];

/** Routes the metered paywall protects. Assistant fetchers are refused here. */
const METERED_PATH = /^\/profile\//;

/** Requests per window, per IP. See the leniency note above. */
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_SECONDS = 60;

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

const DEFAULT_BLOCK_MESSAGE = 'Automated access to this page is not allowed.';

function blocked(reason: string, message = DEFAULT_BLOCK_MESSAGE): NextResponse {
  // A short body rather than an empty one: anything caught here as a false
  // positive would otherwise see a blank white page with no explanation.
  return new NextResponse(`${message}\n`, {
    status: 403,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // Belt and braces: if a search engine somehow lands here, don't index
      // the error page.
      'X-Robots-Tag': 'noindex, nofollow',
      'Cache-Control': 'no-store',
      'X-Block-Reason': reason,
    },
  });
}

export async function proxy(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  const uaLower = ua.toLowerCase();

  // --- Layer 1: user-agent blocklist -------------------------------------
  for (const fragment of BLOCKED_UA_FRAGMENTS) {
    if (uaLower.includes(fragment)) {
      return blocked('ua');
    }
  }

  // An entirely absent User-Agent is a strong scraper signal — every real
  // browser sends one. Cheap win, no Redis round-trip needed.
  if (!ua.trim()) {
    return blocked('no-ua');
  }

  // --- Layer 1b: assistant fetchers, metered routes only ------------------
  if (METERED_PATH.test(req.nextUrl.pathname)) {
    for (const fragment of ASSISTANT_UA_FRAGMENTS) {
      if (uaLower.includes(fragment)) {
        return blocked(
          'ua-assistant',
          'Profile pages are limited to a few free views per visitor and cannot be read by an assistant. Please open bujasaju.com directly.',
        );
      }
    }
  }

  // --- Layer 2: per-IP rate limit ----------------------------------------
  // Redis is optional: if it isn't configured we fail OPEN and serve the
  // request. A storage outage must never take the site down — the cost of
  // a missed block is far lower than the cost of blocking everyone.
  const redis = getRedis();
  if (!redis) return NextResponse.next();

  const ip = getIp(req);
  if (ip === 'unknown') return NextResponse.next();

  try {
    const key = `bot:rl:${ip}`;
    // INCR + EXPIRE is one round-trip via pipeline and far cheaper than the
    // sorted-set sliding window in lib/rateLimit.ts. This runs on every page
    // request, so the fixed window is the right tradeoff here.
    const pipe = redis.pipeline();
    pipe.incr(key);
    pipe.expire(key, RATE_LIMIT_WINDOW_SECONDS);
    const results = (await pipe.exec()) as [number, number];
    const count = results[0];

    if (count > RATE_LIMIT_MAX) {
      return blocked('rate');
    }
  } catch {
    // Fail open on any Redis error — see note above.
    return meteredResponse(req);
  }

  return meteredResponse(req);
}

/**
 * Advance the metered-profile counter.
 *
 * This lives in proxy.ts because Next only allows cookies to be written from
 * a Route Handler, Server Action, or proxy — never while rendering. The
 * profile layout reads the counter and decides what to show; this is what
 * moves it.
 *
 * Only distinct profile IDs count, so refreshes and back-navigation don't
 * burn quota. Once the free sample is used up we stop appending, so the
 * cookie can't grow without bound.
 */
function meteredResponse(req: NextRequest): NextResponse {
  const match = /^\/profile\/(\d{1,12})\/?$/.exec(req.nextUrl.pathname);
  if (!match) return NextResponse.next();

  const profileId = match[1];
  if (req.cookies.get(UNLOCK_COOKIE)?.value === '1') {
    return NextResponse.next();
  }

  const viewedIds = parseViewedIds(req.cookies.get(VIEWS_COOKIE)?.value);
  const { nextViewedIds } = evaluateAccess({ profileId, viewedIds, unlocked: false });

  // Nothing changed (already-seen profile, or already at the limit).
  if (nextViewedIds.length === viewedIds.length) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.cookies.set(VIEWS_COOKIE, serializeViewedIds(nextViewedIds), {
    path: '/',
    maxAge: VIEWS_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
  });
  return res;
}

export const config = {
  /**
   * Run on page routes only.
   *
   * Excluded, and why:
   *   - `api/*`      — those routes have their own tighter, purpose-built
   *                    rate limits (see lib/rateLimit.ts); double-limiting
   *                    would make them stricter than intended.
   *   - `_next/*`    — build assets, served from CDN.
   *   - `robots.txt`, `sitemap.xml` — must stay reachable by crawlers, and
   *                    blocking them would defeat the robots.txt policy.
   *   - `ads.txt`    — same reasoning. Google's ads.txt fetcher must always
   *                    reach it; if the file 403s, AdSense treats the site's
   *                    inventory as unauthorized and demand drops.
   *   - static files — images/fonts/etc. don't need bot checks and would
   *                    multiply Redis calls per page view.
   */
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|ads.txt|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|css|js)$).*)',
  ],
};
