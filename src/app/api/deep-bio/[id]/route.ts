import { readFile } from 'node:fs/promises';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { deepBioV1Path, deepBioV2Path } from '@/lib/data/paths';

/**
 * GET /api/deep-bio/[id]?v=2
 *
 * Serves one researched deep bio. These are the most valuable content on the
 * site (1,736 v2 + 824 v1 files, ~28MB total) and used to sit in `public/`,
 * where they were static assets — proxy.ts never saw those requests, so all
 * of them could be enumerated straight off the CDN with no rate limit.
 *
 * `v=2` selects the richer v2 bio, anything else the v1. The caller already
 * knows which exist from the public deep-bio-index.json (29KB of bare IDs,
 * no content), so this route doesn't need to probe both.
 *
 * HEAD is supported for the existence preflight in deepBio.ts:hasDeepBio().
 *
 * Rate limit is generous — a single profile view legitimately fetches one
 * bio, but a reader clicking through many people in a session is normal.
 * It's set to make enumerating all ~2,500 bios slow, not to police browsing.
 * Bulk downloads that used to take one wget now take hours and show up in
 * the logs.
 *
 * Cost note: this moves bios off the CDN and onto function invocations, so
 * `s-maxage` lets Vercel's edge absorb repeat views of popular profiles.
 */

export const runtime = 'nodejs';

/** Per-IP cap. See rationale above. */
const MAX_PER_WINDOW = 60;
const WINDOW_SECONDS = 60;

/**
 * IDs are used to build a filesystem path, so they must be validated, not
 * trusted. Only digits are allowed — every person ID in the dataset is a
 * numeric string. This makes `../` traversal impossible by construction
 * rather than by sanitising after the fact.
 */
const ID_RE = /^\d{1,12}$/;

async function loadBio(id: string, wantV2: boolean): Promise<string | null> {
  try {
    return await readFile(wantV2 ? deepBioV2Path(id) : deepBioV1Path(id), 'utf8');
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!ID_RE.test(id)) {
    return Response.json({ error: 'invalid_id' }, { status: 400 });
  }

  const { allowed } = await rateLimit('deep-bio', getIp(req), MAX_PER_WINDOW, WINDOW_SECONDS);
  if (!allowed) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 });
  }

  const wantV2 = req.nextUrl.searchParams.get('v') === '2';
  const raw = await loadBio(id, wantV2);
  if (raw === null) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  // Pass the stored JSON through verbatim — it's already the exact shape the
  // client expects, so parsing and re-serializing would only cost CPU.
  return new Response(raw, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}

/** Existence check without transferring the body (deepBio.ts:hasDeepBio). */
export async function HEAD(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID_RE.test(id)) return new Response(null, { status: 400 });

  const { allowed } = await rateLimit('deep-bio', getIp(req), MAX_PER_WINDOW, WINDOW_SECONDS);
  if (!allowed) return new Response(null, { status: 429 });

  const wantV2 = req.nextUrl.searchParams.get('v') === '2';
  const raw = await loadBio(id, wantV2);
  return new Response(null, { status: raw === null ? 404 : 200 });
}
