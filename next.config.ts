import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the Turbopack workspace root to this project. Without this, Next 16
  // climbs up looking for a lockfile and finds the worktree-parent's, which
  // breaks the persistence cache ("Failed to open database").
  turbopack: {
    root: process.cwd(),
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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://va.vercel-scripts.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' https: data:",
            "font-src 'self'",
            // GA + AdSense need beacon/XHR endpoints; OpenAI is our own API.
            "connect-src 'self' https://api.openai.com https://www.google-analytics.com https://*.google-analytics.com https://stats.g.doubleclick.net https://pagead2.googlesyndication.com https://*.googlesyndication.com https://vitals.vercel-insights.com",
            "frame-src https://googleads.g.doubleclick.net https://*.googlesyndication.com",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    },
  ],
};

export default nextConfig;
