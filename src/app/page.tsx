'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import TabBar, { TabKey } from '@/components/TabBar';
import MatchTab from '@/components/match/MatchTab';
import { loadEnrichedPeople } from '@/lib/data/enriched';

// BrowseTab pulls in the full 3,300-person dataset + saju calc. Lazy-load it
// so the default Match tab stays tiny.
const BrowseTab = dynamic(
  () =>
    import('@/components/BrowseTab').catch((err: unknown) => {
      if (
        err instanceof Error &&
        err.name === 'ChunkLoadError' &&
        typeof window !== 'undefined'
      ) {
        window.location.reload();
      }
      throw err;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
    ),
  },
);

function getInitialTab(): TabKey {
  if (typeof window === 'undefined') return 'match';
  const params = new URLSearchParams(window.location.search);
  const t = params.get('tab');
  return t === 'browse' ? 'browse' : 'match';
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>('match');

  // Hydrate from URL on mount
  useEffect(() => {
    setTab(getInitialTab());
    // Pre-warm the 2MB billionaire payload the instant the shell mounts so
    // it's downloading in parallel with the user reading/filling in the
    // Match form. By the time they hit "결과 보기" the data is ready.
    void loadEnrichedPeople();
  }, []);

  // Sync URL with tab
  const handleChangeTab = (next: TabKey) => {
    setTab(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <TabBar activeTab={tab} onChange={handleChangeTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'match' ? <MatchTab /> : <BrowseTab />}
      </main>
    </div>
  );
}
