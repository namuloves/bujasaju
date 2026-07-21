import path from 'path';

/**
 * Server-side filesystem paths for the bulk dataset.
 *
 * These files used to live in `public/`, which meant Next served them as
 * static assets — bypassing proxy.ts entirely. A single request for
 * `/enriched-billionaires.json` handed over the whole dataset with no
 * user-agent check and no rate limit, making the bot-blocking layer moot.
 *
 * They now live in `private-data/` at the repo root: still committed and
 * still deployed, but never web-served. Everything that needs them reads
 * from disk here, and anything the browser needs goes through an API route
 * that proxy.ts protects.
 *
 * IMPORTANT: `private-data/` is deliberately NOT named `data/` — that name
 * is gitignored (.gitignore:70), so files placed there would never deploy.
 *
 * Routes reading these via a DYNAMIC path (e.g. `${id}.json`) are not traced
 * into the serverless bundle automatically; `outputFileTracingIncludes` in
 * next.config.ts pulls them in. That failure only shows up in production, so
 * changes here should be checked on a Vercel preview deploy.
 */

const ROOT = () => path.join(process.cwd(), 'private-data');

/** Full enriched dataset (~2.8MB). Source of truth for SEO metadata. */
export const enrichedBillionairesPath = () =>
  path.join(ROOT(), 'enriched-billionaires.json');

/** Prebuilt search corpus (~7.1MB). Server-side search only. */
export const deepBioSearchPath = () => path.join(ROOT(), 'deep-bio-search.json');

/** A single v2 deep bio. */
export const deepBioV2Path = (personId: string) =>
  path.join(ROOT(), 'deep-bios-v2', `${personId}.json`);

/** A single v1 deep bio. */
export const deepBioV1Path = (personId: string) =>
  path.join(ROOT(), 'deep-bios', `${personId}.json`);
