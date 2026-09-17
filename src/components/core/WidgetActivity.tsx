'use client';

import { Activity, type ReactNode } from 'react';
import { useDocumentVisible } from '@/hooks/useDocumentVisible';

// Keep widget state and grid geometry while disconnecting effects, timers and
// subscriptions outside the page buffer and in hidden browser tabs.
export function WidgetActivity({ active, children }: { active: boolean; children: ReactNode }) {
  const visible = useDocumentVisible();
  return <Activity mode={active && visible ? 'visible' : 'hidden'}>{children}</Activity>;
}
