"use client";

import React from 'react';
import { createPortal } from 'react-dom';
import { useWidgetStore } from '@/store/useWidgetStore';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import { AppShortcutWidget } from '@/components/widgets/shortcut/AppShortcutWidget';

export const CustomDragGhost: React.FC = () => {
  const { widgets } = useWidgetStore();
  const activeDrag = useShortcutDragStore(state => state.activeDrag);

  if (!activeDrag) return null;
  if (typeof window === 'undefined') return null;

  const activeWidget = widgets.find(widget => widget.id === activeDrag.shortcutId);
  if (!activeWidget) return null;

  const displayRect = activeDrag.target?.rect ?? activeDrag.sourceRect;
  const ghostWidth = displayRect?.width ?? 80;
  const ghostHeight = displayRect?.height ?? 80;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 999999,
        willChange: 'transform',
        opacity: 0.92,
        width: `${ghostWidth}px`,
        height: `${ghostHeight}px`,
        transform: `translate(${activeDrag.pointer.x}px, ${activeDrag.pointer.y}px) translate(-50%, -50%)`,
        transition: 'width 0.12s ease, height 0.12s ease, opacity 0.12s ease',
      }}
    >
      <div style={{ width: '100%', height: '100%' }}>
        <AppShortcutWidget
          name={activeWidget.name || ''}
          url={activeWidget.url || ''}
          iconUrl={activeWidget.iconUrl}
          isSelfHosted={activeWidget.isSelfHosted}
          internalUrl={activeWidget.internalUrl}
          config={activeWidget.config}
          isEditing={false}
          onEdit={() => {}}
        />
      </div>
    </div>,
    document.body
  );
};
