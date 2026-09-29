import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { INTERNAL_COOKIE, isInternalAllowed } from '@/lib/dev/gate';
import {
  companyLabel,
  draftPost,
  getPeopleBornOn,
  mmDdLabel,
  natKo,
  normalizeMmDd,
  shiftMmDd,
  todayKstMmDd,
  worthKo,
  worthUsd,
} from '@/lib/dev/birthdayCards';
import CopyButton from './CopyButton';

/**
 * /dev/birthday-cards?date=MM-DD — internal marketing tool.
 *
 * For a given month/day: every billionaire in the dataset born that day,
 * a rendered day card (1200×1500, X 4:5), one square card per person, and a
 * ready-to-paste post draft. Gated by lib/dev/gate.ts (key or cookie from
 * /api/dev/login); nothing here is linked from the public site.
 */
export const dynamic = 'force-dynamic';

type SP = Promise<{ [key: string]: string | string[] | undefined }>;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function BirthdayCardsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const key = one(sp.key);
  const jar = await cookies();
  const hasCookie = isInternalAllowed(null, jar.get(INTERNAL_COOKIE)?.value);
  if (!hasCookie && !isInternalAllowed(key)) notFound();
  // Once the cookie is set, stop threading the key through every URL.
  const keyForLinks = hasCookie ? undefined : key;

  const mmdd = normalizeMmDd(one(sp.date)) ?? todayKstMmDd();
  const n = Math.min(6, Math.max(1, Number(one(sp.n) || 4) || 4));
  const people = getPeopleBornOn(mmdd);
  const keyQ = keyForLinks ? `&key=${encodeURIComponent(keyForLinks)}` : '';
  const href = (d: string) => `/dev/birthday-cards?date=${d}&n=${n}${keyQ}`;
  const dayPng = `/api/dev/birthday-card?date=${mmdd}&n=${n}${keyQ}`;
  const personPng = (id: string) => `/api/dev/birthday-card?id=${id}${keyQ}`;
  const post = draftPost(mmdd, people, n);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 text-gray-900">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">internal · 오늘 태어난 부자</p>
          <h1 className="text-3xl font-bold">{mmDdLabel(mmdd)}</h1>
          <p className="text-sm text-gray-500">{people.length}명 · 자산순</p>
        </div>
        <form className="flex items-center gap-2" action="/dev/birthday-cards" method="get">
          <Link href={href(shiftMmDd(mmdd, -1))} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">← 전날</Link>
          <input name="date" defaultValue={mmdd} className="w-24 rounded-lg border px-2 py-1.5 text-center text-sm" placeholder="MM-DD" />
          <select name="n" defaultValue={String(n)} className="rounded-lg border px-2 py-1.5 text-sm">
            {[3, 4, 5, 6].map((v) => (
              <option key={v} value={v}>{v}명</option>
            ))}
          </select>
          {keyForLinks && <input type="hidden" name="key" value={keyForLinks} />}
          <button className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white">보기</button>
          <Link href={href(shiftMmDd(mmdd, 1))} className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">다음날 →</Link>
        </form>
      </header>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">데이 카드 (1200×1500)</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dayPng} alt="" className="w-full max-w-[600px] rounded-2xl border shadow-sm" />
          <div className="mt-2 flex gap-2">
            <a href={dayPng} download={`bujasaju-${mmdd}.png`} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white">PNG 다운로드</a>
            <a href={dayPng} target="_blank" className="rounded-lg border px-3 py-1.5 text-sm">새 탭</a>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-gray-500">포스트 초안 (링크는 답글로)</h2>
          <textarea readOnly value={post} rows={12} className="w-full rounded-xl border bg-gray-50 p-3 font-mono text-sm" />
          <div className="mt-2 flex items-center gap-2">
            <CopyButton text={post} />
            <CopyButton text={'생일 입력하면 나랑 같은 일주 부자 바로 나와요\nhttps://bujasaju.com'} label="답글 복사" />
          </div>

          <h2 className="mb-2 mt-8 text-sm font-semibold text-gray-500">전체 명단</h2>
          <ol className="divide-y rounded-xl border text-sm">
            {people.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-5 text-right text-gray-400">{i + 1}</span>
                <span className="font-semibold">{p.nameKo || p.name}</span>
                <span className="text-gray-400">{p.birthday.slice(0, 4)}</span>
                <span className="ml-auto text-gray-500">{worthKo(p.netWorth)}</span>
                <span className="w-16 text-right text-indigo-600">{p.saju?.ilju}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">개별 카드 (1200×1200)</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((p) => (
            <div key={p.id} className="rounded-2xl border p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={personPng(p.id)} alt="" className="w-full rounded-xl" loading="lazy" />
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-semibold">{p.nameKo || p.name} <span className="font-normal text-gray-400">{p.name}</span></div>
                  <div className="truncate text-gray-500">{[companyLabel(p), natKo(p.nationality), worthUsd(p.netWorth)].filter(Boolean).join(' · ')}</div>
                </div>
                <a href={personPng(p.id)} download={`bujasaju-${p.id}.png`} className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-white">PNG</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
