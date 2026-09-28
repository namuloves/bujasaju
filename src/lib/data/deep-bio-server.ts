import fs from 'fs';
import type { DeepBioV2 } from '@/lib/deepBio';
import { deepBioV2Path } from './paths';

/**
 * Server-side read of one v2 deep bio, for places that render before the
 * browser exists — currently `generateMetadata` on the profile route, which
 * builds the <title>/description from the reading rather than from the
 * one-line Forbes bio. The client path stays on /api/deep-bio (rate-limited,
 * edge-cached); this is a direct disk read on the same file.
 *
 * Cached per process. Files change only on deploy, so there is no
 * invalidation.
 */
const cache = new Map<string, DeepBioV2 | null>();

export function getDeepBioV2ById(id: string): DeepBioV2 | null {
  if (cache.has(id)) return cache.get(id) ?? null;
  let bio: DeepBioV2 | null = null;
  try {
    // IDs are numeric strings; anything else can't be a file we own.
    if (/^\d{1,12}$/.test(id)) {
      bio = JSON.parse(fs.readFileSync(deepBioV2Path(id), 'utf-8')) as DeepBioV2;
    }
  } catch {
    bio = null;
  }
  cache.set(id, bio);
  return bio;
}
