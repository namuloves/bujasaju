'use client';

import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

/**
 * Developer overlays, loaded on demand so none of their code or CSS is in
 * the bundle regular visitors download.
 *
 *   - ColorPicker: only when the URL has ?dev=colors (any environment).
 *   - css-spec DesignSpecOverlay (toggle with ⌥D): development builds only.
 */
const ColorPicker = dynamic(() => import('./ColorPicker'), { ssr: false });

const DesignSpecOverlay =
  process.env.NODE_ENV !== 'production'
    ? dynamic(() => import('./DesignSpecDev'), { ssr: false })
    : null;

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => window.removeEventListener('popstate', onChange);
}

function hasColorFlag() {
  return new URLSearchParams(window.location.search).get('dev') === 'colors';
}

export default function DevTools() {
  const colorsEnabled = useSyncExternalStore(subscribe, hasColorFlag, () => false);

  return (
    <>
      {colorsEnabled && <ColorPicker />}
      {DesignSpecOverlay && <DesignSpecOverlay />}
    </>
  );
}
