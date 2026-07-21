import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['[::1]'],
  experimental: {
    // The persistent Turbopack cache is corrupted on this workspace path and
    // prevents `next dev` from staying online. Disable it for reliable local
    // development; production builds keep their normal cache behavior.
    turbopackFileSystemCacheForDev: false,
  },
  // Pin the Turbopack workspace root to this project. Without this, Next 16
  // climbs up looking for a lockfile and finds the worktree-parent's, which
  // breaks the persistence cache ("Failed to open database").
  turbopack: {
    root: process.cwd(),
  },
  // The bulk dataset lives in private-data/ (not public/) so it is never
  // web-served — see src/lib/data/paths.ts. Next traces static fs reads
  // automatically, but the deep-bio routes build their paths dynamically
  // (`${id}.json`), which tracing cannot follow. Without these globs those
  // files are missing from the serverless bundle and every bio 404s IN
  // PRODUCTION ONLY — local dev reads straight from the working tree and
  // looks perfectly fine. Verify on a preview deploy, not just localhost.
  outputFileTracingIncludes: {
    '/api/deep-bio/[id]': ['./private-data/deep-bios/**', './private-data/deep-bios-v2/**'],
    '/api/saju-deep-summary': ['./private-data/deep-bios/**', './private-data/deep-bios-v2/**'],
    '/api/send-match-email': [
      './private-data/deep-bios-v2/**',
      './private-data/enriched-billionaires.json',
    ],
    '/api/people': ['./private-data/enriched-billionaires.json'],
    '/api/search': ['./private-data/enriched-billionaires.json'],
    '/profile/[id]': ['./private-data/enriched-billionaires.json'],
    '/sitemap.xml': ['./private-data/enriched-billionaires.json'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            // Third-party scripts we intentionally load:
            //   - Google Analytics (gtag) + Tag Manager
            //   - Google AdSense
            //   - Vercel Analytics (vitals.vercel-analytics.com)
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://va.vercel-scripts.com https://t1.kakaocdn.net https://developers.kakao.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' https: data:",
            "font-src 'self'",
            // GA + AdSense need beacon/XHR endpoints; OpenAI is our own API;
            // Kakao SDK fetches and posts to *.kakao.com / kakaocdn.
            "connect-src 'self' https://api.openai.com https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net https://pagead2.googlesyndication.com https://*.googlesyndication.com https://vitals.vercel-insights.com https://*.kakao.com https://*.kakaocdn.net",
            "frame-src https://googleads.g.doubleclick.net https://*.googlesyndication.com https://*.kakao.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ],
};

export default nextConfig;
