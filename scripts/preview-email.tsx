/**
 * Render the MatchUnlockEmail to a static HTML file for visual review.
 * Run: npx tsx scripts/preview-email.tsx
 * Then open .lazyweb/email-preview.html in a browser.
 */

import { render } from '@react-email/components';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import MatchUnlockEmail from '../src/emails/MatchUnlockEmail';

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

// Pick the 5 richest people we have a photo for, just for the preview.
const mockMatches = allPeople
  .filter((p) => p.photoUrl && Number.isFinite(p.netWorth))
  .sort((a, b) => b.netWorth - a.netWorth)
  .slice(0, 5)
  .map((p) => ({
    id: p.id,
    name: p.name,
    nameKo: p.nameKo ?? null,
    photoUrl: p.photoUrl ?? null,
    nationality: p.nationality,
    industry: p.industry,
    netWorth: p.netWorth,
    bioKo: p.bioKo ?? null,
    bio: p.bio ?? null,
  }));

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
