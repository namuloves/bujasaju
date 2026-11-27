import type { Metadata } from 'next';
import HomeClient from '@/components/home/HomeClient';

/**
 * The home page is a client component (components/home/HomeClient.tsx), and
 * a client page can't export metadata, so this thin server page does.
 *
 * The canonical matters because the tab and browse filters live in the
 * query string: `/?tab=browse`, and `/?tab=browse&ilju=…` /
 * `&industry=…` from every profile's "더 보기" links. All of them serve the
 * same HTML (the server can't see the query string of this static page), so
 * without a canonical each one looks like a duplicate home page to a
 * crawler. Naver: https://searchadvisor.naver.com/guide/markup-structure
 */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Page() {
  return <HomeClient />;
}
