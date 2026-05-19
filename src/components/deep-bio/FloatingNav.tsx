'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

/**
 * Walk up the DOM until we find the nearest scrollable ancestor. We treat
 * "scrollable" as a vertical scroller (overflow-y is auto/scroll AND the
 * element actually has more content than fits). Falls back to document
 * scrolling element when nothing in the tree owns the scroll.
 */
function findScrollableAncestor(start: Element): HTMLElement | null {
  let node: Element | null = start.parentElement;
  while (node) {
    if (node instanceof HTMLElement) {
      const style = window.getComputedStyle(node);
      const oy = style.overflowY;
      const canScroll = (oy === 'auto' || oy === 'scroll' || oy === 'overlay');
      if (canScroll && node.scrollHeight > node.clientHeight + 1) {
        return node;
      }
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * FloatingNav — vertical pill on the right edge of the deep-bio scroll
 * container that always shows section labels and jumps to anchors on click.
 *
 * Active section is driven by IntersectionObserver: whichever section
 * intersects the most with the viewport "wins" the active state. We watch
 * intersection ratios rather than thresholds so the active state updates
 * smoothly as the user scrolls between sections of varying height.
 *
 * The scroll container is passed in via `scrollRoot` so this works inside
 * both the mobile bottom-sheet (its own scroll) and the desktop modal
 * (likewise). Falls back to window scroll when no root is provided.
 */

export interface FloatingNavItem {
  /** DOM id of the section to jump to */
  id: string;
  /** Visible label inside the pill */
  label: string;
}

interface Props {
  items: FloatingNavItem[];
  /** The scrollable element that contains the sections. Defaults to window. */
  scrollRoot?: HTMLElement | null;
  /** Pixel offset from top when jumping — covers sticky headers. */
  scrollOffset?: number;
  className?: string;
  style?: CSSProperties;
}

export default function FloatingNav({ items, scrollRoot, scrollOffset = 80, className, style }: Props) {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');
  // Resolved scroll container — either the prop, or auto-detected after
  // mount by walking up from the nav element. We keep this in state so
  // the IO effect re-runs once we know the real container.
  const [resolvedRoot, setResolvedRoot] = useState<HTMLElement | null>(scrollRoot ?? null);

  useEffect(() => {
    if (scrollRoot) {
      setResolvedRoot(scrollRoot);
      return;
    }
    // Look up from the nav element. The first scrollable ancestor that has
    // actual overflowing content is our scroll root. If nothing matches,
    // fall back to null which the rest of the code treats as window.
    if (navRef.current) {
      setResolvedRoot(findScrollableAncestor(navRef.current));
    }
  }, [scrollRoot]);

  // Ratios indexed by id — we pick the highest each tick.
  const ratiosRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined' || items.length === 0) return;

    // The IntersectionObserver `root` must be the scroll container so the
    // intersection ratios are computed against the visible part of THAT
    // container, not the browser viewport (which is mostly hidden behind
    // the modal).
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratiosRef.current.set(e.target.id, e.intersectionRatio);
        }
        // Pick the id with the largest current ratio. If nothing is
        // visible at all (e.g. between sections during a fast scroll),
        // keep the previous active.
        let bestId = '';
        let bestRatio = 0;
        for (const [id, r] of ratiosRef.current) {
          if (r > bestRatio) {
            bestRatio = r;
            bestId = id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      {
        root: resolvedRoot ?? null,
        // Crop the top to avoid the sticky header marking a section "active"
        // while it's still hidden under the header.
        rootMargin: `-${scrollOffset}px 0px -40% 0px`,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items, resolvedRoot, scrollOffset]);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    // Manual scroll inside the container so we can apply our own offset
    // (scrollIntoView ignores the sticky header height).
    const root = resolvedRoot;
    const targetTop = root
      ? el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - scrollOffset
      : el.getBoundingClientRect().top + window.scrollY - scrollOffset;
    const scrollFn = (behavior: ScrollBehavior) => {
      if (root) root.scrollTo({ top: targetTop, behavior });
      else window.scrollTo({ top: targetTop, behavior });
    };

    const beforeY = root ? root.scrollTop : window.scrollY;
    scrollFn('smooth');
    // Some browsers / headless environments silently ignore smooth scroll.
    // If we haven't moved at all after ~250ms, force an instant jump so
    // the click always does *something* visible.
    window.setTimeout(() => {
      const nowY = root ? root.scrollTop : window.scrollY;
      if (Math.abs(nowY - beforeY) < 4 && Math.abs(nowY - targetTop) > 4) {
        scrollFn('instant' as ScrollBehavior);
      }
    }, 250);

    setActiveId(id);
  }

  if (items.length <= 1) return null;

  return (
    <nav
      ref={navRef}
      aria-label="섹션 네비게이션"
      className={
        'pointer-events-auto select-none flex flex-col gap-1 rounded-full border border-gray-200 bg-white/90 px-1.5 py-2 shadow-lg backdrop-blur-md ' +
        (className ?? '')
      }
      style={style}
    >
      {items.map((it) => {
        const active = it.id === activeId;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => jumpTo(it.id)}
            className={
              'flex items-center gap-1.5 rounded-full whitespace-nowrap text-[11px] font-semibold transition-colors px-2.5 py-1.5 ' +
              (active
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900')
            }
            aria-current={active ? 'true' : undefined}
          >
            <span
              className={
                'inline-block h-1.5 w-1.5 rounded-full transition-colors ' +
                (active ? 'bg-white' : 'bg-gray-300')
              }
            />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
