import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';
import { OG_FONT_CHARS, OG_FONT_UNAVAILABLE_CHARS } from '@/lib/og/fontCoverage';

export const runtime = 'edge';

/**
 * GET /api/og?ilju=병인&gyeokguk=정관격&matches=5
 *   &featuredName=이재용&featuredSource=Samsung&featuredWorth=33조
 *   &featuredIlju=갑자&featuredPhoto=https://...&featuredNat=한국
 *
 * Returns a 1296×1296 PNG share card.
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

/**
 * Fonts. The full NotoSansKR Bold + Regular are ~9.4MB, but the card only
 * draws a few strings, so by default we load small subsets (~235KB each,
 * built by scripts/subset-og-fonts.py). If the text contains a character the
 * subsets lack — e.g. a rare Hangul syllable in a new name — we load the full
 * fonts instead so it still renders. Each edge isolate fetches a variant once
 * and reuses it.
 */
type FontVariant = 'subset' | 'full';
type FontSet = { bold: ArrayBuffer; regular: ArrayBuffer };

const FONT_FILES: Record<FontVariant, { bold: string; regular: string }> = {
  subset: { bold: 'og/NotoSansKR-Bold.subset.woff', regular: 'og/NotoSansKR-Regular.subset.woff' },
  full: { bold: 'NotoSansKR-Bold.ttf', regular: 'NotoSansKR-Regular.ttf' },
};

const SUBSET_CHARS = new Set(OG_FONT_CHARS);
const UNAVAILABLE_CHARS = new Set(OG_FONT_UNAVAILABLE_CHARS);

/** True when the full fonts could render a character the subsets cannot. */
function needsFullFonts(texts: string[]): boolean {
  for (const text of texts) {
    for (const ch of text) {
      if (!SUBSET_CHARS.has(ch) && !UNAVAILABLE_CHARS.has(ch)) return true;
    }
  }
  return false;
}

const fontCache = new Map<FontVariant, Promise<FontSet>>();

function loadFonts(variant: FontVariant, base: string): Promise<FontSet> {
  const cached = fontCache.get(variant);
  if (cached) return cached;
  const get = (file: string) =>
    fetch(new URL(`/fonts/${file}`, base)).then((r) => {
      if (!r.ok) throw new Error(`font ${file}: HTTP ${r.status}`);
      return r.arrayBuffer();
    });
  const files = FONT_FILES[variant];
  const pending = Promise.all([get(files.bold), get(files.regular)])
    .then(([bold, regular]) => ({ bold, regular }))
    .catch((err: unknown) => {
      fontCache.delete(variant); // don't cache a failure
      throw err;
    });
  fontCache.set(variant, pending);
  return pending;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ilju = searchParams.get('ilju') || '갑자';
  const featuredName = searchParams.get('featuredName') || '';
  const featuredNameEn = searchParams.get('featuredNameEn') || '';
  const featuredSource = searchParams.get('featuredSource') || '';
  const featuredWorth = searchParams.get('featuredWorth') || '';
  const featuredPhoto = searchParams.get('featuredPhoto') || '';
  const featuredIlju = searchParams.get('featuredIlju') || '';
  const rawNat = searchParams.get('featuredNat') || '';
  const featuredNat = NAT_KO[rawNat] || rawNat;

  // Every user-supplied string drawn on the card. The static copy needs no
  // check: scripts/subset-og-fonts.py reads its Hangul straight from this file.
  const variant: FontVariant = needsFullFonts([
    ilju,
    featuredName,
    featuredNameEn,
    featuredSource,
    featuredWorth,
    featuredNat,
  ])
    ? 'full'
    : 'subset';
  const { bold: fontBold, regular: fontRegular } = await loadFonts(variant, req.url);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #e8e0f0 0%, #d8d0e8 40%, #c8c0d8 100%)',
          fontFamily: 'NotoSansKR',
          position: 'relative',
          // Safe inner frame: keep all natural-flow content away from the
          // edges and from the absolute-positioned watermark at the bottom.
          padding: '60px 80px 150px 80px',
        }}
      >
        {/* Top label */}
        <div style={{ fontSize: 44, color: 'rgba(0,0,0,0.65)', marginBottom: 18, display: 'flex' }}>
          나와 사주가 같은 부자
        </div>

        {/* Main copy */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <div style={{ fontSize: 68, fontWeight: 700, color: '#1a1a1a', display: 'flex', textAlign: 'center' }}>
            <span>당신과 같은&nbsp;</span><span style={{ color: '#4f46e5', textDecoration: 'underline', textDecorationColor: 'rgba(79,70,229,0.3)', textUnderlineOffset: '8px' }}>{ilju} 일주</span><span>를 가진 부자</span>
          </div>
        </div>

        {/* Featured photo */}
        {featuredPhoto && (
          <img
            src={featuredPhoto.replace('416x416', '800x800')}
            width={540}
            height={540}
            style={{
              borderRadius: 54,
              objectFit: 'cover',
              marginBottom: 28,
              border: '6px solid rgba(255,255,255,0.85)',
            }}
          />
        )}

        {/* Name */}
        <div style={{ fontSize: 78, fontWeight: 700, color: '#1a1a1a', display: 'flex', marginBottom: featuredNameEn ? 4 : 10 }}>
          {featuredName}
        </div>
        {featuredNameEn && (
          <div style={{ fontSize: 36, color: 'rgba(0,0,0,0.5)', display: 'flex', marginBottom: 14 }}>
            {featuredNameEn}
          </div>
        )}

        {/* Worth */}
        {featuredWorth && (
          <div style={{ fontSize: 50, fontWeight: 600, color: '#4f46e5', display: 'flex', marginBottom: 8 }}>
            포브스 추정 자산: {featuredWorth}
          </div>
        )}

        {/* Source · Country */}
        <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          {featuredSource && (
            <span style={{ fontSize: 42, color: 'rgba(0,0,0,0.45)' }}>
              {featuredSource}
            </span>
          )}
          {featuredSource && featuredNat && (
            <span style={{ fontSize: 42, color: 'rgba(0,0,0,0.2)' }}>·</span>
          )}
          {featuredNat && (
            <span style={{ fontSize: 42, color: 'rgba(0,0,0,0.45)' }}>
              {featuredNat}
            </span>
          )}
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 42, fontWeight: 700, color: 'rgba(0,0,0,0.55)' }}>
            부자사주
          </span>
          <span style={{ fontSize: 34, color: 'rgba(0,0,0,0.4)' }}>
            bujasaju.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1296,
      height: 1296,
      fonts: [
        { name: 'NotoSansKR', data: fontBold, weight: 700 as const, style: 'normal' as const },
        { name: 'NotoSansKR', data: fontRegular, weight: 400 as const, style: 'normal' as const },
      ],
      // Same query string → same image, so let browsers, Kakao/X crawlers
      // and the Vercel edge reuse it instead of re-rendering every hit.
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
      },
    },
  );
}
