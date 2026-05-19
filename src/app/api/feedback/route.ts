import { Redis } from '@upstash/redis';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';

/**
 * POST /api/feedback
 *
 * Anonymous feedback from the match results page — a thumbs up/down vote
 * plus an optional free-text comment.
 *
 * Storage (Upstash Redis):
 *   - `feedback:counters` (hash): { like: <n>, dislike: <n> } — HINCRBY on each vote
 *   - `feedback:comments` (list): LPUSH of {vote, comment, ilju, lang, at, ua}
 *     when the user leaves a comment. Capped at 1000 entries via LTRIM so the
 *     list can't grow unbounded.
 *
 * Two valid request shapes:
 *   { vote: 'like' | 'dislike' }                    — vote only
 *   { vote, comment: string }                       — vote + comment
 *   { comment: string, refVote?: 'like'|'dislike' } — comment after a prior vote
 *
 * Response: { ok: true } on success.
 */

export const runtime = 'nodejs';

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

const VOTE_VALUES = new Set(['like', 'dislike']);
const MAX_COMMENT_LEN = 2000;
const MAX_COMMENTS_KEPT = 1000;

interface FeedbackBody {
  vote?: unknown;
  comment?: unknown;
  ilju?: unknown;
  lang?: unknown;
}

export async function POST(req: NextRequest) {
  // 20 feedback events per hour per IP — generous enough that vote +
  // comment + retry all fit, tight enough that a bot can't flood.
  const { allowed } = await rateLimit('feedback', getIp(req), 20, 3600);
  if (!allowed) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: FeedbackBody;
  try {
    body = (await req.json()) as FeedbackBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const vote = typeof body.vote === 'string' && VOTE_VALUES.has(body.vote)
    ? (body.vote as 'like' | 'dislike')
    : null;
  const comment =
    typeof body.comment === 'string' ? body.comment.trim().slice(0, MAX_COMMENT_LEN) : '';
  const ilju = typeof body.ilju === 'string' ? body.ilju.slice(0, 8) : '';
  const lang = body.lang === 'en' ? 'en' : 'ko';

  if (!vote && !comment) {
    return Response.json({ error: 'empty_feedback' }, { status: 400 });
  }

  const now = Date.now();
  const ua = req.headers.get('user-agent')?.slice(0, 256) ?? '';

  try {
    const redis = getRedis();

    if (vote) {
      await redis.hincrby('feedback:counters', vote, 1);
    }

    if (comment) {
      await redis.lpush(
        'feedback:comments',
        JSON.stringify({ vote, comment, ilju, lang, at: now, ua }),
      );
      // Keep only the most recent N comments so the list can't grow forever.
      await redis.ltrim('feedback:comments', 0, MAX_COMMENTS_KEPT - 1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'storage_error';
    console.error('[feedback] failed to persist:', msg);
    return Response.json({ error: 'storage_error' }, { status: 500 });
  }

  return Response.json({ ok: true });
}
