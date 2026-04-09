'use client';

import { useLanguage } from '@/lib/i18n';

export type TabKey = 'match' | 'browse';

interface Props {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

export default function TabBar({ activeTab, onChange }: Props) {
  const { t } = useLanguage();

  const Tab = ({ value, label }: { value: TabKey; label: string }) => {
    const isActive = activeTab === value;
    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        aria-pressed={isActive}
        className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
          isActive
            ? 'text-indigo-600'
            : 'text-gray-500 hover:text-gray-800'
        }`}
      >
        {label}
        {isActive && (
          <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600" />
        )}
      </button>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-2" role="tablist">
        <Tab value="match" label={t.tabMatch} />
        <Tab value="browse" label={t.tabBrowse} />
      </div>
    </div>
  );
}
