/**
 * Render the MatchUnlockEmail to a static HTML file for visual review.
 * Run: npx tsx scripts/preview-email.tsx
 * Then open .lazyweb/email-preview.html in a browser.
 */

import { render } from '@react-email/components';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import MatchUnlockEmail from '../src/emails/MatchUnlockEmail';

/** Mirror of composeParagraph() in /api/send-match-email so the preview
 *  shows what the real email will look like. */
function composeParagraph(bioKo: string | null, deep: Record<string, unknown> | null): string {
  const fragments: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string | undefined | null) => {
    if (!raw) return;
    const t = raw.trim();
    if (t.length < 8) return;
    const key = t.slice(0, 40);
    if (seen.has(key)) return;
    seen.add(key);
    fragments.push(/[.!?。]$/.test(t) ? t : `${t}.`);
  };
  add(bioKo);
  if (deep) {
    const child = deep.childhood as Record<string, unknown> | undefined;
    add(child?.summaryKo as string | undefined);
    if (fragments.length < 2) add(child?.earlyLifeKo as string | undefined);
    const cap = deep.capitalOrigin as Record<string, unknown> | undefined;
    add(cap?.explanationKo as string | undefined);
  }
  const out = fragments.slice(0, 4).join(' ');
  if (out.length > 600) return out.slice(0, 598).trimEnd() + '…';
  return out;
}

function readDeepBioV2(personId: string): Record<string, unknown> | null {
  const path = join(process.cwd(), 'public', 'deep-bios-v2', `${personId}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// Sample matches sourced from the real enriched-billionaires.json so the
// preview links resolve to actual /profile/<id> pages. IDs are simple
// numeric strings like the rest of the dataset.
import { readFileSync } from 'node:fs';

type EnrichedRecord = {
  id: string;
  name: string;
  nameKo?: string;
  photoUrl?: string | null;
  nationality?: string;
  industry?: string;
  netWorth: number;
  bioKo?: string;
  bio?: string;
};

const enrichedPath = resolve(process.cwd(), 'public/enriched-billionaires.json');
const allPeople: EnrichedRecord[] = JSON.parse(readFileSync(enrichedPath, 'utf8'));

// Prefer people who have a v2 deep-bio so the preview shows the real
// composed paragraph instead of just the one-liner bioKo.
const withDeepBio = allPeople.filter(
  (p) => p.photoUrl && Number.isFinite(p.netWorth) && existsSync(join(process.cwd(), 'public', 'deep-bios-v2', `${p.id}.json`)),
);
const fallback = allPeople.filter((p) => p.photoUrl && Number.isFinite(p.netWorth));

const mockMatches = (withDeepBio.length >= 5 ? withDeepBio : fallback)
  .sort((a, b) => b.netWorth - a.netWorth)
  .slice(0, 5)
  .map((p) => {
    const deep = readDeepBioV2(p.id);
    const paragraph = composeParagraph(p.bioKo ?? null, deep);
    return {
      id: p.id,
      name: p.name,
      nameKo: p.nameKo ?? null,
      photoUrl: p.photoUrl ?? null,
      nationality: p.nationality,
      industry: p.industry,
      netWorth: p.netWorth,
      bioKo: paragraph || p.bioKo || null,
      bio: p.bio ?? null,
    };
  });

async function main() {
  const html = await render(
    MatchUnlockEmail({
      ilju: '임진',
      matches: mockMatches,
      origin: 'https://bujasaju.com',
    }),
  );

  const outPath = resolve(process.cwd(), '.lazyweb/email-preview.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, 'utf8');
  console.log(`✅ Wrote ${outPath}`);
  console.log(`Open in your browser:\n  open ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
