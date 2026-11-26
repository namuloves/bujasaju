'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'bujasaju.matchInput';
const noopSubscribe = () => () => {};

function read(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

/** Whether this visitor has taken the quiz (their input is saved locally).
 *  False on the server and first paint, the real value on the client —
 *  read without an effect. */
export function useVisitorHasSaju(): boolean {
  return useSyncExternalStore(noopSubscribe, read, () => false);
}
