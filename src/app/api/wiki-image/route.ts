import { NextRequest } from 'next/server';

/**
 * Proxy for Wikimedia images to avoid browser ORB (Opaque Response Blocking)
 * and hotlink rate-limits. Only allows upload.wikimedia.org URLs.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return new Response('missing url', { status: 400 });

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return new Response('invalid url', { status: 400 });
  }
  if (target.hostname !== 'upload.wikimedia.org') {
    return new Response('forbidden host', { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    headers: {
      'User-Agent': 'sajubuja/1.0 (https://sajubuja.com; contact@sajubuja.com)',
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('upstream error', { status: upstream.status || 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=604800, immutable',
    },
  });
}
