import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/og-story
 *   Story-ratio (1080×1920) share image — what users save and post to
 *   Instagram Stories / KakaoTalk. Dark editorial palette, brand top-loaded
 *   (survives platform crop), mini 사주 chart strip, photo hero, rank badge.
 *
 * Params (all optional except featuredName + ilju):
 *   ilju            — e.g. "경진" (user's 일주)
 *   iljuHanja       — e.g. "庚辰"
 *   featuredName    — Korean name of the matched billionaire
 *   featuredNameEn  — English name (for trust signal)
 *   featuredSource  — company / industry
 *   featuredWorth   — formatted Korean worth, e.g. "28조"
 *   featuredPhoto   — photo URL
 *   featuredNat     — country code (US/KR/...)
 *   rank            — 60갑자 중 N위 (skipped if missing)
 *   sameCount       — number of billionaires with same 일주
 *   year/month/day/hour — 4 pillars as "갑자" / "병인" etc (each 2 chars
 *     stem+branch). Used to render the mini chart strip. The `hour` pillar
 *     is optional — if absent, that cell shows a "?" placeholder.
 */

const NAT_KO: Record<string, string> = {
  US: '미국', KR: '한국', CN: '중국', JP: '일본', IN: '인도', FR: '프랑스',
  DE: '독일', GB: '영국', IT: '이탈리아', ES: '스페인', CA: '캐나다', AU: '호주',
  BR: '브라질', MX: '멕시코', RU: '러시아', HK: '홍콩', TW: '대만', SG: '싱가포르',
  IL: '이스라엘', SE: '스웨덴', NL: '네덜란드', CH: '스위스', TH: '태국',
  ID: '인도네시아', MY: '말레이시아', ZA: '남아공', SA: '사우디', AE: 'UAE',
  AT: '오스트리아', DK: '덴마크', IE: '아일랜드', UA: '우크라이나', CZ: '체코',
  PH: '필리핀', PK: '파키스탄', PT: '포르투갈', AR: '아르헨티나', GR: '그리스',
  FI: '핀란드', HU: '헝가리', MC: '모나코', CL: '칠레', CO: '콜롬비아',
  NZ: '뉴질랜드', NG: '나이지리아', EG: '이집트', GE: '조지아', LB: '레바논',
};

// Inlined element maps so the edge route stays dep-free. Mirrors
// src/lib/saju/constants.ts (STEM_TO_OHAENG + BRANCH_TO_OHAENG).
const STEM_OHAENG: Record<string, string> = {
  '갑': '목', '을': '목',
  '병': '화', '정': '화',
  '무': '토', '기': '토',
  '경': '금', '신': '금',
  '임': '수', '계': '수',
};
const BRANCH_OHAENG: Record<string, string> = {
  '자': '수', '축': '토', '인': '목', '묘': '목',
  '진': '토', '사': '화', '오': '화', '미': '토',
  '신': '금', '유': '금', '술': '토', '해': '수',
};
// Dark-theme element colors — saturated enough to read on #0d0d0d.
const OHAENG_COLOR: Record<string, string> = {
  '목': '#22c55e', // green
  '화': '#ef4444', // red
  '토': '#f59e0b', // amber
  '금': '#94a3b8', // slate
  '수': '#3b82f6', // blue
};

function elementOfStem(stem: string): string {
  return STEM_OHAENG[stem] ?? '토';
}
function elementOfBranch(branch: string): string {
  return BRANCH_OHAENG[branch] ?? '토';
}

interface PillarParts {
  stem: string;   // 1 char
  branch: string; // 1 char
}
function parsePillar(raw: string | null): PillarParts | null {
  if (!raw || raw.length < 2) return null;
  return { stem: raw[0], branch: raw[1] };
}

/**
 * Mini chart pillar — used 4× in the chart strip at the top of the image.
 * Stem on top, branch on the bottom, both colored by their 오행. When the
 * pillar is null (no hour given), render a dashed placeholder.
 */
function MiniPillar({
  label,
  pillar,
  isDayPillar,
}: {
  label: string;
  pillar: PillarParts | null;
  isDayPillar: boolean;
}) {
  const stemColor = pillar ? OHAENG_COLOR[elementOfStem(pillar.stem)] : '#3a3a3a';
  const branchColor = pillar ? OHAENG_COLOR[elementOfBranch(pillar.branch)] : '#3a3a3a';
  const cellSize = 140;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: isDayPillar ? 6 : 0,
          borderRadius: 18,
          border: isDayPillar ? '2px solid rgba(245,158,11,0.6)' : 'none',
        }}
      >
        {/* Stem cell */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: cellSize,
            height: cellSize,
            backgroundColor: pillar ? stemColor : 'transparent',
            border: pillar ? 'none' : '2px dashed #3a3a3a',
            borderRadius: 16,
            color: '#ffffff',
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          {pillar?.stem ?? '?'}
        </div>
        {/* Branch cell */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: cellSize,
            height: cellSize,
            backgroundColor: pillar ? branchColor : 'transparent',
            border: pillar ? 'none' : '2px dashed #3a3a3a',
            borderRadius: 16,
            color: '#ffffff',
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          {pillar?.branch ?? '?'}
        </div>
      </div>
    </div>
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ilju = searchParams.get('ilju') || '갑자';
  const iljuHanja = searchParams.get('iljuHanja') || '';
  const featuredName = searchParams.get('featuredName') || '';
  const featuredNameEn = searchParams.get('featuredNameEn') || '';
  const featuredSource = searchParams.get('featuredSource') || '';
  const featuredWorth = searchParams.get('featuredWorth') || '';
  const featuredPhoto = searchParams.get('featuredPhoto') || '';
  const rawNat = searchParams.get('featuredNat') || '';
  const featuredNat = NAT_KO[rawNat] || rawNat;
  const rank = searchParams.get('rank');
  const sameCount = searchParams.get('sameCount');

  const yearPillar = parsePillar(searchParams.get('year'));
  const monthPillar = parsePillar(searchParams.get('month'));
  const dayPillar = parsePillar(searchParams.get('day'));
  const hourPillar = parsePillar(searchParams.get('hour'));

  const [fontBold, fontRegular] = await Promise.all([
    fetch(new URL('/fonts/NotoSansKR-Bold.ttf', req.url)).then(r => r.arrayBuffer()),
    fetch(new URL('/fonts/NotoSansKR-Regular.ttf', req.url)).then(r => r.arrayBuffer()),
  ]);

  // Normalize photo URL — bump Forbes thumbnails to high-res, force https.
  let photoUrl = featuredPhoto;
  if (photoUrl) {
    if (photoUrl.startsWith('//')) photoUrl = `https:${photoUrl}`;
    if (photoUrl.startsWith('http://')) photoUrl = photoUrl.replace(/^http:/, 'https:');
    photoUrl = photoUrl.replace('416x416', '800x800');
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #0d0d0d 0%, #1a1a1a 100%)',
          fontFamily: 'NotoSansKR',
          color: '#ffffff',
          position: 'relative',
          // Top + bottom safe zones for Instagram Stories crop (~14% bottom
          // for the sticker tray, ~10% top for profile + reply input).
          padding: '90px 80px 200px 80px',
        }}
      >
        {/* ─── BRAND (top, survives crops) ─────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 64,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: '#f59e0b',
              color: '#0d0d0d',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            富
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
              부자사주
            </span>
            <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              bujasaju.com
            </span>
          </div>
        </div>

        {/* ─── CHART STRIP — 4 pillars, 시 / 일 / 월 / 년 ────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 22,
            marginBottom: 70,
          }}
        >
          <MiniPillar label="時" pillar={hourPillar} isDayPillar={false} />
          <MiniPillar label="日" pillar={dayPillar} isDayPillar={true} />
          <MiniPillar label="月" pillar={monthPillar} isDayPillar={false} />
          <MiniPillar label="年" pillar={yearPillar} isDayPillar={false} />
        </div>

        {/* ─── CLAIMABLE LABEL — "당신은 [경진] 일주" ─────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 60,
          }}
        >
          <span style={{ fontSize: 36, color: 'rgba(255,255,255,0.55)', marginBottom: 12 }}>
            당신은
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 130, fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>
              {ilju}
            </span>
            <span style={{ fontSize: 64, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>
              일주
            </span>
          </div>
          {iljuHanja && (
            <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.35)', marginTop: 8 }}>
              {iljuHanja}
            </span>
          )}
        </div>

        {/* ─── PROOF CARD — "같은 일주를 가진 부자" ───────────────── */}
        {featuredName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              padding: '28px 32px',
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 28,
            }}
          >
            {photoUrl && (
              <img
                src={photoUrl}
                width={180}
                height={180}
                style={{
                  borderRadius: 22,
                  objectFit: 'cover',
                  border: '3px solid rgba(245,158,11,0.4)',
                }}
              />
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
              }}
            >
              <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>
                같은 일주
              </span>
              <span style={{ fontSize: 56, fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>
                {featuredName}
              </span>
              {featuredNameEn && (
                <span style={{ fontSize: 26, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                  {featuredNameEn}
                </span>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  marginTop: 14,
                }}
              >
                {featuredNat && (
                  <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)' }}>
                    {featuredNat}
                  </span>
                )}
                {featuredSource && (
                  <>
                    <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)' }}>·</span>
                    <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.6)' }}>
                      {featuredSource}
                    </span>
                  </>
                )}
                {featuredWorth && (
                  <>
                    <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)' }}>·</span>
                    <span style={{ fontSize: 32, color: '#f59e0b', fontWeight: 700 }}>
                      {featuredWorth}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── RANK BADGE (corner, achievement style) ───────────────── */}
        {rank && (
          <div
            style={{
              position: 'absolute',
              top: 90,
              right: 80,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '14px 22px',
              backgroundColor: '#f59e0b',
              borderRadius: 18,
              color: '#0d0d0d',
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
              {rank}위
            </span>
            <span style={{ fontSize: 16, opacity: 0.75, marginTop: 2 }}>
              / 60갑자
            </span>
          </div>
        )}

        {/* ─── BOTTOM META — "같은 일주 부자 N명" + tagline ─────── */}
        <div
          style={{
            position: 'absolute',
            bottom: 110,
            left: 80,
            right: 80,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {sameCount && (
            <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.55)' }}>
              같은 {ilju} 일주 부자 {sameCount}명
            </span>
          )}
          <span style={{ fontSize: 24, color: 'rgba(255,255,255,0.35)' }}>
            나도 확인 →
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts: [
        { name: 'NotoSansKR', data: fontBold, weight: 700 as const, style: 'normal' as const },
        { name: 'NotoSansKR', data: fontRegular, weight: 400 as const, style: 'normal' as const },
      ],
    },
  );
}
