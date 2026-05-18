'use client';

/**
 * Intercepted /profile/[id] — renders the profile inside an overlay
 * (bottom sheet on mobile, centered modal on desktop) when navigated to
 * from within the app. Hard refresh / direct URL still hits the standalone
 * page at `src/app/profile/[id]/page.tsx`.
 */

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProfilePage from '@/app/profile/[id]/page';

export default function InterceptedProfileModal() {
  const router = useRouter();

  const close = useCallback(() => {
    // router.back() lines the modal close up with the browser's natural
    // back button — same UX whether the user taps the overlay X or the
    // hardware/keyboard back gesture.
    router.back();
  }, [router]);

  // ESC closes the modal. Pointer / outside-click is handled by the backdrop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Lock body scroll while open so the underlying results page doesn't
  // scroll behind the sheet. Restore on unmount.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="닫기"
        onClick={close}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Sheet / modal panel */}
      <div
        className="
          profile-modal-panel
          relative w-full sm:max-w-3xl
          max-h-[92vh] sm:max-h-[88vh]
          bg-white
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl
          overflow-hidden
          flex flex-col
        "
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <span className="block w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Close button — absolute top-right */}
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-9 h-9 inline-flex items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Scrollable body — reuses the regular profile page. The
            embedded ProfilePage carries its own sticky "돌아가기" bar
            and min-h-screen wrapper that are redundant inside the
            modal; the `profile-in-modal` class on this container hides
            them via globals.css. */}
        <div className="overflow-y-auto overscroll-contain flex-1 profile-in-modal">
          <ProfilePage />
        </div>
      </div>

    </div>
  );
}
