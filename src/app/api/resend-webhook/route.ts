import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { recordEvent } from '@/lib/emailLog';

/**
 * POST /api/resend-webhook
 *
 * Receives Resend delivery events (sent / delivered / bounced / complained /
 * opened / clicked) and persists them permanently via @/lib/emailLog.
 *
 * This is the durable backstop for recipient addresses: Resend's own
 * dashboard only retains message history for about a month, so anything we
 * don't capture here is gone for good. recordEvent() writes every recipient
 * into the `sent:emails` sorted set, meaning even sends that never went
 * through /api/send-match-email (dashboard broadcasts, other services) end
 * up in our permanent list.
 *
 * SETUP (must be done in the Resend dashboard — I can't do it for you):
 *   1. Resend → Webhooks → Add Endpoint
 *   2. URL: https://bujasaju.com/api/resend-webhook
 *   3. Subscribe to: email.sent, email.delivered, email.delivery_delayed,
 *      email.bounced, email.complained, email.opened, email.clicked
 *   4. Copy the signing secret (starts with `whsec_`) into the Vercel env
 *      var RESEND_WEBHOOK_SECRET, then redeploy.
 *
 * Signature verification follows the Svix scheme Resend uses. We implement
 * it with node:crypto instead of pulling in the `svix` package — it's a
 * single HMAC-SHA256 and avoids a dependency for ~30 lines.
 */

export const runtime = 'nodejs';

/** Reject replayed/stale deliveries. Svix's own tolerance is 5 minutes. */
const TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Verify a Svix-signed webhook.
 *
 * Signed content is `${id}.${timestamp}.${payload}`, HMAC-SHA256'd with the
 * base64 secret (after stripping the `whsec_` prefix). The `svix-signature`
 * header may carry several space-separated `v1,<sig>` values during secret
 * rotation — any one matching is a pass.
 */
function verifySignature(
  payload: string,
  headers: { id: string; timestamp: string; signature: string },
  secret: string,
): { ok: true } | { ok: false; reason: string } {
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: 'bad_timestamp' };
  // Svix timestamps are unix SECONDS.
  if (Math.abs(Date.now() - ts * 1000) > TOLERANCE_MS) {
    return { ok: false, reason: 'timestamp_out_of_tolerance' };
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key)
    .update(`${headers.id}.${headers.timestamp}.${payload}`)
    .digest();

  // Header format: "v1,<base64sig> v1,<base64sig>"
  for (const part of headers.signature.split(' ')) {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) continue;
    let given: Buffer;
    try {
      given = Buffer.from(sig, 'base64');
    } catch {
      continue;
    }
    // timingSafeEqual throws on length mismatch — guard first.
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      return { ok: true };
    }
  }
  return { ok: false, reason: 'no_matching_signature' };
}

/** Resend nests the interesting fields under `data`. */
interface ResendWebhookBody {
  type?: unknown;
  created_at?: unknown;
  data?: {
    email_id?: unknown;
    to?: unknown;
    from?: unknown;
    subject?: unknown;
    created_at?: unknown;
  };
}

function asStringArray(v: unknown): string[] {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return [];
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Fail closed. An unauthenticated endpoint that writes to our permanent
    // email store would let anyone poison it.
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not configured — rejecting');
    return Response.json({ error: 'not_configured' }, { status: 500 });
  }

  // Must read the RAW body: the signature covers the exact bytes sent, so
  // parsing to JSON first and re-stringifying would break verification.
  const payload = await req.text();

  const id = req.headers.get('svix-id');
  const timestamp = req.headers.get('svix-timestamp');
  const signature = req.headers.get('svix-signature');
  if (!id || !timestamp || !signature) {
    return Response.json({ error: 'missing_signature_headers' }, { status: 400 });
  }

  const verified = verifySignature(payload, { id, timestamp, signature }, secret);
  if (!verified.ok) {
    console.warn('[resend-webhook] rejected:', verified.reason);
    return Response.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let body: ResendWebhookBody;
  try {
    body = JSON.parse(payload) as ResendWebhookBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const type = asString(body.type);
  if (!type) {
    return Response.json({ error: 'missing_type' }, { status: 400 });
  }

  const data = body.data ?? {};
  const emails = asStringArray(data.to);
  if (emails.length === 0) {
    // Nothing to record, but this is a well-formed authenticated request —
    // 200 so Resend doesn't retry it forever.
    console.warn('[resend-webhook] event with no recipients:', type);
    return Response.json({ ok: true });
  }

  await recordEvent({
    type,
    messageId: asString(data.email_id),
    emails,
    subject: asString(data.subject),
    from: asString(data.from),
    createdAt: asString(data.created_at) ?? asString(body.created_at),
  });

  console.log('[resend-webhook]', type, asString(data.email_id), '→', emails.join(','));
  return Response.json({ ok: true });
}
