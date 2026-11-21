import { useSyncExternalStore } from 'react';

// The clock never changes in a way React needs to hear about, so there is
// nothing to subscribe to.
const subscribe = () => () => {};

const getClientYear = () => new Date().getFullYear();

// Pages are prerendered at build time, so the server (and the hydration pass)
// must see a value that does not depend on when the page is viewed. The build
// year is injected through `env` in next.config.ts.
const getServerYear = () => Number(process.env.NEXT_PUBLIC_BUILD_YEAR);

/**
 * Current calendar year, safe to render in prerendered client components.
 * Hydrates with the build year, then re-renders with the real year if the two
 * differ (e.g. a page built in December and viewed in January) — without a
 * hydration mismatch.
 */
export function useCurrentYear(): number {
  return useSyncExternalStore(subscribe, getClientYear, getServerYear);
}
