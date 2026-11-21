import { getAllEnrichedPeople } from '@/lib/data/enriched-server';

/**
 * GET /api/people/bios
 *
 * The `bio` / `bioKo` text that /api/people leaves out, as a compact map:
 *   { "<id>": ["<bio>", "<bioKo>"] }   (either entry may be null)
 *
 * Fetched by src/lib/data/enriched.ts right after the lite list, so cards
 * and the browse search get bios a moment after first paint instead of
 * holding the first paint hostage to ~1.1MB of text.
 */

export const runtime = 'nodejs';

let _payload: string | null = null;

function getPayload(): string {
  if (_payload) return _payload;
  const map: Record<string, [string | null, string | null]> = {};
  for (const p of getAllEnrichedPeople()) {
    if (p.bio || p.bioKo) map[p.id] = [p.bio ?? null, p.bioKo ?? null];
  }
  _payload = JSON.stringify(map);
  return _payload;
}

export async function GET() {
  try {
    return new Response(getPayload(), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Same caching policy as /api/people — identical bytes for everyone.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'load failed';
    console.error('[api/people/bios] failed to load dataset:', msg);
    return Response.json({ error: 'dataset_unavailable' }, { status: 500 });
  }
}
