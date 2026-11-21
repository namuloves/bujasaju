import { useSyncExternalStore } from 'react';
import type { CleanTab } from '@/components/browse-clean/CleanNav';

// The active tab lives in the `?tab=` query param. `history.replaceState`
// does not emit an event, so tab changes made by `setUrlTab` notify
// subscribers themselves; back/forward navigation arrives via `popstate`.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener('popstate', onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener('popstate', onChange);
  };
}

function getSnapshot(): CleanTab {
  return new URLSearchParams(window.location.search).get('tab') === 'browse'
    ? 'browse'
    : 'match';
}

// The server cannot see the query string of a static page, so the match tab
// is what gets prerendered. A `?tab=browse` landing switches after hydration.
function getServerSnapshot(): CleanTab {
  return 'match';
}

export function useUrlTab(): CleanTab {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setUrlTab(next: CleanTab) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', next);
  window.history.replaceState({}, '', url.toString());
  listeners.forEach((notify) => notify());
}
