import { Resend } from 'resend';
import type { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { rateLimit, getIp } from '@/lib/rateLimit';
import MatchUnlockEmail, { type MatchPerson } from '@/emails/MatchUnlockEmail';

/**
 * POST /api/send-match-email
 *
 * Sends the "your ilju matches" email after a visitor unlocks the gate.
 * Triggered fire-and-forget by LockedMatchesGate so the user UX doesn't
 * block on the send — Resend usually responds in 200-600ms but we never
 * want a slow mail to delay the unlock animation.
 *
 * The locked people data is forwarded from the client. We trust it
 * structurally (validated below) but not semantically — i.e. someone
 * could craft a request with arbitrary names. That's fine: the worst
 * a bad actor can do is mail themselves a customised email, and the
 * rate limit caps abuse.
 *
 * Env vars required:
 *   RESEND_API_KEY — pulled from Vercel project env
 *
 * Response: { ok: true } | { error: string } with appropriate status.
 */

export const runtime = 'nodejs';

let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error('RESEND_API_KEY not configured');
  }
  _resend = new Resend(key);
  return _resend;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MATCHES = 10;

interface SendBody {
  email?: unknown;
  ilju?: unknown;
  matches?: unknown;
  lang?: unknown;
}

interface ClientMatch {
  id?: unknown;
  name?: unknown;
  nameKo?: unknown;
  photoUrl?: unknown;
  nationality?: unknown;
  industry?: unknown;
  source?: unknown;
  companyKo?: unknown;
  netWorth?: unknown;
  bioKo?: unknown;
  bio?: unknown;
}

function sanitizeString(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function sanitizeMatches(raw: unknown): MatchPerson[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchPerson[] = [];
  for (const item of raw.slice(0, MAX_MATCHES)) {
    if (!item || typeof item !== 'object') continue;
    const m = item as ClientMatch;
    const id = sanitizeString(m.id, 64);
    const name = sanitizeString(m.name, 120);
    if (!id || !name) continue;
    if (typeof m.netWorth !== 'number' || !Number.isFinite(m.netWorth)) continue;
    out.push({
      id,
      name,
      nameKo: sanitizeString(m.nameKo, 120) ?? null,
      photoUrl: sanitizeString(m.photoUrl, 500) ?? null,
      nationality: sanitizeString(m.nationality, 4),
      industry: sanitizeString(m.industry, 80),
      // Forbes wealth source — used as fallback subtitle.
      source: sanitizeString(m.source, 80) ?? null,
      // Korean company name(s) — preferred over source/industry in the meta line.
      companyKo: sanitizeString(m.companyKo, 80) ?? null,
      netWorth: m.netWorth,
      // Bio is the longest field — cap generously (1200 chars) so we can
      // accept the full paragraph but still reject absurd payloads.
      bioKo: sanitizeString(m.bioKo, 1200) ?? null,
      bio: sanitizeString(m.bio, 1200) ?? null,
    });
  }
  return out;
}

/**
 * Load ilju intro phrases. Cached for process lifetime — the JSON is
 * tiny (~3KB) and never changes at runtime.
 */
let _iljuIntros: Record<string, string> | null = null;
async function getIljuIntros(): Promise<Record<string, string>> {
  if (_iljuIntros) return _iljuIntros;
  try {
    const raw = await readFile(join(process.cwd(), 'public', 'saju-data', 'ilju-email-intro.json'), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, string>;
    delete (parsed as Record<string, unknown>)._meta;
    _iljuIntros = parsed;
    return parsed;
  } catch {
    _iljuIntros = {};
    return {};
  }
}

/**
 * Compute the rank (1-60) of an ilju by billionaire count, plus the
 * total count for that ilju. Caches the full mapping for process lifetime.
 */
let _iljuRanks: Map<string, { rank: number; count: number }> | null = null;
async function getIljuRanks(): Promise<Map<string, { rank: number; count: number }>> {
  if (_iljuRanks) return _iljuRanks;
  try {
    const raw = await readFile(join(process.cwd(), 'public', 'enriched-billionaires.json'), 'utf8');
    const people = JSON.parse(raw) as Array<{ saju?: { ilju?: string } }>;
    const counts = new Map<string, number>();
    for (const p of people) {
      const i = p.saju?.ilju;
      if (!i) continue;
      counts.set(i, (counts.get(i) ?? 0) + 1);
    }
    const sortedCounts = [...counts.values()].sort((a, b) => b - a);
    const map = new Map<string, { rank: number; count: number }>();
    for (const [ilju, c] of counts) {
      map.set(ilju, { rank: sortedCounts.indexOf(c) + 1, count: c });
    }
    _iljuRanks = map;
    return map;
  } catch {
    _iljuRanks = new Map();
    return _iljuRanks;
  }
}

/**
 * Load same-ilju Korean billionaires (top N by net worth) directly from
 * enriched-billionaires.json. We don't trust the client to send them —
 * the user might have a tiny browser-side cutoff that excludes them.
 *
 * Returns thin MatchPerson rows, in net-worth-descending order. Empty
 * array if none exist or the file can't be read.
 */
let _enrichedCache: Array<Record<string, unknown>> | null = null;
async function getKoreanBillionairesForIlju(ilju: string, limit: number): Promise<MatchPerson[]> {
  if (!_enrichedCache) {
    try {
      const raw = await readFile(join(process.cwd(), 'public', 'enriched-billionaires.json'), 'utf8');
      _enrichedCache = JSON.parse(raw) as Array<Record<string, unknown>>;
    } catch {
      _enrichedCache = [];
    }
  }
  const matches = _enrichedCache
    .filter((p) => {
      const s = p.saju as { ilju?: string } | undefined;
      return p.nationality === 'KR' && s?.ilju === ilju;
    })
    .sort((a, b) => ((b.netWorth as number) ?? 0) - ((a.netWorth as number) ?? 0))
    .slice(0, limit);

  return matches.map((p) => ({
    id: p.id as string,
    name: p.name as string,
    nameKo: (p.nameKo as string | undefined) ?? null,
    photoUrl: (p.photoUrl as string | undefined) ?? null,
    nationality: p.nationality as string | undefined,
    industry: p.industry as string | undefined,
    source: (p.source as string | undefined) ?? null,
    companyKo: (p.companyKo as string | undefined) ?? null,
    netWorth: p.netWorth as number,
    bioKo: (p.bioKo as string | undefined) ?? null,
    bio: (p.bio as string | undefined) ?? null,
  }));
}

/**
 * Read a v2 deep bio file from public/deep-bios-v2/. Returns null when
 * the person has no enriched bio — caller falls back to the short bioKo.
 *
 * We deliberately read from disk (not fetch) so the API route works in
 * any environment without needing to hit itself over HTTP. The data is
 * stable at build time so disk reads are fine.
 */
async function readDeepBioV2(personId: string): Promise<Record<string, unknown> | null> {
  try {
    const path = join(process.cwd(), 'public', 'deep-bios-v2', `${personId}.json`);
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Convert Korean polite endings (합쇼체/해요체) to plain (해라체) for email
 * output. The source JSON keeps polite endings — we only rewrite at email
 * send time so the on-site profile pages stay in their original tone.
 *
 * Limitations: regex-based, not a morphological analyzer. Honorific markers
 * in the middle of a sentence (~시며, ~신, ~께서) are not stripped — only
 * sentence-final endings. Manually-spotted edge cases (e.g. 보이십니다 →
 * 보인다 vs 보이다) may need refinement; current output prefers grammatical
 * over perfectly natural.
 */
const POLITE_TO_PLAIN: Array<[RegExp, string]> = [
  // Sentence-final lookahead: punctuation, whitespace, or end-of-string.
  // (We don't need to escape ] inside the class.)
  // Honorific-specific forms first so they win over the generic 습니다 rule.
  [/하셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '했다'],
  [/되셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '됐다'],
  [/이셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  [/태어나셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '태어났다'],
  [/계셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '있었다'],
  [/으셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다'],
  [/셨습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다'],
  [/하십니다(?=[\s.!?,)」』"'\n]|$)/g, '한다'],
  [/되십니다(?=[\s.!?,)」』"'\n]|$)/g, '된다'],
  [/이십니다(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/계십니다(?=[\s.!?,)」』"'\n]|$)/g, '있다'],
  [/으십니다(?=[\s.!?,)」』"'\n]|$)/g, '는다'],
  [/가십니다(?=[\s.!?,)」』"'\n]|$)/g, '간다'],
  [/오십니다(?=[\s.!?,)」』"'\n]|$)/g, '온다'],
  [/보십니다(?=[\s.!?,)」』"'\n]|$)/g, '본다'],
  [/십니다(?=[\s.!?,)」』"'\n]|$)/g, '신다'],

  // 합쇼체: ~습니다 / ~합니다 / ~ㅂ니다 → plain
  // Past:
  [/었습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다'],
  [/았습니다(?=[\s.!?,)」』"'\n]|$)/g, '았다'],
  [/였습니다(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  // Present: ~습니다 (consonant-stem verbs: 있/없/먹/받 등)
  [/습니다(?=[\s.!?,)」』"'\n]|$)/g, '다'],
  // ~합니다 (하다 verbs) → ~한다. The "합" syllable is U+D569, distinct
  // from "습" U+C2B5 — the previous rule does NOT catch this.
  [/합니다(?=[\s.!?,)」』"'\n]|$)/g, '한다'],
  // ~됩니다 → ~된다 (되다 verb)
  [/됩니다(?=[\s.!?,)」』"'\n]|$)/g, '된다'],
  // ~입니다 → ~이다 (copula)
  [/입니다(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  // Vowel-stem ㅂ니다 verbs:
  [/갑니다(?=[\s.!?,)」』"'\n]|$)/g, '간다'],
  [/옵니다(?=[\s.!?,)」』"'\n]|$)/g, '온다'],
  [/봅니다(?=[\s.!?,)」』"'\n]|$)/g, '본다'],
  [/줍니다(?=[\s.!?,)」』"'\n]|$)/g, '준다'],
  [/만듭니다(?=[\s.!?,)」』"'\n]|$)/g, '만든다'],
  // ~집니다 (지다 passive) → ~진다
  [/집니다(?=[\s.!?,)」』"'\n]|$)/g, '진다'],

  // 해요체: ~어요/~아요/~예요 → plain (less common in source data;
  // mostly appears in templates we control)
  [/했어요(?=[\s.!?,)」』"'\n]|$)/g, '했다'],
  [/됐어요(?=[\s.!?,)」』"'\n]|$)/g, '됐다'],
  [/였어요(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  [/이에요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/예요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/에요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
];

function toPlainKorean(s: string): string {
  let out = s;
  for (const [re, repl] of POLITE_TO_PLAIN) {
    out = out.replace(re, repl);
  }
  return out;
}

/**
 * Compose a real paragraph from whatever we have. Priority chain:
 *   1) bioKo (the canonical one-line summary) — always first sentence
 *   2) childhood.summaryKo — "성장 배경"
 *      or childhood.earlyLifeKo as fallback
 *   3) capitalOrigin.explanationKo — "자본의 출처" (often the punchy line)
 *
 * We stitch these into a flowing 2-4 sentence paragraph. Sentences that
 * are already in bioKo get deduped so we don't repeat ourselves. Final
 * paragraph is run through toPlainKorean() to match email tone.
 */
function composeParagraph(bioKo: string | null, deep: Record<string, unknown> | null): string {
  const fragments: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string | undefined | null) => {
    if (!raw) return;
    const t = raw.trim();
    if (t.length < 8) return;
    // Dedup: skip if highly similar to an existing fragment.
    const key = t.slice(0, 40);
    if (seen.has(key)) return;
    seen.add(key);
    // Ensure trailing period.
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

  // Cap to keep cards readable (~3 sentences worth).
  const joined = fragments.slice(0, 4).join(' ');
  const out = toPlainKorean(joined);
  if (out.length > 600) return out.slice(0, 598).trimEnd() + '…';
  return out;
}

export async function POST(req: NextRequest) {
  // 10 sends per hour per IP — fits a normal user (one unlock per session)
  // and a couple retries, blocks bots cold.
  const { allowed } = await rateLimit('send-match-email', getIp(req), 10, 3600);
  if (!allowed) {
    return Response.json({ error: 'too_many_requests' }, { status: 429 });
  }

  let body: SendBody;
  try {
    body = (await req.json()) as SendBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = sanitizeString(body.email, 254)?.toLowerCase();
  const ilju = sanitizeString(body.ilju, 4);
  const matches = sanitizeMatches(body.matches);

  if (!email || !EMAIL_RE.test(email)) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!ilju) {
    return Response.json({ error: 'missing_ilju' }, { status: 400 });
  }
  if (matches.length === 0) {
    return Response.json({ error: 'no_matches' }, { status: 400 });
  }

  // Build absolute origin so links inside the email work. Falls back to
  // the production domain if the header is missing (e.g. on a custom
  // edge runtime that strips it).
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('host') ?? 'bujasaju.com';
  const origin = `${proto}://${host}`;

  // Force-include same-ilju Korean billionaires (up to 3) at the top of
  // the matches. The client sends a net-worth-sorted list which skews
  // heavily American/Chinese; surfacing Korean examples makes the email
  // feel relevant to a Korean reader even when net-worth cutoffs would
  // otherwise exclude them.
  const koreanMatches = await getKoreanBillionairesForIlju(ilju, 3);
  const existingIds = new Set(matches.map((m) => m.id));
  const koreanToPrepend = koreanMatches.filter((k) => !existingIds.has(k.id));
  const merged = [...koreanToPrepend, ...matches].slice(0, MAX_MATCHES);

  // Enrich each match with a real paragraph bio by stitching the short
  // bioKo together with any v2 deep-bio fields we have on disk. Done in
  // parallel — typically all 5 reads finish in <30ms.
  const enrichedMatches: MatchPerson[] = await Promise.all(
    merged.map(async (m) => {
      const deep = await readDeepBioV2(m.id);
      const paragraph = composeParagraph(m.bioKo ?? null, deep);
      // Stuff the paragraph back into bioKo so the existing email
      // template renders it. Falls back to the original bioKo if
      // composition yielded nothing (defensive — should never happen
      // when bioKo is set).
      return {
        ...m,
        bioKo: paragraph || m.bioKo || null,
      };
    }),
  );

  // From address: prefer the custom domain once verified, otherwise fall
  // back to Resend's sandbox sender so we can test before DNS propagates.
  // Override via RESEND_FROM env var (e.g. "부자사주 <hello@bujasaju.com>").
  //
  // Default uses the sandbox address but with a friendly display name so
  // the inbox shows "부자사주 <onboarding@resend.dev>" instead of just
  // "onboarding@resend.dev". Once the custom domain is verified, set
  // RESEND_FROM in Vercel to switch to the real address.
  const fromAddress = process.env.RESEND_FROM ?? '부자사주 <onboarding@resend.dev>';

  // Look up per-ilju metadata for the email intro. Both are precomputed
  // once per process and read from public/. If either lookup fails the
  // template falls back to the generic intro.
  const [intros, ranks] = await Promise.all([getIljuIntros(), getIljuRanks()]);
  const trait = intros[ilju] ?? null;
  const rank = ranks.get(ilju)?.rank ?? null;

  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: fromAddress,
      to: email,
      replyTo: 'hello@bujasaju.com',
      subject: `${ilju} 일주의 부자 ${enrichedMatches.length}명을 소개해드려요`,
      react: MatchUnlockEmail({ ilju, matches: enrichedMatches, origin, rank, trait }),
      // Resend tag values must be ASCII letters / numbers / _ / - only.
      // Korean characters in `ilju` (e.g. "갑술") would fail validation —
      // we only keep the ASCII-safe `source` tag.
      tags: [
        { name: 'source', value: 'unlock-gate' },
      ],
    });
    // The SDK returns { data, error } even on resolved promises — a 4xx
    // from Resend (e.g. unverified domain) is reported here, not thrown.
    if (result.error) {
      console.error('[send-match-email] resend error:', JSON.stringify(result.error));
      return Response.json(
        { error: 'resend_rejected', detail: result.error },
        { status: 502 },
      );
    }
    console.log('[send-match-email] sent', result.data?.id, 'to', email, 'from', fromAddress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'send_failed';
    console.error('[send-match-email] failed:', msg);
    return Response.json({ error: 'send_failed', detail: msg }, { status: 500 });
  }

  return Response.json({ ok: true });
}
