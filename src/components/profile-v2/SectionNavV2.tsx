'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Profile v2 — section "elevator" in the left margin (desktop, xl and up).
 *
 * Lists only the sections that actually rendered for this person, marks the
 * one being read, and jumps to a section on click. Window scroll only; the
 * targets carry `scroll-mt-20` so they land below the sticky top bar.
 */

export interface SectionNavItem {
  id: string;
  label: string;
}

interface Props {
  items: SectionNavItem[];
  lang: string;
  /** Re-scan which sections exist when these change (e.g. bio loaded). */
  rescanKey?: unknown;
}

/** A section counts as "being read" once its top passes this line. */
const ACTIVE_LINE_PX = 140;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function SectionNavV2({ items, lang, rescanKey }: Props) {
  const [present, setPresent] = useState<SectionNavItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Which sections exist and have content. Sections load at different
  // times (bio fetch, 대운 calc), so scan now and again shortly after.
  useEffect(() => {
    const scan = () => {
      setPresent(items.filter((it) => {
        const el = document.getElementById(it.id);
        return !!el && el.offsetHeight > 0;
      }));
    };
    scan();
    const t1 = window.setTimeout(scan, 600);
    const t2 = window.setTimeout(scan, 2000);
    window.addEventListener('resize', scan);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('resize', scan);
    };
  }, [items, rescanKey]);

  // Track the section being read.
  useEffect(() => {
    if (present.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActiveId(present[present.length - 1].id);
        return;
      }
      let current = present[0].id;
      for (const it of present) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top - ACTIVE_LINE_PX <= 0) current = it.id;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [present]);

  const jump = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const toTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  if (present.length < 2) return null;

  return (
    <nav aria-label={lang === 'ko' ? '페이지 내 이동' : 'On this page'} className="sticky top-24">
      <p className="text-xs text-gray-500 mb-3 pl-3">{lang === 'ko' ? '바로가기' : 'On this page'}</p>
      <ul className="border-l border-gray-200">
        {present.map((it) => {
          const active = it.id === activeId;
          return (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => jump(it.id)}
                aria-current={active ? 'true' : undefined}
                className={`-ml-px block w-full text-left pl-3 pr-2 py-1.5 border-l text-[13px] leading-snug transition-colors ${
                  active
                    ? 'border-gray-900 text-gray-900 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-400'
                }`}
              >
                {it.label}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={toTop}
        className="mt-3 ml-1 h-8 px-2 rounded-lg text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        {lang === 'ko' ? '↑ 맨 위로' : '↑ Back to top'}
      </button>
    </nav>
  );
}
