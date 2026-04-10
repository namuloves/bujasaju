/**
 * verify-photos-with-vision.ts
 *
 * For each billionaire currently stuck on a ui-avatars.com placeholder,
 * take the top N Serper candidates (already cached in
 * scripts/photos-serper-results.json), ask Claude Haiku (vision) whether
 * each image plausibly shows *that specific person*, and pick the best.
 *
 * Why this is the right layer:
 *   - Serper already did the hard work of finding candidate images.
 *   - Name-based scoring is unreliable for "is this the right person?"
 *     (homonyms, article collages, logos, product shots, unrelated
 *     portraits). A vision model can look at the image directly.
 *   - Claude Haiku vision is ~$0.0003/image → 180 × 3 ≈ $0.16 total.
 *
 * Verification prompt is narrow on purpose: we want a clean JSON verdict
 * with confidence, not prose. We give the model the person's name,
 * nationality, industry, approximate age, gender, and the article title
 * the image came from (strong disambiguator).
 *
 * Resumable: progress is written after every person. Rerun safely.
 *
 * Usage:
 *   npx tsx scripts/verify-photos-with-vision.ts
 *   npx tsx scripts/verify-photos-with-vision.ts --limit 10   # dry-ish run
 *   npx tsx scripts/verify-photos-with-vision.ts --apply      # patch JSON
 */

import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = path.resolve(__dirname, '..');
const BILLIONAIRES_JSON = path.join(ROOT, 'public', 'billionaires.json');
const SERPER_RESULTS = path.join(ROOT, 'scripts', 'photos-serper-results.json');
const VERIFY_CACHE = path.join(ROOT, 'scripts', 'photos-vision-verified.json');

// How many of the top-scored Serper candidates to verify per person.
// 3 is a good trade-off: typically one of the top 3 is the real photo if
// the person has any real-web presence at all.
const CANDIDATES_PER_PERSON = 3;

// Minimum confidence (1-5) from the vision model to accept a photo.
// 4 = "confident this is the right person". 5 is too strict.
const MIN_CONFIDENCE = 4;

// Skip candidates wider than this ratio — they're usually article
// collages with multiple people, not portraits.
const MAX_ASPECT_RATIO = 2.2;

interface SerperCandidate {
  title?: string;
  imageUrl: string;
  imageWidth?: number;
  imageHeight?: number;
  source?: string;
  domain?: string;
  link?: string;
  score?: number;
  trustLevel?: string;
}

interface SerperEntry {
  name: string;
  id?: string;
  nationality?: string;
  source?: string;
  candidates?: SerperCandidate[];
}

interface Billionaire {
  id: string;
  name: string;
  nameKo?: string;
  birthday: string;
  nationality: string;
  industry: string;
  gender?: string;
  source?: string;
  photoUrl?: string;
  bioKo?: string;
  bio?: string;
}

interface VisionVerdict {
  candidateUrl: string;
  candidateTitle?: string;
  candidateSource?: string;
  confidence: number; // 1-5
  reason: string;
}

interface PersonVerifyResult {
  name: string;
  id: string;
  status: 'verified' | 'no_match' | 'no_candidates' | 'error';
  bestCandidate?: VisionVerdict;
  allVerdicts?: VisionVerdict[];
  error?: string;
  verifiedAt: string;
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT_IDX = args.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(args[LIMIT_IDX + 1] || '0', 10) : 0;

function loadJson<T>(p: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function saveJson(p: string, data: unknown): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function computeAge(birthday: string): number | null {
  const m = /^(\d{4})/.exec(birthday);
  if (!m) return null;
  const birthYear = parseInt(m[1], 10);
  if (birthYear === 1990) return null; // placeholder birthdays
  const now = new Date().getFullYear();
  return now - birthYear;
}

function nationalityLabel(code: string): string {
  const map: Record<string, string> = {
    US: 'American',
    CN: 'Chinese',
    HK: 'Hong Kong',
    TW: 'Taiwanese',
    JP: 'Japanese',
    KR: 'South Korean',
    IN: 'Indian',
    GB: 'British',
    DE: 'German',
    FR: 'French',
    IT: 'Italian',
    ES: 'Spanish',
    CA: 'Canadian',
    AU: 'Australian',
    BR: 'Brazilian',
    MX: 'Mexican',
    RU: 'Russian',
    SG: 'Singaporean',
    IL: 'Israeli',
    NL: 'Dutch',
    SE: 'Swedish',
    CH: 'Swiss',
    AT: 'Austrian',
    BE: 'Belgian',
    TR: 'Turkish',
    TH: 'Thai',
    MY: 'Malaysian',
    ID: 'Indonesian',
    PH: 'Filipino',
    SA: 'Saudi',
    AE: 'Emirati',
    EG: 'Egyptian',
    NG: 'Nigerian',
    ZA: 'South African',
    AR: 'Argentinian',
    CL: 'Chilean',
    CO: 'Colombian',
    NO: 'Norwegian',
    DK: 'Danish',
    FI: 'Finnish',
    IE: 'Irish',
    PT: 'Portuguese',
    GR: 'Greek',
    PL: 'Polish',
    CZ: 'Czech',
    HU: 'Hungarian',
    RO: 'Romanian',
    UA: 'Ukrainian',
    KZ: 'Kazakh',
    LB: 'Lebanese',
  };
  return map[code] ?? code;
}

/**
 * Fetch an image and convert to base64 for the vision API.
 * Rejects non-image responses, HTML error pages, and oversized payloads.
 */
async function fetchImageAsBase64(url: string): Promise<{
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
} | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) BujasajuBot/1.0',
        Accept: 'image/*',
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > 4_500_000) return null; // Anthropic limit is 5MB
    const mediaType = contentType.includes('png')
      ? 'image/png'
      : contentType.includes('gif')
      ? 'image/gif'
      : contentType.includes('webp')
      ? 'image/webp'
      : 'image/jpeg';
    return { base64: buf.toString('base64'), mediaType };
  } catch {
    return null;
  }
}

function pickCandidates(entry: SerperEntry): SerperCandidate[] {
  const cs = (entry.candidates ?? []).filter((c) => {
    if (!c.imageUrl || !/^https?:\/\//i.test(c.imageUrl)) return false;
    if (c.imageWidth && c.imageHeight) {
      const ratio = Math.max(
        c.imageWidth / c.imageHeight,
        c.imageHeight / c.imageWidth,
      );
      if (ratio > MAX_ASPECT_RATIO) return false; // probably a banner/collage
    }
    return true;
  });
  // Serper already pre-sorts by relevance/score; take the top N unique URLs.
  const seen = new Set<string>();
  const picked: SerperCandidate[] = [];
  for (const c of cs) {
    if (seen.has(c.imageUrl)) continue;
    seen.add(c.imageUrl);
    picked.push(c);
    if (picked.length >= CANDIDATES_PER_PERSON) break;
  }
  return picked;
}

function buildPrompt(person: Billionaire, candidate: SerperCandidate): string {
  const age = computeAge(person.birthday);
  const bits = [
    `Name: ${person.name}`,
    person.nationality && `Nationality: ${nationalityLabel(person.nationality)}`,
    person.industry && `Industry: ${person.industry}`,
    person.source && `Known for: ${person.source}`,
    person.gender && `Gender: ${person.gender === 'M' ? 'male' : 'female'}`,
    age && `Approximate age: ${age}`,
    candidate.title && `Image found in article titled: "${candidate.title}"`,
    candidate.source && `Article source: ${candidate.source}`,
  ].filter(Boolean);

  return `You are verifying whether a photo shows a specific billionaire.

Person:
${bits.join('\n')}

Look at the image and answer:
1. Is this a clear photograph of a single real human face/person? (not a logo, product, building, crowd, collage, or cartoon)
2. Could this plausibly be ${person.name} specifically — matching nationality, rough age, and gender?

Respond with ONLY a single JSON object, no other text, in this exact shape:
{"confidence": 1-5, "reason": "short reason (max 15 words)"}

Confidence scale:
5 = Clearly a portrait of a single person and strongly consistent with the described person
4 = Clearly a portrait of a single person and plausibly the described person
3 = A portrait but uncertain if it's the right person
2 = A human photo but likely someone else or a group
1 = Not a usable portrait (logo, object, crowd, collage, cartoon, wrong age/gender)`;
}

async function verifyCandidate(
  client: Anthropic,
  person: Billionaire,
  candidate: SerperCandidate,
): Promise<VisionVerdict | null> {
  const img = await fetchImageAsBase64(candidate.imageUrl);
  if (!img) {
    return {
      candidateUrl: candidate.imageUrl,
      candidateTitle: candidate.title,
      candidateSource: candidate.source,
      confidence: 0,
      reason: 'image fetch failed',
    };
  }

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 120,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mediaType,
                data: img.base64,
              },
            },
            { type: 'text', text: buildPrompt(person, candidate) },
          ],
        },
      ],
    });
    const text =
      res.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim() ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        candidateUrl: candidate.imageUrl,
        candidateTitle: candidate.title,
        candidateSource: candidate.source,
        confidence: 0,
        reason: `no JSON in response: ${text.slice(0, 60)}`,
      };
    }
    const parsed = JSON.parse(jsonMatch[0]) as {
      confidence: number;
      reason: string;
    };
    return {
      candidateUrl: candidate.imageUrl,
      candidateTitle: candidate.title,
      candidateSource: candidate.source,
      confidence: Math.max(1, Math.min(5, Number(parsed.confidence) || 0)),
      reason: String(parsed.reason || '').slice(0, 200),
    };
  } catch (err) {
    return {
      candidateUrl: candidate.imageUrl,
      candidateTitle: candidate.title,
      candidateSource: candidate.source,
      confidence: 0,
      reason: `api error: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200),
    };
  }
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const billionaires = JSON.parse(
    fs.readFileSync(BILLIONAIRES_JSON, 'utf8'),
  ) as Billionaire[];
  const serperRaw = JSON.parse(fs.readFileSync(SERPER_RESULTS, 'utf8')) as
    | SerperEntry[]
    | Record<string, SerperEntry>;
  const serper: Record<string, SerperEntry> = Array.isArray(serperRaw)
    ? Object.fromEntries(serperRaw.map((x) => [x.name, x]))
    : serperRaw;

  const cache = loadJson<Record<string, PersonVerifyResult>>(VERIFY_CACHE, {});

  // "Stuck" = anyone whose current photo is known-bad. Two categories:
  //   1. ui-avatars.com placeholders (initials on a colored circle)
  //   2. Forbes imageserve URLs that return their tiny "F" logo placeholder
  //      (detected by scripts/detect-forbes-placeholders.ts, IDs cached)
  let placeholderIds = new Set<string>();
  try {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, 'scripts', 'forbes-placeholder-ids.json'),
        'utf8',
      ),
    ) as { placeholderIds?: string[] };
    placeholderIds = new Set(raw.placeholderIds ?? []);
  } catch {
    // file missing is fine; we'll just cover ui-avatars
  }

  const stuck = billionaires.filter(
    (p) =>
      (p.photoUrl || '').includes('ui-avatars.com') ||
      placeholderIds.has(p.id),
  );
  console.log(
    `Stuck photos: ${stuck.length} (ui-avatars + ${placeholderIds.size} Forbes F-placeholders)`,
  );

  const toProcess = stuck.filter((p) => {
    const cached = cache[p.name];
    if (!cached) return true;
    // Re-run error states; keep any final verdict.
    return cached.status === 'error';
  });
  console.log(`Needs verification: ${toProcess.length}`);

  const target = LIMIT > 0 ? toProcess.slice(0, LIMIT) : toProcess;
  console.log(`Processing: ${target.length}\n`);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let i = 0;
  for (const person of target) {
    i++;
    const entry = serper[person.name];
    const candidates = entry ? pickCandidates(entry) : [];

    if (candidates.length === 0) {
      cache[person.name] = {
        name: person.name,
        id: person.id,
        status: 'no_candidates',
        verifiedAt: new Date().toISOString(),
      };
      saveJson(VERIFY_CACHE, cache);
      console.log(`[${i}/${target.length}] ${person.name} — no candidates`);
      continue;
    }

    const verdicts: VisionVerdict[] = [];
    for (const cand of candidates) {
      const verdict = await verifyCandidate(client, person, cand);
      if (verdict) verdicts.push(verdict);
      // short pause to be nice to upstream servers
      await new Promise((r) => setTimeout(r, 250));
    }

    verdicts.sort((a, b) => b.confidence - a.confidence);
    const best = verdicts[0];

    if (best && best.confidence >= MIN_CONFIDENCE) {
      cache[person.name] = {
        name: person.name,
        id: person.id,
        status: 'verified',
        bestCandidate: best,
        allVerdicts: verdicts,
        verifiedAt: new Date().toISOString(),
      };
      console.log(
        `[${i}/${target.length}] ${person.name} ✓ c=${best.confidence} ${best.candidateSource ?? ''} — ${best.reason}`,
      );
    } else {
      cache[person.name] = {
        name: person.name,
        id: person.id,
        status: 'no_match',
        allVerdicts: verdicts,
        verifiedAt: new Date().toISOString(),
      };
      console.log(
        `[${i}/${target.length}] ${person.name} ✗ best c=${best?.confidence ?? 0} — ${best?.reason ?? 'n/a'}`,
      );
    }

    saveJson(VERIFY_CACHE, cache);
  }

  // Summary
  const all = Object.values(cache);
  const verified = all.filter((v) => v.status === 'verified');
  const noMatch = all.filter((v) => v.status === 'no_match');
  const noCand = all.filter((v) => v.status === 'no_candidates');
  console.log('\n=== summary ===');
  console.log(`verified:      ${verified.length}`);
  console.log(`no match:      ${noMatch.length}`);
  console.log(`no candidates: ${noCand.length}`);

  if (APPLY) {
    let applied = 0;
    for (const p of billionaires) {
      const v = cache[p.name];
      if (v?.status === 'verified' && v.bestCandidate) {
        p.photoUrl = v.bestCandidate.candidateUrl;
        applied++;
      }
    }
    fs.writeFileSync(
      BILLIONAIRES_JSON,
      JSON.stringify(billionaires, null, 2) + '\n',
    );
    console.log(`\napplied to public/billionaires.json: ${applied}`);
  } else {
    console.log('\n(pass --apply to patch public/billionaires.json)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
