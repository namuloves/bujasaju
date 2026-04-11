/**
 * Simple sliding-window rate limiter using Upstash Redis.
 *
 * Uses a Redis sorted set per key. Each request adds the current timestamp
 * as both score and member, then removes entries older than the window,
 * then counts what's left. All three ops run in a single pipeline so it's
 * one round-trip.
 *
 * Usage:
 *   const { allowed, remaining } = await rateLimit('saju-summary', ip, 10, 60);
 *   if (!allowed) return new Response('Too many requests', { status: 429 });
 */

import { Redis } from '@upstash/redis';

let _redis: Redis | null = null;
function getRedis(): Redis {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('KV env vars not configured');
  _redis = new Redis({ url, token });
  return _redis;
}

export async function rateLimit(
  route: string,
  ip: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const redis = getRedis();
  const key = `rl:${route}:${ip}`;
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Pipeline: remove stale entries → add current → count remaining
  const pipe = redis.pipeline();
  pipe.zremrangebyscore(key, 0, windowStart);
  pipe.zadd(key, { score: now, member: String(now) });
  pipe.zcard(key);
  pipe.expire(key, windowSeconds * 2); // auto-clean keys

  const results = await pipe.exec();
  const count = results[2] as number;

  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);
  return { allowed, remaining };
}

export function getIp(req: { headers: { get: (k: string) => string | null } }): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
