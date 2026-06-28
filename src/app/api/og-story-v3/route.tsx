import { ImageResponse } from '@vercel/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/og-story-v3
 *   Year-in-Review style stat card (1080×1920). Restructured from v2's
 *   celebrity-portrait approach to a data-led layout:
 *     1. HERO    — huge rank ("60갑자 중 23위")
 *     2. PAYOFF  — short trait paragraph ("자수성가형 테크 창업자가 많은 일주")
 *     3. PROOF   — tribe row (5 mini face thumbs + "+N") + breakdown bars
 *                  (자수성가 / 상속 / 혼합) + top industries
 *
 * Params (all optional except rank + sameCount):
 *   rank             — e.g. "23"   (required for the hero)
 *   sameCount        — e.g. "38"   (total billionaires in this 일주)
 *   percentile       — e.g. "38"   (rounded; supporting "상위 N%" line)
 *   ilju             — e.g. "경진" (small label, not the hero)
 *   trait            — short paragraph, 30–80 chars (the payoff)
 *   selfMade         — count
 *   inherited        — count
 *   mixed            — count
 *   industries       — top 3 industries, comma-separated (already Korean)
 *   facePhotos       — up to 5 photo URLs, pipe-separated (`|`)
 *   faceNames        — up to 5 names, pipe-separated (matches facePhotos)
 */

interface BarRow {
  label: string;
  count: number;
}

function PartitionBar({
  label,
  count,
  total,
  accent,
}: {
  label: string;
  count: number;
  total: number;
  accent: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const barWidth = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        width: '100%',
      }}
    >
      <span
        style={{
          fontSize: 26,
          color: 'rgba(255,255,255,0.6)',
          width: 110,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: 36,
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: `${barWidth}%`,
            height: '100%',
            backgroundColor: accent,
            borderRadius: 8,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#ffffff',
          width: 90,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {count}명
      </span>
    </div>
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const rank = searchParams.get('rank') || '';
  const sameCount = parseInt(searchParams.get('sameCount') || '0', 10);
  const percentile = searchParams.get('percentile') || '';
  const ilju = searchParams.get('ilju') || '';
  const trait = searchParams.get('trait') || '';
  const selfMade = parseInt(searchParams.get('selfMade') || '0', 10);
  const inherited = parseInt(searchParams.get('inherited') || '0', 10);
  const mixed = parseInt(searchParams.get('mixed') || '0', 10);
  const industries = searchParams.get('industries') || '';
  const facePhotosRaw = searchParams.get('facePhotos') || '';
  const faceNamesRaw = searchParams.get('faceNames') || '';

  const facePhotos = facePhotosRaw
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 5);
  const faceNames = faceNamesRaw
    .split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  // Normalize each photo URL (Forbes thumbs → high-res, force https).
  const normalizedFaces = facePhotos.map(url => {
    let u = url;
    if (u.startsWith('//')) u = `https:${u}`;
    if (u.startsWith('http://')) u = u.replace(/^http:/, 'https:');
    return u.replace('416x416', '800x800');
  });

  // Partition bar total — only the slices we know about. Falls back to
  // sameCount when individual buckets are missing (caller can opt out of
  // the breakdown by sending zeros).
  const breakdownTotal = selfMade + inherited + mixed;
  const showBreakdown = breakdownTotal > 0;

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
          background: 'linear-gradient(180deg, #0d0d0d 0%, #161616 100%)',
          fontFamily: 'NotoSansKR',
          color: '#ffffff',
          padding: '80px 70px 100px 70px',
          position: 'relative',
        }}
      >
        {/* ─── BRAND (top, fixed) ──────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 52,
                height: 52,
                borderRadius: 13,
                backgroundColor: '#f59e0b',
                color: '#0d0d0d',
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              富
            </div>
            <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
              부자사주
            </span>
          </div>
          {ilju && (
            <span
              style={{
                fontSize: 24,
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 500,
              }}
            >
              {ilju} 일주
            </span>
          )}
        </div>

        {/* ─── HERO RANK ──────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: 70,
          }}
        >
          <span style={{ fontSize: 32, color: 'rgba(255,255,255,0.5)', marginBottom: 18 }}>
            60갑자 중
          </span>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 16,
            }}
          >
            <span
              style={{
                fontSize: 340,
                fontWeight: 700,
                color: '#f59e0b',
                lineHeight: 0.85,
                letterSpacing: '-0.04em',
              }}
            >
              {rank}
            </span>
            <span
              style={{
                fontSize: 110,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              위
            </span>
          </div>
          {percentile && (
            <span
              style={{
                fontSize: 30,
                color: 'rgba(255,255,255,0.55)',
                marginTop: 18,
              }}
            >
              상위 {percentile}%
            </span>
          )}
        </div>

        {/* ─── DIVIDER ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
            marginTop: 70,
          }}
        />

        {/* ─── TRAIT PARAGRAPH (the payoff) ────────────────────────── */}
        {trait && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 38,
            }}
          >
            <span
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 12,
                letterSpacing: '0.04em',
              }}
            >
              당신의 일주는
            </span>
            <span
              style={{
                fontSize: 38,
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.35,
              }}
            >
              {trait}
            </span>
          </div>
        )}

        {/* ─── DIVIDER ─────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
            marginTop: 42,
          }}
        />

        {/* ─── TRIBE ROW — mini faces + count ──────────────────────── */}
        {normalizedFaces.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 38,
            }}
          >
            <span
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 18,
                letterSpacing: '0.04em',
              }}
            >
              같은 일주의 부자 {sameCount || normalizedFaces.length}명
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {normalizedFaces.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  width={120}
                  height={120}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    objectFit: 'cover',
                    border: '3px solid rgba(255,255,255,0.12)',
                  }}
                />
              ))}
              {sameCount > normalizedFaces.length && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    border: '2px dashed rgba(245,158,11,0.4)',
                    color: '#f59e0b',
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  +{sameCount - normalizedFaces.length}
                </div>
              )}
            </div>
            {faceNames.length > 0 && (
              <p
                style={{
                  display: 'block',
                  fontSize: 20,
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 18,
                  marginBottom: 0,
                  lineHeight: 1.4,
                }}
              >
                {faceNames.join(' · ')}
              </p>
            )}
          </div>
        )}

        {/* ─── BREAKDOWN BARS — wealth origin ──────────────────────── */}
        {showBreakdown && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 50,
              gap: 16,
            }}
          >
            <span
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 6,
                letterSpacing: '0.04em',
              }}
            >
              부의 유형 ({breakdownTotal}명 중)
            </span>
            <PartitionBar
              label="자수성가"
              count={selfMade}
              total={breakdownTotal}
              accent="#f59e0b"
            />
            <PartitionBar
              label="상속"
              count={inherited}
              total={breakdownTotal}
              accent="rgba(245,158,11,0.55)"
            />
            <PartitionBar
              label="혼합"
              count={mixed}
              total={breakdownTotal}
              accent="rgba(245,158,11,0.3)"
            />
          </div>
        )}

        {/* ─── INDUSTRIES line ─────────────────────────────────────── */}
        {industries && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 36,
            }}
          >
            <span
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 10,
                letterSpacing: '0.04em',
              }}
            >
              주요 분야
            </span>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#ffffff' }}>
              {industries}
            </span>
          </div>
        )}

        {/* ─── FOOTER (URL + CTA) ─────────────────────────────────── */}
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            left: 70,
            right: 70,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.45)' }}>
            bujasaju.com
          </span>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#f59e0b',
            }}
          >
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
