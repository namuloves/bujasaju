'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import CleanNav, { CleanTab } from '@/components/browse-clean/CleanNav';
import { loadEnrichedPeople } from '@/lib/data/enriched';

// Match tab carries the legacy MatchTab (unchanged).
const MatchTab = dynamic(() => import('@/components/match/MatchTab'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
  ),
});

// Browse tab is the redesigned CleanBrowseView. It receives the nav as a
// render-prop so the inline search lives inside the header.
const CleanBrowseView = dynamic(
  () =>
    import('@/components/browse-clean/CleanBrowseView').catch((err: unknown) => {
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

function getInitialTab(): CleanTab {
  if (typeof window === 'undefined') return 'match';
  const params = new URLSearchParams(window.location.search);
  return params.get('tab') === 'browse' ? 'browse' : 'match';
}

export default function Home() {
  const [tab, setTab] = useState<CleanTab>('match');

  useEffect(() => {
    setTab(getInitialTab());
    // Pre-warm the 2MB billionaire payload so it's already loaded by the
    // time the user switches to Browse or hits "결과 보기" on Match.
    void loadEnrichedPeople();
  }, []);

  const handleChangeTab = (next: CleanTab) => {
    setTab(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState({}, '', url.toString());
  };

  if (tab === 'browse') {
    // CleanBrowseView owns its own <main> and renders the nav with the
    // inline search field via this render-prop.
    return (
      <div className="min-h-screen bg-white">
        <CleanBrowseView
          nav={(search, onSearchChange) => (
            <CleanNav
              activeTab={tab}
              onChange={handleChangeTab}
              search={search}
              onSearchChange={onSearchChange}
            />
          )}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <CleanNav activeTab={tab} onChange={handleChangeTab} />
      <main className="max-w-6xl mx-auto px-6 pt-6 pb-24">
        <MatchTab />
      </main>
    </div>
  );
}
