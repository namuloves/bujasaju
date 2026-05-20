import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = '부자사주 — 나와 같은 사주 일주를 가진 부자 찾기';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Same Korean billionaires that appear in the homepage carousel.
// Hotlinked from Forbes' image CDN — these are public and stable.
// Stem → 오행 → Tailwind-equivalent color (mirrors OHAENG_COLORS in
// src/lib/saju/constants.ts but inlined as hex so Satori can render them).
const STEM_TO_OHAENG: Record<string, '목' | '화' | '토' | '금' | '수'> = {
  갑: '목', 을: '목',
  병: '화', 정: '화',
  무: '토', 기: '토',
  경: '금', 신: '금',
  임: '수', 계: '수',
};
// Text-only ohaeng colors — matches the site's PersonCard styling
// (e.g. "이부진 · 기미" where 기미 is colored).
const OHAENG_TEXT: Record<string, string> = {
  목: '#16a34a', // green-600
  화: '#dc2626', // red-600
  토: '#ca8a04', // yellow-600
  금: '#6b7280', // gray-500
  수: '#2563eb', // blue-600
};
const iljuColor = (ilju: string) =>
  OHAENG_TEXT[STEM_TO_OHAENG[ilju[0]] ?? '토'];

// ilju values come from public/enriched-billionaires.json — precomputed.
const FACES: { name: string; company: string; ilju: string; photo: string }[] = [
  {
    name: '일론 머스크',
    company: 'Tesla · SpaceX',
    ilju: '갑신',
    photo:
      'https://assets.weforum.org/sf_account/image/SU7jY2MYK0Qaj6IgY6e0hXgO4LBYNB6qKxy9f-cr8KU.jpg',
  },
  {
    name: '이재용',
    company: '삼성',
    ilju: '갑자',
    photo:
      'https://specials-images.forbesimg.com/imageserve/661d531ae908e033f6c8e551/416x416.jpg?background=000000&cropX1=1080&cropX2=2007&cropY1=93&cropY2=1020',
  },
  {
    name: '젠슨 황',
    company: '엔비디아',
    ilju: '신묘',
    photo:
      'https://specials-images.forbesimg.com/imageserve/68750a2d250de42ce7c5301b/416x416.jpg?background=000000&cropX1=832&cropX2=2632&cropY1=152&cropY2=1951',
  },
  {
    name: '김병훈',
    company: '에이피알',
    ilju: '갑자',
    photo:
      'https://specials-images.forbesimg.com/imageserve/687a81f321a66ab9c59c9102/416x416.jpg?background=000000&cropX1=905&cropX2=1261&cropY1=167&cropY2=523',
  },
  {
    name: '김정수',
    company: '삼양식품',
    ilju: '갑술',
    photo: 'https://www.businesspost.co.kr/upload/human/2024062821428122_1.jpg',
  },
];

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '56px 64px 64px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top — wordmark (top-left) */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
          }}
        >
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: '#0b1220',
              letterSpacing: -1,
            }}
          >
            부자사주
          </div>
          <div style={{ fontSize: 22, fontWeight: 500, color: '#94a3b8' }}>
            富者四柱
          </div>
        </div>

        {/* Portraits row — actual billionaire photos from the carousel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {FACES.map((f) => (
            <div
              key={f.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.photo}
                alt={f.name}
                width={148}
                height={148}
                style={{
                  width: 148,
                  height: 148,
                  borderRadius: 24,
                  objectFit: 'cover',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0b1220' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: 18, color: '#cbd5e1' }}>·</div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: iljuColor(f.ilju),
                  }}
                >
                  {f.ilju}
                </div>
              </div>
              <div style={{ fontSize: 16, color: '#94a3b8' }}>{f.company}</div>
            </div>
          ))}
        </div>

        {/* Headline + sub */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontSize: 56,
              fontWeight: 900,
              color: '#0b1220',
              letterSpacing: -2,
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            <div>나와 같은 사주 일주를 가진 부자 찾기</div>
          </div>
          <div style={{ fontSize: 26, color: '#64748b', textAlign: 'center' }}>
            생년월일만 알려주시면 같은 일주의 부자를 찾아드릴게요
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
