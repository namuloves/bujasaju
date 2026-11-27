import { BlockList, isIPv4, isIPv6 } from 'node:net';
import snapshot from './search-crawler-ips.json';

/**
 * Is this request coming from a search engine's crawler?
 *
 * Used to exempt Naver, Google and Bing crawlers from the per-IP rate limits
 * (proxy.ts Layer 2 and /api/deep-bio). Those limits are 60 req/min per IP.
 * Naver's Yeti crawls from a few hundred addresses (36 published prefixes),
 * so walking our 3,000+ sitemap URLs can easily push one IP past 60/min.
 * A crawler that gets a 4xx back (plus our `X-Robots-Tag: noindex`) can
 * drop the page from the index.
 *
 * WHY THE IP, NOT THE USER-AGENT: anyone can send "Yeti" or "Googlebot" as
 * their UA, so a UA check would hand every scraper a way around the limit.
 * Each engine publishes the IP ranges its crawlers use for exactly this
 * check, and on Vercel the client IP cannot be faked: Vercel overwrites
 * X-Forwarded-For with the real address
 * (https://vercel.com/docs/headers/request-headers#x-forwarded-for).
 * The IP alone is also the safer key for Naver: its guide says Yeti only
 * *sometimes* adds "Yeti" to the UA when it fetches JS and other resources
 * for rendering (https://searchadvisor.naver.com/guide/seo-advanced-javascript).
 *
 * The lists live in search-crawler-ips.json, a snapshot refreshed with
 * `npx tsx scripts/update-search-crawler-ips.ts`. Lists can change without
 * notice. If a crawler IP is missing from the snapshot, that crawler is
 * simply rate-limited like everyone else, which is how it was before.
 *
 * Not covered: Daum publishes no IP list.
 */

function buildBlockList(): BlockList {
  const list = new BlockList();
  for (const engine of Object.values(snapshot.engines)) {
    for (const cidr of engine.ipv4) {
      const [addr, bits] = cidr.split('/');
      list.addSubnet(addr, Number(bits), 'ipv4');
    }
    for (const cidr of engine.ipv6) {
      const [addr, bits] = cidr.split('/');
      list.addSubnet(addr, Number(bits), 'ipv6');
    }
  }
  return list;
}

let crawlerNets: BlockList | null = null;

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

export function isSearchCrawlerIp(ip: string | null | undefined): boolean {
  if (!ip) return false;
  crawlerNets ??= buildBlockList();
  const addr = IPV4_MAPPED.exec(ip)?.[1] ?? ip;
  if (isIPv4(addr)) return crawlerNets.check(addr, 'ipv4');
  if (isIPv6(addr)) return crawlerNets.check(addr, 'ipv6');
  return false;
}
