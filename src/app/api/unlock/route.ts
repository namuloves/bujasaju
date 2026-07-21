import type { NextRequest } from 'next/server';
import { getRedis } from '@/lib/redis';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { UNLOCK_COOKIE, UNLOCK_MAX_AGE } from '@/lib/paywall';
import { EMAIL_RE } from '@/lib/email';

/**
 * POST /api/unlock
 *
 * Exchanges an email address for unlimited profile access.
 *
 * Deliberately separate from /api/subscribe even though both capture an
 * email: subscribe is rate-limited at 5/hour/IP, which is right for a
 * newsletter box but would lock out a household or office behind one NAT'd
 * IP here. This path also has to set the unlock cookie on its own response,
 * which subscribe has no reason to do.
 *
 * Emails land in the same `emails` sorted set, so the existing export and
 * the 42 subscribers already captured stay in one place.
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
  const now = Date.now();

  // Persist before unlocking, but never block access on a storage failure:
  // a Redis outage shouldn't wall a visitor who has done what we asked.
  const redis = getRedis();
  if (redis) {
    try {
      // NX so the score stays at first-ever signup for repeat visitors.
      await redis.zadd('emails', { nx: true }, { score: now, member: email });
      await redis.hset(`email:${email}`, {
        email,
        lang,
        source,
        lastSeenAt: String(now),
        lastIp: getIp(req).slice(0, 64),
      });
      await redis.hsetnx(`email:${email}`, 'firstSeenAt', String(now));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'storage error';
      console.error('[api/unlock] failed to persist email:', msg);
    }
  } else {
    console.warn('[api/unlock] Redis not configured — email NOT recorded:', email);
  }

  const res = Response.json({ ok: true });
  // httpOnly so page scripts can't read it; the server is the only consumer.
  // sameSite=lax keeps it attached on normal navigations from search results.
  res.headers.append(
    'Set-Cookie',
    `${UNLOCK_COOKIE}=1; Path=/; Max-Age=${UNLOCK_MAX_AGE}; HttpOnly; SameSite=Lax; Secure`,
  );
  return res;
}
