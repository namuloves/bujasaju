import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import Script from "next/script";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";
import Footer from "@/components/Footer";

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
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          {children}
          {modal}
          <Footer />
        </LanguageProvider>
        <Analytics />
        {/* GA4 via @next/third-parties: handles SPA navigation page_view
            events automatically and avoids the next/script hydration race
            that left dataLayer with only [["js"], ["config"]] entries. */}
        <GoogleAnalytics gaId="G-75TZ2JD6DS" />
        <Script
          id="google-adsense"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3985257665575958"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
