import type { MetadataRoute } from 'next';

/**
 * robots.txt policy.
 *
 * Goal: stay fully indexed by real search engines while shutting out AI
 * training crawlers and dataset scrapers. The enriched billionaire dataset
 * (3,000+ profiles with saju analysis) is the product — we don't want it
 * harvested wholesale into someone else's training corpus.
 *
 * Rules are evaluated by user-agent, and crawlers obey the MOST SPECIFIC
 * matching group — not the `*` group — so the named Disallow entries below
 * win over the general Allow for those bots.
 *
 * IMPORTANT: robots.txt is advisory only. Well-behaved crawlers (Google,
 * Bing, OpenAI, Anthropic) honour it; malicious scrapers ignore it entirely
 * and would need server-side blocking to stop.
 *
 * Deliberately still allowed:
 *   - Googlebot / Bingbot / NaverBot / Daum — organic search traffic.
 *   - Applebot — powers Siri/Spotlight results.
 * Note Applebot-Extended (AI training) is blocked separately below, which
 * is how Apple lets you keep search while opting out of training.
 */

/**
 * AI training crawlers and dataset harvesters.
 *
 * Several vendors run two agents: one for user-facing search citations and
 * one for model training. Where that split exists we block the training arm
 * and leave the search arm alone, so we can still be cited and linked.
 */
const AI_AND_SCRAPER_BOTS = [
  // OpenAI. GPTBot trains models; OAI-SearchBot (left allowed) powers
  // ChatGPT search citations.
  'GPTBot',
  'ChatGPT-User',
  // Anthropic.
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  // Google's AI-training opt-out. Does NOT affect Googlebot or search rank.
  'Google-Extended',
  // Common Crawl — the dataset most LLM corpora are built from.
  'CCBot',
  // Apple's AI-training arm. Plain Applebot (Siri/Spotlight) stays allowed.
  'Applebot-Extended',
  // Meta.
  'FacebookBot',
  'meta-externalagent',
  // ByteDance/TikTok — aggressive, high-volume crawler.
  'Bytespider',
  // Perplexity.
  'PerplexityBot',
  // Other AI/LLM crawlers.
  'Amazonbot',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
  'Omgilibot',
  'Timpibot',
  'YouBot',
  // SEO backlink crawlers — heavy traffic, no benefit to us.
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
  'BLEXBot',
  'PetalBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Default: everything else may crawl the site, minus internal routes.
      // API routes have no SEO value and some make outbound calls
      // (/api/wiki-image proxies Wikimedia), so crawling them burns our
      // function invocations and our upstream reputation for nothing.
      //
      // Two exceptions: the read-only data routes the profile page loads
      // its content from (/api/people, /api/people/bios, /api/deep-bio/*).
      // A crawler that renders JS (Googlebot, and Naver's Yeti per
      // https://searchadvisor.naver.com/guide/seo-advanced-javascript) must
      // be able to fetch them, or the rendered profile has no bio in it.
      // Naver's guide names exactly this case, a page allowed but the
      // resources it needs disallowed, as a reason for incomplete indexing
      // (https://searchadvisor.naver.com/guide/resource-and-link). This
      // gives scrapers nothing: they ignore robots.txt anyway, and the
      // routes keep their own rate limits. The longer Allow path beats the
      // shorter Disallow, and the AI group below still gets nothing.
      {
        userAgent: '*',
        allow: ['/', '/api/people', '/api/deep-bio/'],
        disallow: ['/api/', '/dev/'],
      },
      // AI trainers and scrapers: nothing at all.
      {
        userAgent: AI_AND_SCRAPER_BOTS,
        disallow: '/',
      },
    ],
    sitemap: 'https://bujasaju.com/sitemap.xml',
  };
}
