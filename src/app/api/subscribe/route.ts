import { getRedis } from '@/lib/redis';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { EMAIL_RE } from '@/lib/email';

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

// Permissive but sane email check. We don't need RFC 5322 — we need
// "won't obviously bounce and isn't a typo". The server is the source
// of truth; the client does the same regex for immediate feedback.

interface SubscribeBody {
  email?: unknown;
  consent?: unknown;
  lang?: unknown;
  // Optional — lets us tag signups by surface (e.g. "match-results") if
  // we add more capture points later without changing the schema.
  source?: unknown;
  // Submission context. Stored so we can replay the match email later
  // if the Resend send failed (or build a re-engagement send).
  ilju?: unknown;
  matchIds?: unknown;
}

const MAX_MATCH_IDS = 10;

function sanitizeMatchIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw.slice(0, MAX_MATCH_IDS)) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim().slice(0, 64);
    if (trimmed) out.push(trimmed);
  }
  return out;
}

export async function POST(req: NextRequest) {
  // Rate limit: 5 subscribe attempts per hour per IP
  const { allowed } = await rateLimit('subscribe', getIp(req), 5, 3600);
  if (!allowed) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: SubscribeBody;
  let isNewSubscriber = false;

  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const consent = body.consent === true;
  const lang = body.lang === 'en' ? 'en' : 'ko';
  const source = typeof body.source === 'string' ? body.source.slice(0, 32) : 'match-results';
  const ilju = typeof body.ilju === 'string' ? body.ilju.trim().slice(0, 4) : '';
  const matchIds = sanitizeMatchIds(body.matchIds);

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
    // Unlike most callers, this route fails CLOSED: its entire purpose is to
    // persist the signup, so silently succeeding without storage would lose
    // the address. The catch below turns this into a 500.
    const redis = getRedis();
    if (!redis) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN not configured');
    // ZADD with NX: only set the score if the member doesn't already
    // exist. That way the score == first signup timestamp, even on
    // repeat submissions.
    const added = await redis.zadd('emails', { nx: true }, { score: now, member: rawEmail });
    isNewSubscriber = added === 1;
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
      // Submission context — overwritten on each submit so the hash always
      // reflects the *latest* ilju + matches. Full history lives in the
      // `submissions` list below.
      lastIlju: ilju,
      lastMatchIds: matchIds.join(','),
    });
    // Set firstSeenAt only if it doesn't exist yet.
    await redis.hsetnx(`email:${rawEmail}`, 'firstSeenAt', String(now));

    // Append a full submission record so we can replay any specific
    // attempt later (e.g. if Resend was misconfigured at the time).
    // Stored as JSON in a Redis list — newest pushed to the head.
    if (ilju && matchIds.length > 0) {
      const submission = JSON.stringify({
        email: rawEmail,
        ilju,
        matchIds,
        lang,
        source,
        at: now,
      });
      await redis.lpush('submissions', submission);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'storage_error';
    console.error('[subscribe] failed to persist:', msg);
    return Response.json({ error: 'storage_error' }, { status: 500 });
  }

  return Response.json({ ok: true, isNewSubscriber });
}
