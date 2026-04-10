/**
 * Post-processing pass over photos-serper-results.json:
 *   - Downgrades AUTO → REVIEW when the top candidate looks wrong:
 *     * Wikimedia Commons results whose filename contains junk keywords
 *       (logo, product/building words, company names with no person name, etc.)
 *     * Image title is clearly about a company/product, not a person
 *   - Rewrites scripts/photos-serper-high-conf.json with only the safe auto-apply set.
 *
 * Usage:
 *   npx tsx scripts/refine-serper-results.ts
 */

import * as fs from 'fs';

const RESULTS_PATH = '/Users/namu_1/sajubuja/scripts/photos-serper-results.json';
const HIGH_CONF_PATH = '/Users/namu_1/sajubuja/scripts/photos-serper-high-conf.json';

// Filename / title tokens that indicate a non-person image.
const JUNK_FILENAME_KEYWORDS = [
  'logo',
  '.svg',
  'travel stop',
  'headquarters',
  'building',
  'factory',
  'tower',
  'complex',
  'recycler',
  'truck',
  'ship',
  'porte-conteneurs',
  'container',
  'wafers', // "BalajiWafersLogo" etc
  'circuit',
  'breaker',
  'chart',
  'graph',
  'map',
  'diagram',
  'product',
  'package',
  'bottle',
  'store',
  'office',
];

const JUNK_TITLE_KEYWORDS = [
  'headquarters',
  'company logo',
  'corporate logo',
  'product photo',
  'building exterior',
  'factory',
  'warehouse',
  'logo',
];

function isJunkImage(filename: string, title: string): boolean {
  const fnLower = filename.toLowerCase();
  const titleLower = title.toLowerCase();

  for (const kw of JUNK_FILENAME_KEYWORDS) {
    if (fnLower.includes(kw)) return true;
  }
  for (const kw of JUNK_TITLE_KEYWORDS) {
    if (titleLower.includes(kw)) return true;
  }
  return false;
}

function extractFilename(url: string): string {
  try {
    const u = new URL(url);
    // For Wikimedia, the filename is the last path segment
    const parts = u.pathname.split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || '');
  } catch {
    return url;
  }
}

// Heuristic: the name tokens should appear in either the filename or title
// (otherwise the match is purely domain-based, which is dangerous).
function nameAppears(name: string, filename: string, title: string): boolean {
  const nameTokens = name.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  const haystack = (filename + ' ' + title).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff\s]/g, ' ');
  const matched = nameTokens.filter((t) => haystack.includes(t));
  return matched.length >= Math.max(1, Math.ceil(nameTokens.length / 2));
}

interface RankedImage {
  title?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  pageDomain?: string;
  imageDomain?: string;
  score?: number;
}

interface ResultEntry {
  name: string;
  id?: string;
  nationality?: string;
  source?: string;
  status: string;
  candidates?: RankedImage[];
  bestIndex?: number;
  autoApply?: boolean;
}

function main() {
  const results: Record<string, ResultEntry> = JSON.parse(
    fs.readFileSync(RESULTS_PATH, 'utf8')
  );

  let downgraded = 0;
  let kept = 0;

  for (const [name, entry] of Object.entries(results)) {
    if (entry.status !== 'matched' || !entry.autoApply) continue;
    const best = entry.candidates?.[entry.bestIndex ?? 0];
    if (!best || !best.imageUrl) continue;

    const filename = extractFilename(best.imageUrl);
    const title = best.title || '';
    const isWikimedia =
      (best.imageDomain || '').includes('wikimedia.org') ||
      (best.imageDomain || '').includes('wikipedia.org') ||
      (best.pageDomain || '').includes('wikipedia.org') ||
      (best.pageDomain || '').includes('wikimedia.org');

    let reason: string | null = null;

    // Junk filename / title check — applies to ALL sources, not just Wikimedia
    if (isJunkImage(filename, title)) {
      reason = `junk-image (filename="${filename.slice(0, 40)}")`;
    }

    // For Wikimedia specifically, require that the person's name appear somewhere
    if (!reason && isWikimedia && !nameAppears(name, filename, title)) {
      reason = `wikimedia-name-mismatch (filename="${filename.slice(0, 40)}")`;
    }

    if (reason) {
      entry.autoApply = false;
      downgraded++;
      console.log(`DOWNGRADE ${name} → ${reason}`);
    } else {
      kept++;
    }
  }

  // Write back results
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));

  // Rebuild high-conf list
  const highConf: Record<string, string> = {};
  for (const entry of Object.values(results)) {
    if (entry.status !== 'matched' || !entry.autoApply) continue;
    const best = entry.candidates?.[entry.bestIndex ?? 0];
    if (best?.imageUrl) highConf[entry.name] = best.imageUrl;
  }
  fs.writeFileSync(HIGH_CONF_PATH, JSON.stringify(highConf, null, 2));

  console.log(`\n=== REFINE SUMMARY ===`);
  console.log(`Auto-apply kept      : ${kept}`);
  console.log(`Auto-apply downgraded: ${downgraded}`);
  console.log(`Total high-conf now  : ${Object.keys(highConf).length}`);
}

main();
