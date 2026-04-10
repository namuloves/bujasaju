/**
 * Applies a name → photoUrl JSON map to src/lib/data/billionaires.ts.
 * Only updates entries that currently use a ui-avatars placeholder.
 *
 * Usage:
 *   npx tsx scripts/apply-photos-from-json.ts <map.json>
 *
 * Example:
 *   npx tsx scripts/apply-photos-from-json.ts scripts/photos-serper-high-conf.json
 */

import * as fs from 'fs';

const BILLIONAIRES_PATH = '/Users/namu_1/sajubuja/src/lib/data/billionaires.ts';

function escapeForSingleQuoted(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function main() {
  const mapPath = process.argv[2];
  if (!mapPath) {
    console.error('Usage: npx tsx scripts/apply-photos-from-json.ts <map.json>');
    process.exit(1);
  }
  if (!fs.existsSync(mapPath)) {
    console.error(`Map file not found: ${mapPath}`);
    process.exit(1);
  }

  const photoMap: Record<string, string> = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  console.log(`Loaded ${Object.keys(photoMap).length} photo URLs from ${mapPath}`);

  let content = fs.readFileSync(BILLIONAIRES_PATH, 'utf8');
  let applied = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [name, photoUrl] of Object.entries(photoMap)) {
    // Find the line for this person — match name field exactly
    const escapedName = escapeForSingleQuoted(name);
    const lineRegex = new RegExp(
      `^(\\s*\\{ id: '\\d+', name: '${escapedName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',[^\\n]*?)photoUrl: 'https://ui-avatars\\.com/api/[^']+'(.*)$`,
      'm'
    );

    const m = content.match(lineRegex);
    if (!m) {
      // Either name doesn't exist or it doesn't have a ui-avatars placeholder
      const altMatch = content.match(
        new RegExp(`name: '${escapedName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',`)
      );
      if (altMatch) skipped++;
      else notFound++;
      continue;
    }

    const replacement = `${m[1]}photoUrl: '${escapeForSingleQuoted(photoUrl)}'${m[2]}`;
    content = content.replace(lineRegex, replacement);
    applied++;
  }

  fs.writeFileSync(BILLIONAIRES_PATH, content);

  console.log();
  console.log('=== APPLY SUMMARY ===');
  console.log(`Applied        : ${applied}`);
  console.log(`Skipped (no ui-avatars placeholder): ${skipped}`);
  console.log(`Not found (name doesn't exist)    : ${notFound}`);
  console.log(`Total in map   : ${Object.keys(photoMap).length}`);

  // Final ui-avatars count
  const remaining = (content.match(/ui-avatars\.com/g) || []).length;
  console.log(`\nui-avatars.com placeholders remaining: ${remaining}`);
}

main();
