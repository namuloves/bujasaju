import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/ilju-summary/<일주>   e.g. /api/ilju-summary/갑자
 *
 * One entry of public/saju-data/ilju-summary.json. IljuReading used to
 * download the whole 348KB file to show a single 일주; this returns ~6KB.
 */

export const runtime = 'nodejs';

let _data: Record<string, unknown> | null = null;

function load(): Record<string, unknown> {
  if (_data) return _data;
  const raw = readFileSync(join(process.cwd(), 'public', 'saju-data', 'ilju-summary.json'), 'utf8');
  _data = JSON.parse(raw) as Record<string, unknown>;
  return _data;
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ ilju: string }> }) {
  const { ilju } = await ctx.params;
  const key = decode(ilju);
  const entry = load()[key];
  if (!entry) return Response.json({ error: 'not_found' }, { status: 404 });
  return Response.json(entry, {
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
    },
  });
}
