/**
 * One-shot conversion of the 2MB `billionaires.ts` literal array into a
 * plain `billionaires.json` file that the app can import directly. Importing
 * JSON ships as data (no TS type complexity, better compression, faster
 * parse) and shrinks the initial JS bundle significantly.
 *
 * Usage: npx tsx scripts/convert-billionaires-to-json.ts
 */
import { billionaires } from '../src/lib/data/billionaires';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const outPath = join(process.cwd(), 'src/lib/data/billionaires.json');
writeFileSync(outPath, JSON.stringify(billionaires, null, 0));

console.log(`Wrote ${billionaires.length} billionaires → ${outPath}`);
