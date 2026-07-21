import { Redis } from '@upstash/redis';

/**
 * Shared Upstash Redis client.
 *
 * Every consumer previously carried its own copy of this lazy-init block —
 * seven of them by the time the email log, AI cache, unlock route and proxy
 * were added. They agreed on behaviour by convention rather than by
 * construction, which is exactly the kind of drift that bites later.
 *
 * Returns null (rather than throwing) when the env vars are missing, so
 * callers can decide how to degrade. Every current caller fails OPEN: a
 * storage outage should never take the site down or wall a legitimate
 * visitor. The one exception is the rate limiter, which allows the request
 * when Redis is unavailable — losing a rate limit beats losing the site.
 *
 * Lazy rather than module-scope so importing this file can't crash a cold
 * start on a preview deploy that's momentarily missing its env vars.
 */

let _redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (_redis) return _redis;
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  _redis = new Redis({ url, token });
  return _redis;
}
