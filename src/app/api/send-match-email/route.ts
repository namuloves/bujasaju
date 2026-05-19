import { Resend } from 'resend';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';
import MatchUnlockEmail, { type MatchPerson } from '@/emails/MatchUnlockEmail';

/**
 * POST /api/send-match-email
 *
 * Sends the "your ilju matches" email after a visitor unlocks the gate.
 * Triggered fire-and-forget by LockedMatchesGate so the user UX doesn't
 * block on the send — Resend usually responds in 200-600ms but we never
 * want a slow mail to delay the unlock animation.
 *
 * The locked people data is forwarded from the client. We trust it
 * structurally (validated below) but not semantically — i.e. someone
 * could craft a request with arbitrary names. That's fine: the worst
 * a bad actor can do is mail themselves a customised email, and the
 * rate limit caps abuse.
 *
 * Env vars required:
 *   RESEND_API_KEY — pulled from Vercel project env
 *
 * Response: { ok: true } | { error: string } with appropriate status.
 */

export const runtime = 'nodejs';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY not configured');
  }
  _resend = new Resend(key);
  return _resend;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MATCHES = 10;

interface SendBody {
  email?: unknown;
  ilju?: unknown;
  matches?: unknown;
  lang?: unknown;
}

interface ClientMatch {
  id?: unknown;
  name?: unknown;
  nameKo?: unknown;
  photoUrl?: unknown;
  nationality?: unknown;
  industry?: unknown;
  netWorth?: unknown;
  bioKo?: unknown;
  bio?: unknown;
}

function sanitizeString(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function sanitizeMatches(raw: unknown): MatchPerson[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchPerson[] = [];
  for (const item of raw.slice(0, MAX_MATCHES)) {
    if (!item || typeof item !== 'object') continue;
    const m = item as ClientMatch;
    const id = sanitizeString(m.id, 64);
    const name = sanitizeString(m.name, 120);
    if (!id || !name) continue;
    if (typeof m.netWorth !== 'number' || !Number.isFinite(m.netWorth)) continue;
    out.push({
      id,
      name,
      nameKo: sanitizeString(m.nameKo, 120) ?? null,
      photoUrl: sanitizeString(m.photoUrl, 500) ?? null,
      nationality: sanitizeString(m.nationality, 4),
      industry: sanitizeString(m.industry, 80),
      netWorth: m.netWorth,
      // Bio is the longest field — cap generously (1200 chars) so we can
      // accept the full paragraph but still reject absurd payloads.
      bioKo: sanitizeString(m.bioKo, 1200) ?? null,
      bio: sanitizeString(m.bio, 1200) ?? null,
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  // 10 sends per hour per IP — fits a normal user (one unlock per session)
  // and a couple retries, blocks bots cold.
  const { allowed } = await rateLimit('send-match-email', getIp(req), 10, 3600);
  if (!allowed) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = sanitizeString(body.email, 254)?.toLowerCase();
  const ilju = sanitizeString(body.ilju, 4);
  const matches = sanitizeMatches(body.matches);

  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!ilju) {
    return Response.json({ error: 'missing_ilju' }, { status: 400 });
  }
  if (matches.length === 0) {
    return Response.json({ error: 'no_matches' }, { status: 400 });
  }

  // Build absolute origin so links inside the email work. Falls back to
  // the production domain if the header is missing (e.g. on a custom
  // edge runtime that strips it).
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'bujasaju.com';
  const origin = `${proto}://${host}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: '부자사주 <hello@bujasaju.com>',
      to: email,
      replyTo: 'hello@bujasaju.com',
      subject: `${ilju} 일주의 부자 ${matches.length}명을 소개해드려요`,
      react: MatchUnlockEmail({ ilju, matches, origin }),
      tags: [
        { name: 'source', value: 'unlock-gate' },
        { name: 'ilju', value: ilju },
      ],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'send_failed';
    console.error('[send-match-email] failed:', msg);
    return Response.json({ error: 'send_failed' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
