'use client';

import { useLanguage, Lang } from '@/lib/i18n';

export default function Header() {
  const { lang, setLang, t } = useLanguage();

  const LangButton = ({ value, label }: { value: Lang; label: string }) => (
    <button
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      className={`px-2.5 py-1 text-xs font-medium transition-colors ${
        lang === value
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900">
              <a href="/" className="hover:text-indigo-700 transition-colors">
                부자사주 <span className="text-indigo-600">富者四柱</span>
              </a>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {t.siteTagline}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {t.siteSubTagline}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div
              role="group"
              aria-label={t.languageLabel}
              className="inline-flex rounded-md border border-gray-200 overflow-hidden"
            >
              <LangButton value="ko" label="KO" />
              <LangButton value="en" label="EN" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
