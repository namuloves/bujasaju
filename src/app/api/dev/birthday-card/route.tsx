import fs from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import type { EnrichedPerson } from '@/lib/saju/types';
import { INTERNAL_COOKIE, isInternalAllowed } from '@/lib/dev/gate';
import {
  companyLabel,
  getPeopleBornOn,
  getPersonForCard,
  mmDdLabel,
  natKo,
  normalizeMmDd,
  photoDataUrl,
  pillarsFor,
  todayKstMmDd,
  worthKo,
  worthUsd,
  type PillarView,
} from '@/lib/dev/birthdayCards';

/**
 * GET /api/dev/birthday-card?date=MM-DD[&n=4]      → day card, 1200×1500 PNG
 * GET /api/dev/birthday-card?id=428                 → single-person card, 1200×1200 PNG
 *
 * Internal marketing tool for the "오늘 태어난 부자" X posts. Not linked from
 * the site; gated by lib/dev/gate.ts. Node runtime because it reads the
 * private dataset and fonts from disk (see next.config outputFileTracingIncludes).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Up to 6 portrait fetches + a 1200×1500 raster; the 10s default is too tight.
export const maxDuration = 60;

const W = 1200;
const FONT = 'NotoSansKR';

function font(file: string): Buffer {
  return fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', file));
}

function initials(p: EnrichedPerson): string {
  const src = p.nameKo || p.name;
  return src.trim().slice(0, 1).toUpperCase();
}

/* ---------- pieces ---------- */

function Tile({ text, bg, size }: { text: string; bg: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        backgroundImage: bg,
        color: '#fff',
        fontSize: Math.round(size * 0.56),
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
      }}
    >
      {text}
    </div>
  );
}

function Pillar({ p, size, isDay }: { p: PillarView; size: number; isDay: boolean }) {
  const small = Math.round(size * 0.24);
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: isDay ? '10px 8px' : '10px 8px',
        borderRadius: 18,
        background: isDay ? 'rgba(79,70,229,0.08)' : 'transparent',
      }}
    >
      <div style={{ fontSize: small, color: '#9ca3af', display: 'flex' }}>{p.label}</div>
      <div style={{ fontSize: small, color: isDay ? '#4f46e5' : '#6b7280', fontWeight: 500, display: 'flex' }}>
        {p.stemSipsin}
      </div>
      <Tile text={p.stem} bg={p.stemColor} size={size} />
      <Tile text={p.branch} bg={p.branchColor} size={size} />
      <div style={{ fontSize: small, color: '#6b7280', fontWeight: 500, display: 'flex' }}>{p.branchSipsin}</div>
    </div>
  );
}

function Photo({ src, p, size, radius }: { src: string | null; p: EnrichedPerson; size: number; radius: number }) {
  if (src) {
    return (
      // Satori renders plain <img>; next/image has no meaning here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        src={src}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', border: '4px solid #fff', boxShadow: '0 6px 18px rgba(0,0,0,0.12)' }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: 'linear-gradient(135deg,#c7d2fe,#a5b4fc)',
        color: '#312e81',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials(p)}
    </div>
  );
}

function Footer({ cta }: { cta: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: 28,
        borderTop: '2px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: '#1a1a1a' }}>부자사주</span>
        <span style={{ fontSize: 30, color: '#6b7280' }}>bujasaju.com</span>
      </div>
      <span style={{ fontSize: 28, color: '#6b7280' }}>{cta}</span>
    </div>
  );
}

/* ---------- day card ---------- */

function PersonRow({ p, photo, showBirthYear }: { p: EnrichedPerson; photo: string | null; showBirthYear: boolean }) {
  const pillars = pillarsFor(p);
  const meta = [companyLabel(p), natKo(p.nationality), showBirthYear ? `${p.birthday.slice(0, 4)}년생` : '']
    .filter(Boolean)
    .join(' · ');
  // Korean + English on one line only when they comfortably fit at 42px/22px.
  const inlineEn = !p.nameKo || (p.nameKo.length * 42 + p.name.length * 12) < 540;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        padding: '20px 26px',
        background: '#fff',
        borderRadius: 28,
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
      }}
    >
      <Photo src={photo} p={p} size={150} radius={32} />
      {/* Fixed width so a long name can never shove the pillars off-canvas:
          canvas 1200 − page pad 128 − row pad 52 − photo 150 − gaps 52 − pillars ~240 */}
      <div style={{ display: 'flex', flexDirection: 'column', width: 570, gap: 6, overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: inlineEn ? 'row' : 'column', alignItems: inlineEn ? 'baseline' : 'flex-start', gap: inlineEn ? 14 : 0 }}>
          <span style={{ fontSize: 42, fontWeight: 700, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 570 }}>{p.nameKo || p.name}</span>
          {p.nameKo && <span style={{ fontSize: 22, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 570 }}>{p.name}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontSize: 36, fontWeight: 700, color: '#4f46e5' }}>{worthKo(p.netWorth)}</span>
          <span style={{ fontSize: 24, color: '#9ca3af' }}>{worthUsd(p.netWorth)}</span>
        </div>
        <div style={{ fontSize: 24, color: '#6b7280', display: 'flex', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 570 }}>{meta}</div>
      </div>
      {pillars && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {pillars.map((pv) => (
            <Pillar key={pv.label} p={pv} size={58} isDay={pv.label === '日'} />
          ))}
        </div>
      )}
    </div>
  );
}

async function dayCard(mmdd: string, n: number) {
  const people = getPeopleBornOn(mmdd).slice(0, n);
  const photos = await Promise.all(people.map(photoDataUrl));
  // 4 rows lands on 1200×1500 (X's 4:5). Fewer/more rows grow or shrink the
  // canvas so the footer never gets pushed off the bottom.
  const ROW = 262; // row height incl. gap
  const H = Math.max(900, 64 + 190 + Math.max(1, people.length) * ROW + 150);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #eef0fb 0%, #e6e4f4 100%)',
          fontFamily: FONT,
          padding: '64px 64px 52px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 34 }}>
          <div style={{ fontSize: 30, color: '#6b7280', display: 'flex', marginBottom: 6 }}>오늘 태어난 부자 🎂</div>
          <div style={{ fontSize: 72, fontWeight: 700, color: '#1a1a1a', display: 'flex', lineHeight: 1.15 }}>
            {mmDdLabel(mmdd)}에 태어난 부자
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flexGrow: 1 }}>
          {people.length === 0 && (
            <div style={{ fontSize: 40, color: '#6b7280', display: 'flex' }}>이 날 태어난 부자가 데이터에 없어요</div>
          )}
          {people.map((p, i) => (
            <PersonRow key={p.id} p={p} photo={photos[i]} showBirthYear />
          ))}
        </div>

        <Footer cta="생일 입력하면 나와 같은 일주 부자 찾기" />
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: FONT, data: font('NotoSansKR-Bold.ttf'), weight: 700, style: 'normal' },
        { name: FONT, data: font('NotoSansKR-Regular.ttf'), weight: 400, style: 'normal' },
      ],
    },
  );
}

/* ---------- single card ---------- */

async function personCard(p: EnrichedPerson, noPhoto = false) {
  const photo = noPhoto ? null : await photoDataUrl(p);
  const pillars = pillarsFor(p);
  const [y, m, d] = p.birthday.split('-');
  const chips = [companyLabel(p), natKo(p.nationality), `${y}.${m}.${d}`, p.saju?.ilju ? `${p.saju.ilju} 일주` : '', p.saju?.gyeokguk || '']
    .filter(Boolean);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #eef0fb 0%, #e6e4f4 100%)',
          fontFamily: FONT,
          padding: '56px 72px 48px',
        }}
      >
        <div style={{ fontSize: 30, color: '#6b7280', display: 'flex', marginBottom: 24 }}>
          {mmDdLabel(p.birthday.slice(5))} 태어난 부자 🎂
        </div>

        <div style={{ display: 'flex', gap: 44, alignItems: 'center' }}>
          <Photo src={photo} p={p} size={360} radius={60} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 1200 - 144 - 360 - 44 }}>
            <div style={{ fontSize: 72, fontWeight: 700, color: '#1a1a1a', display: 'flex', lineHeight: 1.1 }}>
              {p.nameKo || p.name}
            </div>
            {p.nameKo && <div style={{ fontSize: 32, color: '#9ca3af', display: 'flex' }}>{p.name}</div>}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 10 }}>
              <span style={{ fontSize: 64, fontWeight: 700, color: '#4f46e5' }}>{worthKo(p.netWorth)}</span>
              <span style={{ fontSize: 32, color: '#9ca3af' }}>{worthUsd(p.netWorth)}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
              {chips.map((c) => (
                <span
                  key={c}
                  style={{
                    fontSize: 26,
                    color: '#374151',
                    background: '#fff',
                    padding: '10px 20px',
                    borderRadius: 999,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {pillars && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 32,
              padding: '24px 40px 18px',
              background: '#fff',
              borderRadius: 32,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 700, color: '#1a1a1a', display: 'flex', marginBottom: 10 }}>
              {p.nameKo || p.name}의 사주
            </div>
            <div style={{ display: 'flex', gap: 28 }}>
              {pillars.map((pv) => (
                <Pillar key={pv.label} p={pv} size={108} isDay={pv.label === '日'} />
              ))}
            </div>
          </div>
        )}

        <div style={{ flexGrow: 1, display: 'flex', minHeight: 24 }} />
        <Footer cta="나와 같은 일주 부자는 누구?" />
      </div>
    ),
    {
      width: W,
      height: W,
      fonts: [
        { name: FONT, data: font('NotoSansKR-Bold.ttf'), weight: 700, style: 'normal' },
        { name: FONT, data: font('NotoSansKR-Regular.ttf'), weight: 400, style: 'normal' },
      ],
    },
  );
}

/* ---------- handler ---------- */

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  if (!isInternalAllowed(sp.get('key'), req.cookies.get(INTERNAL_COOKIE)?.value)) {
    return new Response('Not found', { status: 404 });
  }

  const id = sp.get('id');
  if (id) {
    const p = getPersonForCard(id);
    if (!p) return new Response('unknown id', { status: 404 });
    return personCard(p, sp.get('nophoto') === '1');
  }

  const mmdd = normalizeMmDd(sp.get('date')) ?? todayKstMmDd();
  const n = Math.min(6, Math.max(1, Number(sp.get('n') || 4) || 4));
  return dayCard(mmdd, n);
}
