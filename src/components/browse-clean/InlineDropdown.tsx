'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface Option {
  value: string;
  label: string;
}

interface Props {
  /** Trigger label when nothing selected. */
  placeholder: string;
  /** Currently selected value (controls the trigger label + the highlighted row). */
  value: string;
  /** All selectable options. */
  options: Option[];
  /** Called with empty string to clear, or with new value. */
  onChange: (next: string) => void;
}

/**
 * Compact single-select dropdown for filter groups with many options.
 * Anchored popover, searchable list, single-select semantics matching
 * the chip strips on the same row.
 */
export default function InlineDropdown({ placeholder, value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang } = useLanguage();
  const isKo = lang === 'ko';

  const selected = options.find((o) => o.value === value) ?? null;

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Autofocus the search box when opening.
  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 px-2.5 h-7 text-[11.5px] font-medium rounded-full border whitespace-nowrap transition-colors ${
          selected
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 hover:text-gray-900'
        }`}
      >
        <span>{selected ? selected.label : placeholder}</span>
        {selected ? (
          <span
            role="button"
            aria-label={isKo ? '선택 해제' : 'Clear'}
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-white/70 hover:text-white pl-0.5"
          >
            ✕
          </span>
        ) : (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1.5 left-0 w-60 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
        >
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isKo ? '검색…' : 'Search…'}
              className="w-full h-7 px-2 text-[12px] bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-[12px] text-gray-400">
                {isKo ? '결과 없음' : 'No matches'}
              </li>
            ) : (
              filtered.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(opt.value);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-[12.5px] transition-colors ${
                        isActive
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
