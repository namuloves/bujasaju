'use client';

/**
 * Profile overlay — the profile most visitors actually see. Opened from the
 * browse cards and match results by local state, and by the intercepted
 * /profile/[id] route (app/@modal) for in-app links.
 *
 * Shell: bottom sheet below 1024px (drag down to dismiss), centered panel
 * above. Closes on the X, ESC, backdrop click or drag; locks body scroll;
 * keeps focus inside while open and returns it to the opener on close.
 *
 * Content: the profile v2 layout (ProfileTopBarV2 + ProfileBodyV2), the
 * same components as /profile/[id]/v2. The desktop panel is as wide as the
 * v2 page column (max-w-4xl) so it lays out exactly like the page. No
 * section nav here: the page shows it only in the xl left margin, which a
 * panel doesn't have, and the overlay is the quick read — "전체 페이지"
 * opens the page that has it.
 */

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '@/lib/i18n';
import type { EnrichedPerson, SajuResult } from '@/lib/saju/types';
import type { DeepBio } from '@/lib/deepBio';
import { fetchDeepBio } from '@/lib/deepBio';
import ProfileTopBarV2 from '../profile-v2/ProfileTopBarV2';
import ProfileBodyV2 from '../profile-v2/ProfileBodyV2';

/** "전체 페이지" target. Points at the v2 page while v2 is in preview so
 *  the overlay and the page it opens look the same; change back to
 *  `/profile/${id}` when v2 replaces v1 there. */
const fullPageHref = (id: string) => `/profile/${id}/v2`;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  person: EnrichedPerson;
  onClose: () => void;
  /** Match flow passes the visitor's chart. Not used by the v2 content:
   *  quiz-takers get CompareWithUser, which reads the same saved input. */
  userSaju?: SajuResult;
}

const DESKTOP_QUERY = '(min-width: 1024px)';

function subscribeDesktop(onChange: () => void) {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** Read on the first render (the overlay only ever renders on the client),
 *  so desktop never flashes the bottom sheet first. */
function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

/** Responsive profile overlay: bottom sheet on mobile, centered modal on desktop. */
export default function DeepBioModal({ person, onClose }: Props) {
  const { lang } = useLanguage();
  const isDesktop = useIsDesktop();
  const [bio, setBio] = useState<DeepBio | null>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStartY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchDeepBio(person.id).then(data => {
      if (cancelled) return;
      setBio(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [person.id]);

  // Animate in
  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // ESC closes; Tab stays inside the panel. Ref so the listener is added
  // once but always calls the current close handler.
  const closeRef = useRef(handleClose);
  useEffect(() => {
    closeRef.current = handleClose;
  }, [handleClose]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Focus: back to whatever opened the overlay on close…
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    return () => {
      if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, []);
  // …and into the scroll area on open, so arrow keys and space scroll the
  // profile. Again when the panel swaps between sheet and centered modal.
  useEffect(() => {
    scrollRef.current?.focus({ preventScroll: true });
  }, [isDesktop]);

  // Prevent body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  }, [handleClose]);

  // Drag-to-dismiss (mobile only)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const scrollEl = scrollRef.current;
    if (scrollEl && scrollEl.scrollTop > 0) return;
    dragStartY.current = e.touches[0].clientY;
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }, [dragging]);

  const handleTouchEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragY > 120) {
      handleClose();
    } else {
      setDragY(0);
    }
  }, [dragging, dragY, handleClose]);

  const displayName = lang === 'ko' ? (person.nameKo || person.name) : person.name;
  const dialogLabel = lang === 'ko' ? `${displayName} 프로필` : `${displayName} profile`;

  const header = (
    <ProfileTopBarV2
      person={person}
      displayName={displayName}
      lang={lang}
      overlay={{ onClose: handleClose, fullPageHref: fullPageHref(person.id) }}
    />
  );

  // Same column, padding and background as the v2 page. Tabbable, so the
  // keyboard can always get back to scrolling the profile (and the focus
  // trap has a last stop even when the profile has no links).
  const body = (
    <div
      ref={scrollRef}
      tabIndex={0}
      className="flex-1 overflow-y-auto overscroll-contain bg-gray-50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-12">
        <ProfileBodyV2
          person={person}
          bio={bio}
          bioLoading={loading}
          displayName={displayName}
          lang={lang}
          anchors={false}
        />
      </div>
    </div>
  );

  return createPortal(
    <div
      className={`profile-v2 fixed inset-0 z-50 transition-colors duration-300 ${visible ? 'bg-black/40' : 'bg-transparent'} ${
        isDesktop ? 'flex items-center justify-center p-6' : ''
      }`}
      onClick={handleBackdropClick}
    >
      {isDesktop ? (
        /* ---- Desktop: centered panel, as wide as the v2 page column ---- */
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          className={`bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ease-out w-full max-w-4xl h-[92vh] max-h-[92vh] ${
            visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {header}
          {body}
        </div>
      ) : (
        /* ---- Mobile: bottom sheet ---- */
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col overflow-hidden h-[98dvh] max-h-[98dvh] ${
            !dragging ? 'transition-transform duration-300 ease-out' : ''
          }`}
          style={{
            transform: visible ? `translateY(${dragY}px)` : 'translateY(100%)',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {header}
          {body}
        </div>
      )}
    </div>,
    document.body,
  );
}
