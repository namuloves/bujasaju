/**
 * Shared email validation.
 *
 * This regex was copy-pasted into six files — three API routes and three
 * client components. Client and server each validate (the client for
 * instant feedback, the server as the source of truth), so any drift
 * between copies shows up as a form that accepts an address the API then
 * rejects. Importing one constant makes that impossible.
 *
 * Deliberately NOT RFC 5322. Full compliance accepts addresses no real
 * mail provider issues, and the goal here is only "won't obviously bounce
 * and isn't a typo". Resend is the real arbiter of deliverability.
 */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Longest address we accept. Matches the practical limit in RFC 5321. */
export const MAX_EMAIL_LENGTH = 254;

/**
 * Normalize then validate. Returns the cleaned address, or null if invalid.
 *
 * Lowercasing matters beyond tidiness: the suppression sets, the subscriber
 * list and the send log are all keyed by address, so `Foo@Bar.com` and
 * `foo@bar.com` must resolve to one key or a bounced address could slip
 * past the suppression check under different casing.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  if (!email || email.length > MAX_EMAIL_LENGTH) return null;
  if (!EMAIL_RE.test(email)) return null;
  return email;
}
