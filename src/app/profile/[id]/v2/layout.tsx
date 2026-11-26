import type { Metadata } from 'next';

/**
 * Profile v2 is a layout preview of /profile/[id]. Keep it out of search
 * results; the parent layout's title, description and canonical (which
 * points at /profile/[id]) still apply.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfileV2Layout({ children }: { children: React.ReactNode }) {
  return children;
}
