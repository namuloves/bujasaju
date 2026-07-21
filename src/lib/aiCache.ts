/**
 * Response cache for the OpenAI-backed saju routes.
 *
 * Why: both AI routes previously sent `Cache-Control: no-store` and cached
 * nothing server-side, so identical requests paid OpenAI every time. The
 * inputs are deterministic — a given (user saju, featured person, language)
 * triple always warrants the same reading — so repeat requests are pure
 * waste. Crawlers replaying profile pages made this worse.
 *
 * Storage is the Upstash Redis already used elsewhere. Keys are
 * `ai:<route>:<sha256 of canonical input>` with a bounded TTL, so a prompt
 * change eventually rolls off even for inputs we've seen before.
 *
 * Note `temperature: 0.5` means output isn't strictly deterministic, so a
 * cache hit returns *a* valid prior reading rather than a freshly sampled
 * one. That's the intended trade: identical input, identical answer.
 *
 * Every function is best-effort and never throws — a cache failure must
 * degrade to "call OpenAI", never to a broken response.
 */

import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';

/**
 * 30 days. Long enough that repeat visitors and crawler replays are free,
 * short enough that prompt/template changes propagate without a manual
 * flush. Bump CACHE_VERSION below to invalidate everything immediately.
 */
const TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Bump this whenever a prompt, model, or system message changes in a way
 * that should invalidate previously cached readings.
 */
const CACHE_VERSION = 'v1';

/** Don't cache suspiciously short output — likely a truncated/failed gen. */
const MIN_CACHEABLE_LENGTH = 80;

/**
 * Cap what we store. Redis values are cheap but unbounded writes aren't;
 * 1200 max_tokens of Korean is comfortably under this.
 */
const MAX_CACHEABLE_LENGTH = 32_000;

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}

/**
 * Build a stable cache key from arbitrary request input.
 *
 * JSON.stringify alone is NOT stable — key order varies by construction
 * site, so `{a:1,b:2}` and `{b:2,a:1}` would hash differently and silently
 * halve the hit rate. We sort keys recursively first.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) {
      const v = src[key];
      // Drop undefined so an absent key and an explicit undefined agree.
      if (v !== undefined) out[key] = canonicalize(v);
    }
    return out;
  }
  return value;
}

export function cacheKey(route: string, input: unknown): string {
  const hash = createHash('sha256')
    .update(JSON.stringify(canonicalize(input)))
    .digest('hex')
    .slice(0, 32);
  return `ai:${CACHE_VERSION}:${route}:${hash}`;
}

/** Return a cached completion, or null on miss / any failure. */
export async function getCached(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const hit = await redis.get<string>(key);
    return typeof hit === 'string' && hit.length > 0 ? hit : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[aiCache] read failed:', msg);
    return null;
  }
}

/**
 * Store a completed generation. Silently skips output that's too short
 * (likely truncated) or too long.
 */
export async function setCached(key: string, value: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  if (value.length < MIN_CACHEABLE_LENGTH || value.length > MAX_CACHEABLE_LENGTH) return;
  try {
    await redis.set(key, value, { ex: TTL_SECONDS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[aiCache] write failed:', msg);
  }
}

/**
 * Wrap a cached string as a streaming Response matching what the live
 * routes emit, so the client can't tell a hit from a miss.
 *
 * Chunked rather than sent whole: the client renders progressively, and a
 * single instant blob would look like a different (jarring) UI behaviour.
 */
export function cachedStreamResponse(text: string, extraHeaders?: Record<string, string>): Response {
  const encoder = new TextEncoder();
  const CHUNK = 24;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < text.length; i += CHUNK) {
        controller.enqueue(encoder.encode(text.slice(i, i + CHUNK)));
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
      'X-Cache': 'HIT',
      ...extraHeaders,
    },
  });
}
