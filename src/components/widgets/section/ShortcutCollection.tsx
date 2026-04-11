import React from 'react';
import { Widget } from '@/types/widget';
import { AppShortcutWidget } from '@/components/widgets/shortcut/AppShortcutWidget';
import { ShortcutDragShell } from '@/components/widgets/shortcut/ShortcutDragShell';
import { useSectionDrag } from '@/hooks/useSectionDrag';
import styles from './SectionWidget.module.css';

interface ShortcutCollectionProps {
  sectionId: string;
  pageId?: string;
  shortcuts: Widget[];
  visibleShortcuts?: Widget[];
  isEditing?: boolean;
  dashboardHandoff?: 'immediate' | 'disabled';
  gridClassName?: string;
  slotClassName?: string;
  shortcutWidgetClassName?: string;
  emptyState?: React.ReactNode;
}

export const ShortcutCollection: React.FC<ShortcutCollectionProps> = ({
  sectionId,
  pageId,
  shortcuts,
  visibleShortcuts = shortcuts,
  isEditing,
  dashboardHandoff = 'disabled',
  gridClassName = styles.shortcutGrid,
  slotClassName = styles.shortcutSlot,
  shortcutWidgetClassName,
  emptyState,
}) => {
  const gridRef = React.useRef<HTMLDivElement>(null);

  const {
    placeholderIndex,
    placeholderAbsoluteIndex,
    draggedShortcutId,
  } = useSectionDrag({
    sectionId,
    pageId,
    dashboardHandoff,
    isEditing: !!isEditing,
    gridRef,
    shortcuts,
    pageShortcuts: visibleShortcuts === shortcuts ? undefined : visibleShortcuts,
  });

  const isEmpty = visibleShortcuts.length === 0 && placeholderIndex === null;

  return (
    <div
      ref={gridRef}
      className={gridClassName}
      data-shortcut-dropzone="section-grid"
      data-section-id={sectionId}
      data-placeholder-index={placeholderAbsoluteIndex ?? undefined}
    >
      {isEmpty && emptyState ? (
        <div className={styles.emptyState}>{emptyState}</div>
      ) : (
        <>
          {visibleShortcuts.map((shortcut, index) => (
            <React.Fragment key={`sec-${shortcut.id}`}>
              {placeholderIndex === index && (
                <div className={styles.shortcutPlaceholder} data-placeholder />
              )}
              <ShortcutDragShell
                shortcut={shortcut}
                source={{ type: 'section', sectionId }}
                isEditing={isEditing}
                isDragged={draggedShortcutId === shortcut.id}
                className={slotClassName}
              >
                <div data-shortcut-id={shortcut.id} style={{ height: '100%' }}>
                  <AppShortcutWidget
                    name={shortcut.name || ''}
                    url={shortcut.url || ''}
                    iconUrl={shortcut.iconUrl}
                    className={shortcutWidgetClassName}
                    isSelfHosted={shortcut.isSelfHosted}
                    internalUrl={shortcut.internalUrl}
                    config={shortcut.config}
                    isEditing={isEditing}
                    onEdit={() => {
                      window.dispatchEvent(new CustomEvent('widget-edit', {
                        detail: { widget: shortcut, widgetId: shortcut.id },
                      }));
                    }}
                  />
                </div>
              </ShortcutDragShell>
            </React.Fragment>
          ))}
          {placeholderIndex === visibleShortcuts.length && (
            <div className={styles.shortcutPlaceholder} data-placeholder />
          )}
        </>
      )}
    </div>
  );
};
