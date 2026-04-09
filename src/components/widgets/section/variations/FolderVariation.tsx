import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Widget } from '@/types/widget';
import { Modal, ModalContent, ModalHeader, ModalBody } from '@/components/primitives/modal';
import { ChevronLeft, ChevronRight, FolderOpen } from 'lucide-react';
import { useWidgetStore } from '@/store/useWidgetStore';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';
import { useGridStackShortcutDrag } from '@/hooks/useGridStackShortcutDrag';
import { useGridStackContext } from '@/gridstack-react/grid-stack-context';
import {
  resolveDashboardShortcutGridTarget,
} from '@/utils/shortcutGridStackHandoff';
import { getDashboardCellRect } from '@/utils/dragUtils';
import { ShortcutCollection } from '../ShortcutCollection';
import styles from '../SectionWidget.module.css';

interface FolderVariationProps {
  title: string;
  shortcuts: Widget[];
  isEditing?: boolean;
  sectionId?: string;
  pageId?: string;
}

const ITEMS_PER_PAGE = 12;
const MAX_PAGES = 4;
const PREVIEW_COUNT = 4;

const PreviewIcon: React.FC<{ shortcut: Widget }> = ({ shortcut }) => {
  const [imgError, setImgError] = useState(false);
  const [cdnError, setCdnError] = useState(false);

  const name = shortcut.name || '';

  if (shortcut.iconUrl && !imgError) {
    return (
      <img
        src={shortcut.iconUrl}
        alt={name}
        className={styles.folderPreviewIcon}
        onError={() => setImgError(true)}
        draggable={false}
      />
    );
  }

  const cdnUrl = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${name.toLowerCase().replace(/\s+/g, '-')}.png`;

  if (!cdnError) {
    return (
      <img
        src={cdnUrl}
        alt={name}
        className={styles.folderPreviewIcon}
        onError={() => setCdnError(true)}
        draggable={false}
      />
    );
  }

  return (
    <div className={styles.folderPreviewFallback}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

export const FolderVariation: React.FC<FolderVariationProps> = ({
  title,
  shortcuts,
  isEditing,
  sectionId,
  pageId,
}) => {
  const { gridStack } = useGridStackContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  const modalContentRef = useRef<HTMLDivElement>(null);
  const folderContainerRef = useRef<HTMLDivElement>(null);
  const widgets = useWidgetStore(state => state.widgets);
  const dragPointer = useShortcutDragStore(state => state.activeDrag?.pointer ?? null);
  const draggedShortcutId = useShortcutDragStore(state => state.activeDrag?.shortcutId ?? null);
  const dragSourceRect = useShortcutDragStore(state => state.activeDrag?.sourceRect ?? null);
  const gridStackDrag = useGridStackShortcutDrag();
  const setDragTarget = useShortcutDragStore(state => state.setTarget);
  const activePointer = dragPointer ?? gridStackDrag.pointer;
  const activeShortcutId = draggedShortcutId ?? gridStackDrag.shortcutId;
  const isHandingOffRef = useRef(false);

  const previewShortcuts = shortcuts.slice(-PREVIEW_COUNT);
  const totalPages = Math.min(Math.ceil(shortcuts.length / ITEMS_PER_PAGE), MAX_PAGES);
  const maxShortcuts = MAX_PAGES * ITEMS_PER_PAGE;
  const displayableShortcuts = shortcuts.slice(0, maxShortcuts);
  const pageShortcuts = displayableShortcuts.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  const handleOpen = useCallback(() => {
    setCurrentPage(0);
    setIsModalOpen(true);
  }, []);

  // ─── Folder hover-to-open (GridStack drag over closed folder) ─────────
  const openTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startOpenTimer = useCallback(() => {
    if (!openTimeoutRef.current && !isModalOpen) {
      openTimeoutRef.current = setTimeout(() => {
        handleOpen();
      }, 350);
    }
  }, [handleOpen, isModalOpen]);

  const clearOpenTimer = useCallback(() => {
    if (openTimeoutRef.current) {
      clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }, []);

  // Listen for global-drag-move to trigger hover-to-open on closed folder
  useEffect(() => {
    if (!isEditing || isModalOpen) {
      clearOpenTimer();
      return;
    }
    if (!activePointer || !activeShortcutId || !folderContainerRef.current || !sectionId) return;

    const rect = folderContainerRef.current.getBoundingClientRect();
    const isOver =
      activePointer.x >= rect.left && activePointer.x <= rect.right &&
      activePointer.y >= rect.top && activePointer.y <= rect.bottom;

    if (isOver) {
      const nextIndex = shortcuts.filter(shortcut => shortcut.id !== activeShortcutId).length;
      const previewSize = Math.min(rect.width, rect.height, dragSourceRect?.width ?? 96);
      setDragTarget({
        kind: 'section',
        sectionId,
        index: nextIndex,
        // Keep the drag ghost shortcut-sized until the modal grid can measure a real slot.
        rect: dragSourceRect ?? {
          left: rect.left + (rect.width - previewSize) / 2,
          top: rect.top + (rect.height - previewSize) / 2,
          width: previewSize,
          height: previewSize,
        },
      });
      startOpenTimer();
    } else {
      clearOpenTimer();
    }
  }, [activePointer, activeShortcutId, clearOpenTimer, dragSourceRect, isEditing, isModalOpen, sectionId, setDragTarget, shortcuts, startOpenTimer]);

  // ─── Close modal when native-dragging out ─────────────────────────────
  useEffect(() => {
    if (!isEditing || !isModalOpen || !activePointer) return;

    let closeTimeout: NodeJS.Timeout | null = null;
    if (!modalContentRef.current) return;

    const rect = modalContentRef.current.getBoundingClientRect();
    const isOutside =
      activePointer.x < rect.left - 12 ||
      activePointer.x > rect.right + 12 ||
      activePointer.y < rect.top - 12 ||
      activePointer.y > rect.bottom + 12;

    if (isOutside) {
      const pointerForHandoff = dragPointer ? { ...dragPointer } : null;
      const shortcutIdForHandoff = draggedShortcutId;
      closeTimeout = setTimeout(() => {
        setIsModalOpen(false);

        if (
          !pointerForHandoff ||
          !shortcutIdForHandoff ||
          !pageId ||
          !gridStack ||
          isHandingOffRef.current
        ) {
          return;
        }

        isHandingOffRef.current = true;
        window.requestAnimationFrame(() => {
          const elements = document.elementsFromPoint(pointerForHandoff.x, pointerForHandoff.y);
          const isOverShortcutDropzone = elements.some((el) =>
            Boolean(el.closest('[data-shortcut-dropzone]') || el.closest('[role="dialog"]'))
          );

          if (isOverShortcutDropzone) {
            isHandingOffRef.current = false;
            return;
          }

          const targetGrid = resolveDashboardShortcutGridTarget({
            widgets,
            pageId,
            shortcutId: shortcutIdForHandoff,
            gridStack,
            clientX: pointerForHandoff.x,
            clientY: pointerForHandoff.y,
          });

          if (!targetGrid) {
            isHandingOffRef.current = false;
            return;
          }

          setDragTarget({
            kind: 'dashboard',
            pageId,
            grid: targetGrid,
            rect: getDashboardCellRect(
              gridStack.el.getBoundingClientRect(),
              gridStack.getColumn(),
              gridStack.getCellHeight(true),
              targetGrid,
            ),
          });
          isHandingOffRef.current = false;
        });
      }, 120);
    }

    return () => {
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [activePointer, dragPointer, draggedShortcutId, gridStack, isEditing, isModalOpen, pageId, setDragTarget, widgets]);

  return (
    <>
      <div
        ref={folderContainerRef}
        className={styles.folderContainer}
        onClick={!isEditing ? handleOpen : undefined}
        data-shortcut-dropzone="closed-folder"
        data-section-id={sectionId}
        role="button"
        tabIndex={0}
      >
        <div className={styles.folderPreview}>
          {Array.from({ length: PREVIEW_COUNT }).map((_, i) => {
            const shortcut = previewShortcuts[i];
            if (shortcut) {
              return <PreviewIcon key={shortcut.id} shortcut={shortcut} />;
            }
            return <div key={i} className={styles.folderPreviewEmpty} />;
          })}
        </div>
        <span className={styles.folderName}>{title}</span>

        {isEditing && (
          <div className={styles.editOverlay}>
            <button 
              className={styles.openButton}
              onClick={(e) => {
                e.stopPropagation();
                handleOpen();
              }}
            >
              Open Folder
            </button>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        size="md"
        lockScroll={!isEditing}
      >
        <div 
           ref={modalContentRef} 
           data-widget-type="section" 
           data-widget-id={sectionId}
        >
        <ModalContent style={{ borderRadius: 'var(--widget-radius, 24px)' }}>
          <ModalHeader
            title={title}
            onClose={() => setIsModalOpen(false)}
          />
          <ModalBody>
            {shortcuts.length === 0 ? (
              <ShortcutCollection
                sectionId={sectionId || ''}
                shortcuts={shortcuts}
                visibleShortcuts={pageShortcuts}
                isEditing={isEditing}
                gridClassName={styles.modalShortcutGrid}
                slotClassName={styles.modalShortcutSlot}
                emptyState={
                  <>
                    <FolderOpen size={32} />
                    <span>No shortcuts in this folder</span>
                  </>
                }
              />
            ) : (
              <>
                <ShortcutCollection
                  sectionId={sectionId || ''}
                  shortcuts={shortcuts}
                  visibleShortcuts={pageShortcuts}
                  isEditing={isEditing}
                  gridClassName={styles.modalShortcutGrid}
                  slotClassName={styles.modalShortcutSlot}
                />

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button
                      className={styles.paginationArrow}
                      onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <div className={styles.paginationDots}>
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          className={`${styles.paginationDot} ${i === currentPage ? styles.active : ''}`}
                          onClick={() => setCurrentPage(i)}
                          aria-label={`Page ${i + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      className={styles.paginationArrow}
                      onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage === totalPages - 1}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
          </ModalBody>

        </ModalContent>
        </div>
      </Modal>
    </>
  );
};
