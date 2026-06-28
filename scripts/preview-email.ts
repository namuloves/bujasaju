/**
 * Render the real MatchUnlockEmail to HTML using the same React Email
 * pipeline the production route uses, with real 갑술 일주 data shaped
 * exactly the way route.ts shapes it before send.
 *
 * Writes to .scratch/email-preview.html — open in browser to see what
 * the inbox actually gets.
 *
 * Run: npx tsx scripts/preview-email.ts
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { render } from '@react-email/render';
import MatchUnlockEmail, { type MatchPerson } from '../src/emails/MatchUnlockEmail';

// Mirror the route.ts conversion (copy-paste to avoid importing the route).
const POLITE_TO_PLAIN: Array<[RegExp, string]> = [
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
  [/었습니다(?=[\s.!?,)」』"'\n]|$)/g, '었다'],
  [/았습니다(?=[\s.!?,)」』"'\n]|$)/g, '았다'],
  [/였습니다(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  [/습니다(?=[\s.!?,)」』"'\n]|$)/g, '다'],
  [/합니다(?=[\s.!?,)」』"'\n]|$)/g, '한다'],
  [/됩니다(?=[\s.!?,)」』"'\n]|$)/g, '된다'],
  [/입니다(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/갑니다(?=[\s.!?,)」』"'\n]|$)/g, '간다'],
  [/옵니다(?=[\s.!?,)」』"'\n]|$)/g, '온다'],
  [/봅니다(?=[\s.!?,)」』"'\n]|$)/g, '본다'],
  [/줍니다(?=[\s.!?,)」』"'\n]|$)/g, '준다'],
  [/만듭니다(?=[\s.!?,)」』"'\n]|$)/g, '만든다'],
  [/집니다(?=[\s.!?,)」』"'\n]|$)/g, '진다'],
  [/했어요(?=[\s.!?,)」』"'\n]|$)/g, '했다'],
  [/됐어요(?=[\s.!?,)」』"'\n]|$)/g, '됐다'],
  [/였어요(?=[\s.!?,)」』"'\n]|$)/g, '였다'],
  [/이에요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/예요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
  [/에요(?=[\s.!?,)」』"'\n]|$)/g, '이다'],
];

function toPlainKorean(s: string): string {
  let out = s;
  for (const [re, repl] of POLITE_TO_PLAIN) out = out.replace(re, repl);
  return out;
}

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
  const joined = fragments.slice(0, 4).join(' ');
  const out = toPlainKorean(joined);
  if (out.length > 600) return out.slice(0, 598).trimEnd() + '…';
  return out;
}

async function readDeep(id: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await readFile(join(process.cwd(), 'public/deep-bios-v2', `${id}.json`), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const raw = await readFile(join(process.cwd(), 'public/enriched-billionaires.json'), 'utf8');
  const people = JSON.parse(raw) as Array<Record<string, unknown>>;

  const ilju = '갑술';
  // Top 5 by net worth (mimics client-side sorting)
  const top5 = people
    .filter((p) => {
      const s = p.saju as Record<string, unknown> | undefined;
      return s?.ilju === ilju;
    })
    .sort((a, b) => ((b.netWorth as number) ?? 0) - ((a.netWorth as number) ?? 0))
    .slice(0, 5);
  // Force-include up to 3 Korean billionaires of the same ilju
  const koreans = people
    .filter((p) => {
      const s = p.saju as Record<string, unknown> | undefined;
      return s?.ilju === ilju && p.nationality === 'KR';
    })
    .sort((a, b) => ((b.netWorth as number) ?? 0) - ((a.netWorth as number) ?? 0))
    .slice(0, 3);
  const top5Ids = new Set(top5.map((p) => p.id));
  const koreansToPrepend = koreans.filter((k) => !top5Ids.has(k.id as string));
  const gapsul = [...koreansToPrepend, ...top5].slice(0, 10);

  const matches: MatchPerson[] = await Promise.all(
    gapsul.map(async (p) => {
      const deep = await readDeep(p.id as string);
      const bioKo = (p.bioKo as string | undefined) ?? null;
      const paragraph = composeParagraph(bioKo, deep);
      return {
        id: p.id as string,
        name: p.name as string,
        nameKo: (p.nameKo as string | undefined) ?? null,
        photoUrl: (p.photoUrl as string | undefined) ?? null,
        nationality: p.nationality as string | undefined,
        industry: p.industry as string | undefined,
        source: (p.source as string | undefined) ?? null,
        companyKo: (p.companyKo as string | undefined) ?? null,
        netWorth: p.netWorth as number,
        bioKo: paragraph || bioKo,
        bio: (p.bio as string | undefined) ?? null,
      };
    }),
  );

  // Mirror the route: load intro phrase + compute rank
  const introsRaw = JSON.parse(
    await readFile(join(process.cwd(), 'public/saju-data/ilju-email-intro.json'), 'utf8'),
  ) as Record<string, string>;
  delete (introsRaw as Record<string, unknown>)._meta;
  const trait = introsRaw[ilju] ?? null;

  const counts = new Map<string, number>();
  for (const p of people) {
    const s = p.saju as Record<string, unknown> | undefined;
    const i = s?.ilju as string | undefined;
    if (i) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  const sortedCounts = [...counts.values()].sort((a, b) => b - a);
  const myCount = counts.get(ilju) ?? 0;
  const rank = myCount > 0 ? sortedCounts.indexOf(myCount) + 1 : null;

  const html = await render(
    MatchUnlockEmail({ ilju, matches, origin: 'https://bujasaju.com', rank, trait }),
  );
  await mkdir('.scratch', { recursive: true });
  await writeFile('.scratch/email-preview.html', html, 'utf8');
  console.log('Wrote .scratch/email-preview.html');
  console.log(`Matches rendered: ${matches.length}`);
  console.log(`Subject would be: ${ilju} 일주의 부자 ${matches.length}명을 소개해드려요`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
