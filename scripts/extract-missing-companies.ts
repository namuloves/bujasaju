/**
 * Fill in missing person.company by scraping bio text for company names.
 *
 * Strategy:
 *  1. Iterate billionaires.json — pick rows where `company` is missing.
 *  2. Load that person's v2 bio if available, else v1, else fall back to
 *     `bio` / `bioKo` on the row itself.
 *  3. Apply a series of regex patterns to find a likely Korean company name:
 *       - "{company} 창업"  / "{company} 설립" / "{company} 회장"
 *       - "{company} CEO" / "{company} 대표"
 *       - moneyMechanics.coreBusinessKo first sentence
 *  4. High-confidence matches → write back to billionaires.json.
 *  5. Lower-confidence (multiple candidates, very long, etc.) → dump to a
 *     review JSON for manual triage.
 *
 * Run:   npx tsx scripts/extract-missing-companies.ts
 * Dry-run mode (no writes): pass --dry
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const BILLIONAIRES = join(ROOT, 'public', 'billionaires.json');
const V1_DIR = join(ROOT, 'public', 'deep-bios');
const V2_DIR = join(ROOT, 'public', 'deep-bios-v2');
const REVIEW_OUT = join(ROOT, '.cowork', 'company-extract-review.json');

const dryRun = process.argv.includes('--dry');

interface Person {
  id: string;
  name: string;
  nameKo?: string;
  company?: string;
  companyKo?: string;
  source?: string;
  industry?: string;
  bio?: string;
  bioKo?: string;
}

interface ExtractResult {
  id: string;
  nameKo?: string;
  name: string;
  candidates: string[];
  chosen: string | null;
  confidence: 'high' | 'low' | 'none';
  source: 'v2.moneyMechanics' | 'v2.childhood' | 'v2.careerTimeline' | 'v1.childhood' | 'bio' | 'bioKo' | 'none';
}

// Patterns that anchor a Korean company-like noun phrase.
// Capture group 1 is the company name. We keep the regexes conservative on
// purpose — false positives ("그는 회장" matching "그는") are worse than misses.
const PATTERNS: Array<{ re: RegExp; src: ExtractResult['source'] }> = [
  // Strong: "{X}(을|를)? 창업/설립/공동 창업"
  { re: /([가-힣A-Za-z0-9·&\- ]{2,40}?)(?:을|를)?\s*공동\s*창업/, src: 'bioKo' },
  { re: /([가-힣A-Za-z0-9·&\- ]{2,40}?)(?:을|를)?\s*창업(?:하|함|했)/, src: 'bioKo' },
  { re: /([가-힣A-Za-z0-9·&\- ]{2,40}?)(?:을|를)?\s*설립(?:하|함|했)/, src: 'bioKo' },
  // Strong: "{X} 회장/CEO/사장/대표"
  { re: /([가-힣A-Za-z0-9·&\- ]{2,40}?)\s+(?:그룹\s+)?(?:회장|CEO|대표이사|사장)/, src: 'bioKo' },
];

function cleanCandidate(raw: string): string | null {
  let s = raw.trim();
  // Strip leading articles / pronouns / company stop-words
  s = s.replace(/^(그는|그녀는|이|그|그들의|현재|이후|그 후|또한|그리고|당시)\s+/, '');
  s = s.replace(/^[을를은는이가의에서]\s+/, '');
  // Drop trailing punctuation
  s = s.replace(/[\s,.;]+$/, '');
  // Reject if too short or too generic
  if (s.length < 2) return null;
  if (/^(그|그녀|이|그들|현재|이후|당시|회장|사장|대표|CEO)$/.test(s)) return null;
  // Reject if obviously a sentence fragment with verbs
  if (/(다|했다|함|니다)$/.test(s)) return null;
  return s;
}

function extractFromText(text: string, src: ExtractResult['source']): { candidates: string[]; src: ExtractResult['source'] } {
  const out: string[] = [];
  for (const { re } of PATTERNS) {
    const m = text.match(re);
    if (m && m[1]) {
      const c = cleanCandidate(m[1]);
      if (c) out.push(c);
    }
  }
  return { candidates: out, src };
}

function loadBio(id: string): { kind: ExtractResult['source']; text: string } | null {
  const v2Path = join(V2_DIR, `${id}.json`);
  if (existsSync(v2Path)) {
    try {
      const b = JSON.parse(readFileSync(v2Path, 'utf8'));
      // Prefer moneyMechanics.coreBusinessKo — it's the cleanest "what this person owns" line.
      if (b.moneyMechanics?.coreBusinessKo) {
        return { kind: 'v2.moneyMechanics', text: String(b.moneyMechanics.coreBusinessKo) };
      }
      if (b.childhood?.familyBackgroundKo) {
        return { kind: 'v2.childhood', text: String(b.childhood.familyBackgroundKo) };
      }
      // Concat first few careerTimeline eventKo entries
      const events = (b.careerTimeline ?? []).slice(0, 3).map((e: { eventKo?: string }) => e.eventKo).filter(Boolean).join('. ');
      if (events) return { kind: 'v2.careerTimeline', text: events };
    } catch { /* fall through */ }
  }
  const v1Path = join(V1_DIR, `${id}.json`);
  if (existsSync(v1Path)) {
    try {
      const b = JSON.parse(readFileSync(v1Path, 'utf8'));
      if (b.childhood?.earlyLifeKo) return { kind: 'v1.childhood', text: String(b.childhood.earlyLifeKo) };
      const events = (b.careerTimeline ?? []).slice(0, 3).map((e: { eventKo?: string }) => e.eventKo).filter(Boolean).join('. ');
      if (events) return { kind: 'v2.careerTimeline', text: events };
    } catch { /* fall through */ }
  }
  return null;
}

function main() {
  const all: Person[] = JSON.parse(readFileSync(BILLIONAIRES, 'utf8'));
  const without = all.filter((p) => !p.company);
  console.log(`Total without company: ${without.length}`);

  const results: ExtractResult[] = [];
  const review: ExtractResult[] = [];
  let highApplied = 0;

  for (const p of without) {
    const bio = loadBio(p.id);
    const rowText = [p.bioKo, p.bio].filter(Boolean).join(' . ');
    const candidates: string[] = [];

    if (bio) {
      const r = extractFromText(bio.text, bio.kind);
      candidates.push(...r.candidates);
    }
    if (rowText) {
      const r = extractFromText(rowText, 'bioKo');
      candidates.push(...r.candidates);
    }

    // De-dupe while preserving order
    const uniq = Array.from(new Set(candidates));
    // High confidence iff exactly one candidate AND it's <= 25 chars (likely a clean company name).
    const confidence: ExtractResult['confidence'] =
      uniq.length === 1 && uniq[0].length <= 25 ? 'high' :
      uniq.length > 0 ? 'low' : 'none';

    const chosen = confidence === 'high' ? uniq[0] : null;

    const result: ExtractResult = {
      id: p.id,
      nameKo: p.nameKo,
      name: p.name,
      candidates: uniq,
      chosen,
      confidence,
      source: bio?.kind ?? (rowText ? 'bioKo' : 'none'),
    };
    results.push(result);

    if (chosen) {
      p.company = chosen;
      highApplied++;
    } else {
      review.push(result);
    }
  }

  console.log(`High-confidence matches applied: ${highApplied}`);
  console.log(`Low / none → review list:        ${review.length}`);

  if (!dryRun) {
    writeFileSync(BILLIONAIRES, JSON.stringify(all, null, 2));
    writeFileSync(REVIEW_OUT, JSON.stringify(review, null, 2));
    console.log(`\nWrote billionaires.json (+${highApplied} company fields)`);
    console.log(`Wrote review list to ${REVIEW_OUT}`);
  } else {
    console.log('\n[dry-run] No files written. First 8 high-confidence picks:');
    for (const r of results.filter((r) => r.confidence === 'high').slice(0, 8)) {
      console.log(`  ${r.id}  ${r.nameKo ?? r.name}  →  ${r.chosen}`);
    }
    console.log('\n[dry-run] First 5 review items:');
    for (const r of review.slice(0, 5)) {
      console.log(`  ${r.id}  ${r.nameKo ?? r.name}  candidates: ${JSON.stringify(r.candidates)}`);
    }
  }
}

main();
