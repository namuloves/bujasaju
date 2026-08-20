import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import Footer from "@/components/Footer";
import ColorPicker from "@/components/dev/ColorPicker";
import dynamic from "next/dynamic";
import "css-spec/style.css";

// Dev-only css-spec overlay — toggle with ⌥D. Tree-shaken in production.
const DesignSpecOverlay =
  process.env.NODE_ENV !== "production"
    ? dynamic(() => import("css-spec/client").then((m) => m.DesignSpecOverlay))
    : () => null;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bujasaju.com'),
  verification: {
    other: {
      'naver-site-verification': ['c69d3fd936b21512a43a1600e8894041e94d8c47', '15e00aa7730b6ee521716ddee5d348b07b3c6efe'],
    },
  },
  title: "부자사주 富者四柱 - 세계 부자들의 사주 분석",
  description: "세계 부자 500명의 사주 팔자를 분석합니다. 일주, 격국, 월지로 검색해 보세요.",
  openGraph: {
    title: "부자사주 富者四柱 - 세계 부자들의 사주 분석",
    description: "세계 부자 500명의 사주 팔자를 분석합니다. 일주, 격국, 월지로 검색해 보세요.",
    url: '/',
    siteName: '부자사주 富者四柱',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "부자사주 富者四柱 - 세계 부자들의 사주 분석",
    description: "세계 부자 500명의 사주 팔자를 분석합니다. 일주, 격국, 월지로 검색해 보세요.",
  },
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  /** Parallel-route slot used by `app/@modal` to overlay an intercepted
   *  /profile/[id] view on top of the current page. Renders nothing when
   *  no intercepted route is active (`app/@modal/default.tsx` returns null). */
  modal: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: silences benign mismatches from
          browser extensions (Bitdefender / Grammarly / etc.) that inject
          attributes like `bis_register` into <body> before React hydrates.
          Only this single element's attributes are skipped — children
          still get the usual hydration checks. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <LanguageProvider>
          {children}
          {modal}
          <Footer />
          {/* Floating color picker — only renders when URL has ?dev=colors */}
          <ColorPicker />
        </LanguageProvider>
        <Analytics />
        {/* GA4 via @next/third-parties: handles SPA navigation page_view
            events automatically and avoids the next/script hydration race
            that left dataLayer with only [["js"], ["config"]] entries. */}
        <GoogleAnalytics gaId="G-75TZ2JD6DS" />
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      
        <DesignSpecOverlay />
      </body>
      {/* Google AdSense.
       *
       * A plain <script>, NOT next/script — deliberately, and this is the
       * second attempt. React 19 hoists an `async` script into <head> and
       * emits it as a real tag in the server-rendered HTML, which is what
       * AdSense's verification crawler reads.
       *
       * Neither next/script strategy works here:
       *   - `afterInteractive` injects at the end of <body> after hydration,
       *     so the raw HTML has no tag at all.
       *   - `beforeInteractive` looks right but emits only
       *     `<link rel="preload" as="script">` in <head>. The actual script
       *     is added later by Next's client runtime. A crawler that parses
       *     HTML without executing JS sees a preload hint and no snippet,
       *     and verification fails with "Couldn't verify your site" — which
       *     is exactly what happened on the first attempt.
       *
       * Verified against the built output: this renders
       * `<script async src="…" crossorigin="anonymous">` inside <head>.
       * If you change this, re-check with `curl -s https://bujasaju.com/ |
       * grep -o '<script[^>]*adsbygoogle[^>]*>'` — a match is required, and
       * a <link rel=preload> is not a substitute.
       *
       * The publisher ID here must match the one in public/ads.txt.
       */}
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5850602718784942"
        crossOrigin="anonymous"
      />
    </html>
  );
}
