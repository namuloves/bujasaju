import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { INTERNAL_COOKIE, INTERNAL_COOKIE_MAX_AGE, internalKey } from '@/lib/dev/gate';

/**
 * GET /api/dev/login?key=…  → sets the internal-tools cookie, redirects to
 * /dev/birthday-cards. Bookmark this once per device.
 * GET /api/dev/login?logout=1 → clears it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const to = new URL('/dev/birthday-cards', req.url);

  if (sp.get('logout') === '1') {
    const res = NextResponse.redirect(new URL('/', req.url));
    res.cookies.set(INTERNAL_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
  }

  const expected = internalKey();
  const key = sp.get('key') || '';
  if (process.env.NODE_ENV === 'production' && (!expected || key !== expected)) {
    return new Response('Not found', { status: 404 });
  }

  const res = NextResponse.redirect(to);
  res.cookies.set(INTERNAL_COOKIE, expected ?? 'dev', {
    path: '/',
    maxAge: INTERNAL_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
