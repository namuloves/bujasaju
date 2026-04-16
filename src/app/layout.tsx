import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { LanguageProvider } from "@/lib/i18n";

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LanguageProvider>{children}</LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
