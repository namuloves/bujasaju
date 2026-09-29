/**
 * Internal-tools gate.
 *
 * Marketing/dev pages under /dev and /api/dev must never be reachable by the
 * public. Locally everything is open. In production a request must either
 * carry `?key=` matching INTERNAL_TOOLS_KEY, or the cookie that
 * /api/dev/login sets after one successful key visit (so the phone only
 * needs the key once). No key configured in prod → always closed.
 */
export const INTERNAL_COOKIE = 'bs_internal';
export const INTERNAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

export function internalKey(): string | null {
  const k = process.env.INTERNAL_TOOLS_KEY;
  return k && k.length >= 8 ? k : null;
}

export function isInternalAllowed(key: string | null | undefined, cookie?: string | null): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  const expected = internalKey();
  if (!expected) return false;
  if (typeof key === 'string' && key === expected) return true;
  return typeof cookie === 'string' && cookie === expected;
}
