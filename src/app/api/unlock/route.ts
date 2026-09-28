import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { UNLOCK_COOKIE, UNLOCK_MAX_AGE } from '@/lib/paywall';
import { EMAIL_RE } from '@/lib/email';

/**
 * GET /api/unlock — returns the current browser's entitlement status.
 * POST /api/unlock — exchanges an email address for full access.
 *
 * Deliberately separate from /api/subscribe even though both capture an
 * email: subscribe is rate-limited at 5/hour/IP, which is right for a
 * newsletter box but would lock out a household or office behind one NAT'd
 * IP here. This path also has to set the unlock cookie on its own response,
 * which subscribe has no reason to do.
 *
 * Access capture and marketing consent are deliberately separate:
 *   - `access:emails` records everyone who exchanged an address for access.
 *   - `emails` remains the explicit marketing-subscriber list.
 *
 * Older records predate this split, so `emails` may contain historical
 * unlocks. New unlocks only enter that set when `marketingConsent` is true.
 *
 * The cookie is the entire mechanism — there is no session or account. That
 * is a deliberate trade: near-zero friction, and the wall is a funnel rather
 * than a security boundary (see lib/paywall.ts).
 */

export const runtime = 'nodejs';


interface UnlockBody {
  email?: unknown;
  lang?: unknown;
  source?: unknown;
  marketingConsent?: unknown;
  ilju?: unknown;
  matchIds?: unknown;
}

const MAX_MATCH_IDS = 10;

function sanitizeMatchIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().slice(0, 64))
    .filter(Boolean)
    .slice(0, MAX_MATCH_IDS);
}

/**
 * Client components cannot read the httpOnly entitlement cookie directly.
 * This tiny, uncached status response lets the main results gate respect an
 * unlock that happened on a profile page (or in an earlier visit).
 */
export function GET(req: NextRequest) {
  const unlocked = req.cookies.get(UNLOCK_COOKIE)?.value === '1';
  return Response.json(
    { unlocked },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}

export async function POST(req: NextRequest) {
  // 20/hour/IP: generous enough for shared IPs and typo retries, low enough
  // that the endpoint can't be used to stuff the list.
  const { allowed } = await rateLimit('unlock', getIp(req), 20, 3600);
  if (!allowed) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: UnlockBody;
  try {
    body = (await req.json()) as UnlockBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !EMAIL_RE.test(email) || email.length > 254) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }

  const lang = body.lang === 'en' ? 'en' : 'ko';
  const source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'profile-wall';
  const marketingConsent = body.marketingConsent === true;
  const ilju = typeof body.ilju === 'string' ? body.ilju.trim().slice(0, 4) : '';
  const matchIds = sanitizeMatchIds(body.matchIds);
  const now = Date.now();
  let captured = false;
  let isNewContact = false;
  let isNewSubscriber = false;

  // Persist before unlocking, but never block access on a storage failure:
  // a Redis outage shouldn't wall a visitor who has done what we asked.
  const redis = getRedis();
  if (redis) {
    try {
      // Access contacts are not marketing subscribers by default. NX keeps
      // the score pinned to the first unlock for chronological exports.
      const addedContact = await redis.zadd(
        'access:emails',
        { nx: true },
        { score: now, member: email },
      );
      isNewContact = addedContact === 1;
      await redis.hset(`email:${email}`, {
        email,
        lang,
        source,
        accessUnlockedAt: String(now),
        lastSeenAt: String(now),
        lastIp: getIp(req).slice(0, 64),
        ...(ilju ? { lastIlju: ilju } : {}),
        ...(matchIds.length > 0 ? { lastMatchIds: matchIds.join(',') } : {}),
      });
      await redis.hsetnx(`email:${email}`, 'firstSeenAt', String(now));

      if (ilju && matchIds.length > 0) {
        await redis.lpush(
          'submissions',
          JSON.stringify({
            email,
            ilju,
            matchIds,
            lang,
            source,
            marketingConsent,
            at: now,
          }),
        );
      }

      // Consent is affirmative and sticky: leaving the optional box clear
      // does not subscribe a new contact, and does not revoke an existing
      // subscriber who may have opted in elsewhere.
      if (marketingConsent) {
        const addedSubscriber = await redis.zadd(
          'emails',
          { nx: true },
          { score: now, member: email },
        );
        isNewSubscriber = addedSubscriber === 1;
        await redis.hset(`email:${email}`, {
          consent: '1',
          marketingConsentAt: String(now),
        });
      }
      captured = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'storage error';
      console.error('[api/unlock] failed to persist email:', msg);
    }
  } else {
    console.warn('[api/unlock] Redis not configured — email NOT recorded:', email);
  }

  const res = NextResponse.json({
    ok: true,
    captured,
    isNewContact,
    isNewSubscriber,
    marketingConsent,
  });
  // httpOnly so page scripts can't forge/read entitlement state; sameSite=lax
  // keeps it attached on normal navigations from search and email links.
  res.cookies.set(UNLOCK_COOKIE, '1', {
    path: '/',
    maxAge: UNLOCK_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
