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
       * `beforeInteractive` (rather than `afterInteractive` like the tags
       * above) puts this in the server-rendered <head>. That placement is
       * load-bearing, not cosmetic: AdSense's site-verification crawler
       * looks for the snippet in <head> and reports the site as "not ready"
       * when it only appears in <body>, which is what an afterInteractive
       * tag does — it injects at the end of <body> after hydration.
       *
       * Next only honours this strategy in the root layout, and the docs
       * place the tag as a sibling of <body>. Do not move it inside <body>.
       *
       * The publisher ID here must match the one in public/ads.txt.
       */}
      <Script
        id="google-adsense"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5850602718784942"
        strategy="beforeInteractive"
        crossOrigin="anonymous"
      />
    </html>
  );
}
