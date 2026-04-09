'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import TabBar, { TabKey } from '@/components/TabBar';
import MatchTab from '@/components/match/MatchTab';
import BrowseTab from '@/components/BrowseTab';

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
