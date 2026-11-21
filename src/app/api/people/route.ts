import { getAllEnrichedPeople } from '@/lib/data/enriched-server';

/**
 * GET /api/people
 *
 * The browse/match dataset for the client.
 *
 * Replaces the old `fetch('/enriched-billionaires.json')`. That file sat in
 * `public/`, so Next served it as a static asset — which meant proxy.ts never
 * saw the request. One curl handed over the entire dataset with no
 * user-agent check and no rate limit, making the bot-blocking layer moot.
 * Serving the same data through a route puts it back behind those controls.
 *
 * On the payload: this is the LITE list — everything except `bio` and
 * `bioKo`. Those two fields were ~1.1MB of the ~2.9MB response (≈650KB →
 * ≈315KB gzipped without them) and nothing needs them for the first paint.
 * They are still rendered (PersonCard, SingleMatchCard, FeaturedPersonCard,
 * Top5FacesRow) and searched (searchAliases), so the client fetches them
 * from /api/people/bios right after this list arrives and merges them in —
 * see src/lib/data/enriched.ts. We also drop `netWorth <= 0` rows, matching
 * the filter the client already applied.
 *
 * Cost: the CDN carries this, not the function. `s-maxage` lets Vercel serve
 * repeat requests from the edge, so going from a static file to a route
 * doesn't turn into a per-visitor invocation. The payload is identical for
 * everyone, so there is nothing user-specific to leak via the shared cache.
 */

export const runtime = 'nodejs';

/**
 * Serialized once per process. The dataset is ~2.8MB and immutable at
 * runtime, so re-stringifying it per request would burn CPU for no reason.
 */
let _payload: string | null = null;

function getPayload(): string {
  if (_payload) return _payload;
  // getAllEnrichedPeople() already filters netWorth <= 0 and caches the
  // parsed array for the process lifetime.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _payload = JSON.stringify(getAllEnrichedPeople().map(({ bio, bioKo, ...rest }) => rest));
  return _payload;
}

export async function GET() {
  try {
    const body = getPayload();
    return new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        // Public + immutable-ish: same bytes for every visitor. A day of edge
        // caching with a long SWR window means near-zero function invocations
        // while still picking up a redeploy's data within a day. `max-age`
        // lets the browser reuse it for an hour, so navigating back to the
        // home page or reopening it doesn't re-download the list.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'load failed';
    console.error('[api/people] failed to load dataset:', msg);
    return Response.json({ error: 'dataset_unavailable' }, { status: 500 });
  }
}
