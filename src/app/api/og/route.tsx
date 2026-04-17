import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/og?ilju=병인&gyeokguk=정관격&matches=5
 *   &featuredName=이재용&featuredSource=Samsung&featuredWorth=33조
 *   &featuredIlju=갑자&featuredPhoto=https://...&featuredNat=한국
 *
 * Returns a 1080×1080 PNG share card.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ilju = searchParams.get('ilju') || '갑자';
  const featuredName = searchParams.get('featuredName') || '';
  const featuredSource = searchParams.get('featuredSource') || '';
  const featuredWorth = searchParams.get('featuredWorth') || '';
  const featuredPhoto = searchParams.get('featuredPhoto') || '';
  const featuredIlju = searchParams.get('featuredIlju') || '';
  const featuredNat = searchParams.get('featuredNat') || '';

  const [fontBold, fontRegular] = await Promise.all([
    fetch(new URL('/fonts/NotoSansKR-Bold.ttf', req.url)).then(r => r.arrayBuffer()),
    fetch(new URL('/fonts/NotoSansKR-Regular.ttf', req.url)).then(r => r.arrayBuffer()),
  ]);

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
        }}
      >
        {/* Top label */}
        <div style={{ fontSize: 20, color: 'rgba(0,0,0,0.35)', marginBottom: 24, display: 'flex' }}>
          나와 사주가 같은 부자
        </div>

        {/* Main copy */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 48,
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', display: 'flex', textAlign: 'center' }}>
            당신과 같은 {ilju}일주를 가진 부자
          </div>
        </div>

        {/* Featured photo */}
        {featuredPhoto && (
          <img
            src={featuredPhoto.replace('416x416', '800x800')}
            width={280}
            height={280}
            style={{
              borderRadius: 36,
              objectFit: 'cover',
              marginBottom: 28,
              border: '4px solid rgba(255,255,255,0.8)',
            }}
          />
        )}

        {/* Name */}
        <div style={{ fontSize: 36, fontWeight: 700, color: '#1a1a1a', display: 'flex', marginBottom: 6 }}>
          {featuredName}
        </div>

        {/* Ilju */}
        {featuredIlju && (
          <div style={{ fontSize: 16, color: 'rgba(0,0,0,0.4)', display: 'flex', marginBottom: 12 }}>
            {featuredIlju}일주
          </div>
        )}

        {/* Worth */}
        {featuredWorth && (
          <div style={{ fontSize: 24, fontWeight: 600, color: '#4f46e5', display: 'flex', marginBottom: 12 }}>
            {featuredWorth} 원
          </div>
        )}

        {/* Source · Country */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
          {featuredSource && (
            <span style={{ fontSize: 18, color: 'rgba(0,0,0,0.45)' }}>
              {featuredSource}
            </span>
          )}
          {featuredSource && featuredNat && (
            <span style={{ fontSize: 18, color: 'rgba(0,0,0,0.2)' }}>·</span>
          )}
          {featuredNat && (
            <span style={{ fontSize: 18, color: 'rgba(0,0,0,0.45)' }}>
              {featuredNat}
            </span>
          )}
        </div>

        {/* Watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(0,0,0,0.25)' }}>
            부자사주
          </span>
          <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.15)' }}>
            bujasaju.com
          </span>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: 'NotoSansKR', data: fontBold, weight: 700 as const, style: 'normal' as const },
        { name: 'NotoSansKR', data: fontRegular, weight: 400 as const, style: 'normal' as const },
      ],
    },
  );
}
