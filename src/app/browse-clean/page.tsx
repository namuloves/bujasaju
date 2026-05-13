'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import CleanNav, { CleanTab } from '@/components/browse-clean/CleanNav';

const CleanBrowseView = dynamic(
  () => import('@/components/browse-clean/CleanBrowseView'),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
    ),
  },
);

const MatchTab = dynamic(() => import('@/components/match/MatchTab'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-16 text-sm text-gray-400">불러오는 중…</div>
  ),
});

export default function BrowseCleanPreview() {
  const [tab, setTab] = useState<CleanTab>('browse');

  return (
    <div className="min-h-screen bg-white">
      {tab === 'browse' ? (
        // CleanBrowseView renders its own nav so the inline search can live
        // inside the header alongside the tabs.
        <CleanBrowseView nav={(search, onSearchChange) => (
          <CleanNav
            activeTab={tab}
            onChange={setTab}
            search={search}
            onSearchChange={onSearchChange}
          />
        )} />
      ) : (
        <>
          <CleanNav activeTab={tab} onChange={setTab} />
          <main className="max-w-6xl mx-auto px-6 pt-8 pb-24">
            <MatchTab />
          </main>
        </>
      )}
    </div>
  );
}
