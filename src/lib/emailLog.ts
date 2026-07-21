/**
 * Durable record of every email we send, and every delivery event Resend
 * reports back about it.
 *
 * Why this exists: Resend's dashboard only retains message history for
 * ~1 month. Anything older is gone — including the recipient addresses.
 * This module keeps our own permanent copy in the Upstash Redis we already
 * use for /api/subscribe, so "who have we ever emailed?" is always
 * answerable from our own storage.
 *
 * Keys:
 *   - `sent:emails` (sorted set) — score = unix ms of the FIRST send to that
 *     address, member = email. ZADD NX so the score pins to the first send.
 *     This is the canonical "everyone we've ever emailed" list.
 *   - `sent:log` (sorted set) — score = unix ms, member = JSON send record.
 *     One entry per send (not per address), so repeat sends to the same
 *     person are all preserved. Range-queryable by time.
 *   - `sent:byEmail:<addr>` (list) — Resend message IDs sent to that address,
 *     newest first. Cheap per-recipient history lookup.
 *   - `sent:msg:<resendId>` (hash) — per-message record: recipient, subject,
 *     template, plus the latest delivery status from the webhook.
 *   - `sent:events:<resendId>` (list) — raw webhook event records for that
 *     message, newest first. Full audit trail.
 *   - `sent:bounced` / `sent:complained` (sorted sets) — score = unix ms,
 *     member = email. Suppression lists — check these before re-sending.
 *
 * Nothing here sets a TTL. That is the entire point.
 *
 * Every function is best-effort and never throws: logging must not be able
 * to fail a user-facing send. Failures are logged to console and swallowed.
 */

import { getRedis } from './redis';

export interface SendRecord {
  /** Resend message id. Absent only if the send failed before Resend replied. */
  messageId?: string | null;
  /** Recipient address, lowercased. */
  email: string;
  from: string;
  subject: string;
  /** Which email template/flow produced this — e.g. 'match-unlock'. */
  template: string;
  /** Extra flow context (ilju, match count, ...). Values kept scalar. */
  meta?: Record<string, string | number>;
  /** 'sent' when Resend accepted it, 'failed' when it rejected or threw. */
  status: 'sent' | 'failed';
  /** Populated when status === 'failed'. */
  error?: string;
}

/** Flatten meta into the hash without nesting (Redis hashes are flat). */
function flattenMeta(meta: Record<string, string | number> | undefined) {
  const out: Record<string, string> = {};
  if (!meta) return out;
  for (const [k, v] of Object.entries(meta)) {
    out[`meta_${k}`] = String(v).slice(0, 256);
  }
  return out;
}

/**
 * Record an outbound send. Call this for BOTH successes and failures —
 * a failed send still proves we had the address and intended to mail it.
 */
export async function recordSend(rec: SendRecord): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn('[emailLog] Redis not configured — send NOT recorded:', rec.email);
    return;
  }

  const email = rec.email.trim().toLowerCase();
  const now = Date.now();

  try {
    const pipe = redis.pipeline();

    // Canonical "ever emailed" set. NX so score stays at first-ever send.
    pipe.zadd('sent:emails', { nx: true }, { score: now, member: email });

    // Append-only chronological log of every individual send.
    pipe.zadd('sent:log', {
      score: now,
      member: JSON.stringify({
        at: now,
        email,
        messageId: rec.messageId ?? null,
        template: rec.template,
        subject: rec.subject,
        status: rec.status,
        ...(rec.error ? { error: rec.error.slice(0, 500) } : {}),
        ...(rec.meta ?? {}),
      }),
    });

    if (rec.messageId) {
      pipe.lpush(`sent:byEmail:${email}`, rec.messageId);
      pipe.hset(`sent:msg:${rec.messageId}`, {
        messageId: rec.messageId,
        email,
        from: rec.from.slice(0, 256),
        subject: rec.subject.slice(0, 500),
        template: rec.template,
        sentAt: String(now),
        status: rec.status,
        // Latest delivery status from the webhook. Starts unknown; the
        // webhook overwrites it as events arrive.
        deliveryStatus: 'pending',
        ...(rec.error ? { error: rec.error.slice(0, 500) } : {}),
        ...flattenMeta(rec.meta),
      });
    }

    await pipe.exec();
  } catch (err) {
    // Never let logging break a send.
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[emailLog] recordSend failed for', email, '-', msg);
  }
}

/**
 * Why we refuse to send to an address, or null when it's fine to send.
 *
 *   'bounced'    — a previous send hard-failed. The mailbox doesn't exist or
 *                  rejected us; retrying damages our sender reputation and
 *                  can get the domain blocked outright.
 *   'complained' — the recipient marked us as spam. Mailing them again is
 *                  the single fastest way to land in spam folders globally,
 *                  and in most jurisdictions it's also a legal problem.
 */
export type SuppressionReason = 'bounced' | 'complained';

/**
 * Check whether an address is suppressed.
 *
 * Fails OPEN: if Redis is unreachable we return null and let the send
 * proceed. A storage outage silently blocking every email would be a worse
 * failure than occasionally mailing one bounced address — and the webhook
 * will have recorded the bounce again anyway.
 *
 * Both lookups run in one pipeline, so this costs a single round-trip
 * (~10-20ms) on the send path.
 */
export async function getSuppression(email: string): Promise<SuppressionReason | null> {
  const redis = getRedis();
  if (!redis) return null;

  const addr = email.trim().toLowerCase();
  try {
    const pipe = redis.pipeline();
    pipe.zscore('sent:bounced', addr);
    pipe.zscore('sent:complained', addr);
    const [bounced, complained] = (await pipe.exec()) as [number | null, number | null];

    // Complaint outranks bounce: it's the more serious signal, and an
    // address can legitimately be in both sets.
    if (complained !== null && complained !== undefined) return 'complained';
    if (bounced !== null && bounced !== undefined) return 'bounced';
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[emailLog] suppression check failed (allowing send):', msg);
    return null;
  }
}

/** Resend webhook event types we care about. */
export type EmailEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.bounced'
  | 'email.complained'
  | 'email.opened'
  | 'email.clicked';

export interface EmailEvent {
  type: string;
  /** Resend message id from the event payload. */
  messageId: string | null;
  /** Recipients from the event payload, lowercased. */
  emails: string[];
  subject?: string | null;
  from?: string | null;
  /** ISO timestamp from the event payload, if present. */
  createdAt?: string | null;
}

/**
 * Record an inbound Resend webhook event.
 *
 * Crucially this ALSO writes every recipient into `sent:emails`. That way
 * the log self-heals: even if a send bypassed recordSend (a send from
 * another service, a Resend broadcast, a backfill), the webhook still
 * captures the address permanently.
 */
export async function recordEvent(ev: EmailEvent): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    console.warn('[emailLog] Redis not configured — event NOT recorded:', ev.type);
    return;
  }

  const now = Date.now();
  const emails = ev.emails.map((e) => e.trim().toLowerCase()).filter(Boolean);

  try {
    const pipe = redis.pipeline();

    for (const email of emails) {
      // Self-healing: any address Resend tells us about is an address we
      // have emailed, whether or not recordSend ran.
      pipe.zadd('sent:emails', { nx: true }, { score: now, member: email });

      // Suppression lists — these are the events you must not ignore.
      if (ev.type === 'email.bounced') {
        pipe.zadd('sent:bounced', { score: now, member: email });
      } else if (ev.type === 'email.complained') {
        pipe.zadd('sent:complained', { score: now, member: email });
      }
    }

    // Chronological event log, independent of message id so nothing is lost.
    pipe.zadd('sent:eventLog', {
      score: now,
      member: JSON.stringify({
        at: now,
        type: ev.type,
        messageId: ev.messageId,
        emails,
        subject: ev.subject ?? null,
        createdAt: ev.createdAt ?? null,
      }),
    });

    if (ev.messageId) {
      pipe.lpush(
        `sent:events:${ev.messageId}`,
        JSON.stringify({ at: now, type: ev.type, emails, createdAt: ev.createdAt ?? null }),
      );
      // Keep the message hash's latest-known status fresh. hset merges, so
      // this also creates a partial record for messages we never saw at
      // send time (e.g. broadcasts sent from the Resend dashboard).
      pipe.hset(`sent:msg:${ev.messageId}`, {
        messageId: ev.messageId,
        deliveryStatus: ev.type.replace(/^email\./, ''),
        deliveryUpdatedAt: String(now),
        ...(emails[0] ? { email: emails[0] } : {}),
        ...(ev.subject ? { subject: ev.subject.slice(0, 500) } : {}),
        ...(ev.from ? { from: ev.from.slice(0, 256) } : {}),
      });
    }

    await pipe.exec();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[emailLog] recordEvent failed for', ev.type, '-', msg);
  }
}
