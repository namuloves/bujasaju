'use client';

/**
 * /preview-card — sandbox for the saveable archetype card.
 *
 * Tolan-style: a full-bleed painterly illustration IS the card.
 * Text floats on top with gradient scrim so it stays legible no
 * matter what the illustration looks like.
 *
 * Drop the illustration at /public/types/01.png (and 02..07.png).
 * If the file isn't there yet, a placeholder gradient renders so
 * you can still see the layout.
 *
 * 1080x1080 canvas (rendered at 600 on this page).
 */

const CARDS = [
  {
    number: '01',
    type: '권력형 리더',
    sub: '판을 짜는 사람',
    oneline: '규칙은 내가 만든다.',
    detail:
      '남이 만든 사다리를 가장 빨리 오르고, 결국 내 사다리를 새로 세운다. 시스템 안에서 정점에 닿는 타입.',
    strength: '조직력 · 책임감 · 장기 게임',
    weakness: '경직성 · 변화에 늦음',
    representative: { name: '이재용', role: '삼성전자 회장' },
    ilju: '경진',
    image: '/types/01.png',
    // Placeholder palette used while the real PNG isn't installed yet.
    placeholderGradient:
      'radial-gradient(ellipse at 50% 30%, #2a3a6b 0%, #0e1a35 55%, #050a1a 100%)',
  },
];

const GOLD = '#d4af37';
const IVORY = '#f5e9c8';
const FONT = '"Pretendard", -apple-system, BlinkMacSystemFont, sans-serif';
const SIZE = 600; // preview render size; production is 1080

function Card({ card }: { card: (typeof CARDS)[number] }) {
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        position: 'relative',
        overflow: 'hidden',
        fontFamily: FONT,
        color: IVORY,
        background: card.placeholderGradient,
      }}
    >
      {/* ── Full-bleed illustration ───────────────────────── */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.image}
        alt={card.type}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // If the PNG isn't installed yet, broken img stays invisible
          // and the placeholder gradient behind shows through.
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
        }}
      />

      {/* ── Top scrim (for header chips/labels) ───────────── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '22%',
          background:
            'linear-gradient(180deg, rgba(5,10,26,0.7) 0%, rgba(5,10,26,0) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Bottom scrim (for type name + detail) ──────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '58%',
          background:
            'linear-gradient(180deg, rgba(5,10,26,0) 0%, rgba(5,10,26,0.55) 35%, rgba(5,10,26,0.92) 80%, rgba(5,10,26,0.98) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Header row: number badge + brand ──────────────── */}
      <div
        style={{
          position: 'absolute',
          top: SIZE * 0.045,
          left: SIZE * 0.05,
          right: SIZE * 0.05,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontSize: SIZE * 0.018,
            letterSpacing: '0.35em',
            color: GOLD,
            fontWeight: 600,
          }}
        >
          BUJA TYPE · {card.number} / 07
        </div>
        <div
          style={{
            fontSize: SIZE * 0.017,
            letterSpacing: '0.25em',
            color: 'rgba(245,233,200,0.55)',
          }}
        >
          BUJASAJU
        </div>
      </div>

      {/* ── Hero text block (bottom-anchored) ─────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: SIZE * 0.07,
          left: SIZE * 0.06,
          right: SIZE * 0.06,
        }}
      >
        {/* sub */}
        <div
          style={{
            fontSize: SIZE * 0.022,
            letterSpacing: '0.3em',
            color: GOLD,
            marginBottom: SIZE * 0.012,
          }}
        >
          {card.sub}
        </div>

        {/* type name — the headline */}
        <div
          style={{
            fontSize: SIZE * 0.095,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: '#fff',
            marginBottom: SIZE * 0.022,
            textShadow: '0 2px 24px rgba(0,0,0,0.5)',
          }}
        >
          {card.type}
        </div>

        {/* oneline quote */}
        <div
          style={{
            fontSize: SIZE * 0.032,
            fontWeight: 600,
            color: IVORY,
            marginBottom: SIZE * 0.022,
            fontStyle: 'italic',
            opacity: 0.95,
          }}
        >
          “{card.oneline}”
        </div>

        {/* detail paragraph */}
        <div
          style={{
            fontSize: SIZE * 0.02,
            lineHeight: 1.65,
            color: 'rgba(245,233,200,0.75)',
            marginBottom: SIZE * 0.035,
            maxWidth: '92%',
          }}
        >
          {card.detail}
        </div>

        {/* Hairline divider */}
        <div
          style={{
            height: 1,
            background: 'rgba(212,175,55,0.4)',
            marginBottom: SIZE * 0.022,
          }}
        />

        {/* Footer row — strengths/weakness + ilju + same-type */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: SIZE * 0.03,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: SIZE * 0.014,
                letterSpacing: '0.25em',
                color: GOLD,
                marginBottom: SIZE * 0.005,
              }}
            >
              STRENGTH
            </div>
            <div style={{ fontSize: SIZE * 0.018, color: 'rgba(245,233,200,0.85)' }}>
              {card.strength}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: SIZE * 0.014,
                letterSpacing: '0.25em',
                color: GOLD,
                marginBottom: SIZE * 0.005,
              }}
            >
              WEAKNESS
            </div>
            <div style={{ fontSize: SIZE * 0.018, color: 'rgba(245,233,200,0.85)' }}>
              {card.weakness}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: SIZE * 0.014,
                letterSpacing: '0.25em',
                color: GOLD,
                marginBottom: SIZE * 0.005,
              }}
            >
              ILJU
            </div>
            <div style={{ fontSize: SIZE * 0.018, color: 'rgba(245,233,200,0.85)' }}>
              {card.ilju}
            </div>
          </div>
        </div>

        {/* Bottom credit: same-type billionaire */}
        <div
          style={{
            marginTop: SIZE * 0.018,
            fontSize: SIZE * 0.016,
            color: 'rgba(245,233,200,0.55)',
            letterSpacing: '0.02em',
          }}
        >
          같은 타입의 부자 · {card.representative.name}{' '}
          <span style={{ opacity: 0.65 }}>({card.representative.role})</span>
        </div>
      </div>
    </div>
  );
}

export default function PreviewCard() {
  return (
    <div className="min-h-screen bg-neutral-100 py-12">
      <div className="mx-auto px-8" style={{ maxWidth: 1200 }}>
        <h1 className="text-2xl font-bold mb-2 text-neutral-900">
          부자 타입 카드 — 일러스트가 주인공
        </h1>
        <p className="text-sm text-neutral-600 mb-2">
          Tolan 스타일 풀블리드 일러스트 + 하단 텍스트 오버레이. 1080×1080 정사각형 (여기선 {SIZE} 렌더).
        </p>
        <p className="text-xs text-neutral-500 mb-8">
          일러스트가 아직 없으면 그라데이션 플레이스홀더가 보임. PNG는{' '}
          <code className="bg-neutral-200 px-1.5 py-0.5 rounded">public/types/01.png</code>{' '}
          위치에 1080×1080으로 넣으면 자동 반영.
        </p>

        <div className="flex flex-wrap gap-10">
          {CARDS.map((card) => (
            <div key={card.number}>
              <div className="shadow-2xl rounded-sm overflow-hidden">
                <Card card={card} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
