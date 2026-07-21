import { readFile } from 'node:fs/promises';
import type { NextRequest } from 'next/server';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { deepBioSearchPath } from '@/lib/data/paths';

/**
 * GET /api/search?q=...
 *
 * Deep-bio full-text search. Returns only the IDs of people whose researched
 * bio text matches — never the text itself.
 *
 * Replaces the client-side lookup in BrowseTab.tsx, which downloaded the
 * whole 7.1MB deep-bio-search.json corpus into the browser just to test
 * `index[personId].includes(query)`. That file was the single largest
 * content leak on the site: one static request, no rate limit, and it
 * contained the full searchable text of every deep bio.
 *
 * Names, companies and short bios are NOT searched here — those fields ride
 * along in /api/people and BrowseTab still matches them locally, so typing
 * stays instant for the common case. This endpoint only covers the deep-bio
 * text the client no longer holds.
 *
 * The response is IDs only, so scraping it yields no content: an attacker
 * would have to guess terms and could still only learn "person N mentions
 * this word" — not read anything.
 */

export const runtime = 'nodejs';

/** Keyed by person ID; the value is that person's concatenated bio text. */
type SearchIndex = Record<string, string>;

const MIN_QUERY_LENGTH = 2;
/** Bound the response so a 1-char-ish query can't return the whole roster. */
const MAX_RESULTS = 500;

/**
 * Parsed once per process. ~7MB of JSON, so re-reading per request would
 * dominate the response time.
 */
let _index: SearchIndex | null = null;
let _indexPromise: Promise<SearchIndex> | null = null;

async function getIndex(): Promise<SearchIndex> {
  if (_index) return _index;
  // Share one in-flight read across concurrent requests during a cold start.
  if (!_indexPromise) {
    _indexPromise = readFile(deepBioSearchPath(), 'utf8')
      .then((raw) => {
        _index = JSON.parse(raw) as SearchIndex;
        return _index;
      })
      .catch((err) => {
        _indexPromise = null; // allow a retry on the next request
        throw err;
      });
  }
  return _indexPromise;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();

  if (q.length < MIN_QUERY_LENGTH) {
    return Response.json({ ids: [] });
  }

  // Generous: this fires on debounced keystrokes, so a user refining a query
  // legitimately sends several requests in a row.
  const { allowed } = await rateLimit('search', getIp(req), 40, 60);
  if (!allowed) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let index: SearchIndex;
  try {
    index = await getIndex();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'index load failed';
    console.error('[api/search] could not load index:', msg);
    // Degrade quietly: BrowseTab still has local name/bio matching, so an
    // empty deep-bio result set just narrows the search rather than erroring.
    return Response.json({ ids: [] });
  }

  const ids: string[] = [];
  for (const personId in index) {
    if (index[personId]?.includes(q)) {
      ids.push(personId);
      if (ids.length >= MAX_RESULTS) break;
    }
  }

  return Response.json(
    { ids },
    {
      headers: {
        // Same query returns the same IDs until the data is rebuilt, so let
        // the edge absorb repeats of popular searches.
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
