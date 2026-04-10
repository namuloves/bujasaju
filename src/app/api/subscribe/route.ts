import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';

/**
 * POST /api/subscribe
 *
 * Captures an email for the "new billionaires / new features" update list.
 * Storage: Upstash Redis via @upstash/redis REST client.
 *
 *   - `emails` (sorted set): score = unix ms of first signup, member = email.
 *     Using a sorted set (not a plain set) so we can export chronologically
 *     later without losing signup order. ZADD with NX so the score sticks
 *     to the *first* signup if someone submits twice.
 *   - `email:<addr>` (hash): stores per-email metadata (lang, consent, ua,
 *     first/last seen). Cheap and lets us reconstruct context if we ever
 *     migrate to a real ESP.
 *
 * Env vars (auto-injected by the Vercel ↔ Upstash integration):
 *   KV_REST_API_URL, KV_REST_API_TOKEN
 *
 * Response: { ok: true } on success, { error: string } with 4xx/5xx on failure.
 */

export const runtime = 'nodejs';

// Lazy-init so module import doesn't crash if env vars are momentarily
// missing during cold start on a misconfigured preview deploy.
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN not configured');
  }
  _redis = new Redis({ url, token });
  return _redis;
}

// Permissive but sane email check. We don't need RFC 5322 — we need
// "won't obviously bounce and isn't a typo". The server is the source
// of truth; the client does the same regex for immediate feedback.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface SubscribeBody {
  email?: unknown;
  consent?: unknown;
  lang?: unknown;
  // Optional — lets us tag signups by surface (e.g. "match-results") if
  // we add more capture points later without changing the schema.
  source?: unknown;
}

export async function POST(req: NextRequest) {
  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const consent = body.consent === true;
  const lang = body.lang === 'en' ? 'en' : 'ko';
  const source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'match-results';

  if (!rawEmail || !EMAIL_RE.test(rawEmail) || rawEmail.length > 254) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!consent) {
    return Response.json({ error: 'consent_required' }, { status: 400 });
  }

  const now = Date.now();
  const ua = req.headers.get('user-agent') ?? '';
  // Trust Vercel's forwarded IP header on production; fall back to remote.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    '';

  try {
    const redis = getRedis();
    // ZADD with NX: only set the score if the member doesn't already
    // exist. That way the score == first signup timestamp, even on
    // repeat submissions.
    await redis.zadd('emails', { nx: true }, { score: now, member: rawEmail });
    // Per-email metadata. `hset` merges, so we write first-seen once
    // (via hsetnx-style pattern by checking existence would cost an
    // extra roundtrip; instead, just always write last-seen and let
    // first-seen be set by the initial hset + firstSeen-if-absent).
    await redis.hset(`email:${rawEmail}`, {
      email: rawEmail,
      lang,
      source,
      consent: '1',
      lastSeenAt: String(now),
      lastUa: ua.slice(0, 256),
      lastIp: ip.slice(0, 64),
    });
    // Set firstSeenAt only if it doesn't exist yet.
    await redis.hsetnx(`email:${rawEmail}`, 'firstSeenAt', String(now));
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'storage_error';
    console.error('[subscribe] failed to persist:', msg);
    return Response.json({ error: 'storage_error' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
