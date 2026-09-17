'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};

export const useDocumentVisible = () => useSyncExternalStore(
  subscribe, () => !document.hidden, () => true,
);
