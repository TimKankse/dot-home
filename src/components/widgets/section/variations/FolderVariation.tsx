import React, { useCallback, useEffect, useRef, useState } from "react";
import { Widget } from "@/types/widget";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@/components/primitives/modal";
import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { useWidgetStore } from "@/store/useWidgetStore";
import { useShortcutDragStore } from "@/store/useShortcutDragStore";
import { useGridStackShortcutDrag } from "@/hooks/useGridStackShortcutDrag";
import { useShortcutIcon } from "@/hooks/useShortcutIcon";
import { useGridStackContext } from "@/gridstack-react/grid-stack-context";
import { resolveDashboardShortcutGridTarget } from "@/utils/shortcutGridStackHandoff";
import { getDashboardCellRect } from "@/utils/dragUtils";
import { ShortcutCollection } from "../ShortcutCollection";
import styles from "../SectionWidget.module.css";

interface FolderVariationProps {
  title: string;
  shortcuts: Widget[];
  isEditing?: boolean;
  sectionId?: string;
  pageId?: string;
}

const ITEMS_PER_PAGE = 12;
const MAX_PAGES = 4;
const PREVIEW_GRID_MIN = 2;
const PREVIEW_GAP_PX = 8;
const PREVIEW_PADDING_PX = 0;
const MIN_PREVIEW_CELL_SIZE_PX = 40;
const MAX_PREVIEW_CELL_SIZE_PX = 64;

const PREVIEW_LAYOUTS = [
  { columns: 3, rows: 3 },
  { columns: 3, rows: 2 },
  { columns: 2, rows: 3 },
  { columns: 2, rows: 2 },
];

interface PreviewLayout {
  columns: number;
  rows: number;
  width: number;
  height: number;
  cellSize: number;
}

const buildPreviewLayout = (
  columns: number,
  rows: number,
  cellSize: number
): PreviewLayout => ({
  columns,
  rows,
  cellSize,
  width:
    PREVIEW_PADDING_PX * 2 +
    cellSize * columns +
    PREVIEW_GAP_PX * (columns - 1),
  height:
    PREVIEW_PADDING_PX * 2 +
    cellSize * rows +
    PREVIEW_GAP_PX * (rows - 1),
});

const DEFAULT_PREVIEW_LAYOUT = buildPreviewLayout(
  PREVIEW_GRID_MIN,
  PREVIEW_GRID_MIN,
  MIN_PREVIEW_CELL_SIZE_PX
);

const getPreviewLayoutForBounds = (
  availableWidth: number,
  availableHeight: number
): PreviewLayout => {
  const stageAspectRatio =
    availableHeight > 0 ? availableWidth / availableHeight : 1;

  const fittingLayouts = PREVIEW_LAYOUTS.map(({ columns, rows }) => {
    const widthBudget =
      availableWidth -
      PREVIEW_PADDING_PX * 2 -
      PREVIEW_GAP_PX * (columns - 1);
    const heightBudget =
      availableHeight -
      PREVIEW_PADDING_PX * 2 -
      PREVIEW_GAP_PX * (rows - 1);
    const cellSize = Math.floor(
      Math.min(
        widthBudget / columns,
        heightBudget / rows,
        MAX_PREVIEW_CELL_SIZE_PX
      )
    );

    if (cellSize < MIN_PREVIEW_CELL_SIZE_PX) {
      return null;
    }

    return buildPreviewLayout(columns, rows, cellSize);
  }).filter((layout): layout is PreviewLayout => Boolean(layout));

  if (fittingLayouts.length === 0) {
    return DEFAULT_PREVIEW_LAYOUT;
  }

  fittingLayouts.sort((a, b) => {
    const countDifference = b.columns * b.rows - a.columns * a.rows;
    if (countDifference !== 0) {
      return countDifference;
    }

    const aspectDifference =
      Math.abs(stageAspectRatio - a.columns / a.rows) -
      Math.abs(stageAspectRatio - b.columns / b.rows);
    if (aspectDifference !== 0) {
      return aspectDifference;
    }

    return b.cellSize - a.cellSize;
  });

  return fittingLayouts[0];
};

const PreviewIcon: React.FC<{ shortcut: Widget }> = ({ shortcut }) => {
  const name = shortcut.name || "";
  const {
    imageUrl,
    fallbackIcon,
    fallbackLetter,
    handleImageError,
  } = useShortcutIcon({
    name,
    url: shortcut.url,
    iconUrl: shortcut.iconUrl,
  });

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={styles.folderPreviewIcon}
        onError={handleImageError}
        draggable={false}
      />
    );
  }

  return (
    <div className={styles.folderPreviewFallback}>
      {fallbackIcon || fallbackLetter}
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
  const [previewLayout, setPreviewLayout] =
    useState<PreviewLayout>(DEFAULT_PREVIEW_LAYOUT);

  const modalContentRef = useRef<HTMLDivElement>(null);
  const folderContainerRef = useRef<HTMLDivElement>(null);
  const folderPreviewStageRef = useRef<HTMLDivElement>(null);
  const widgets = useWidgetStore((state) => state.widgets);
  const dragPointer = useShortcutDragStore(
    (state) => state.activeDrag?.pointer ?? null
  );
  const draggedShortcutId = useShortcutDragStore(
    (state) => state.activeDrag?.shortcutId ?? null
  );
  const dragSourceRect = useShortcutDragStore(
    (state) => state.activeDrag?.sourceRect ?? null
  );
  const gridStackDrag = useGridStackShortcutDrag();
  const setDragTarget = useShortcutDragStore((state) => state.setTarget);
  const activePointer = dragPointer ?? gridStackDrag.pointer;
  const activeShortcutId = draggedShortcutId ?? gridStackDrag.shortcutId;
  const isHandingOffRef = useRef(false);
  const previewCount = previewLayout.columns * previewLayout.rows;

  const previewShortcuts = shortcuts.slice(-previewCount);
  const totalPages = Math.min(
    Math.ceil(shortcuts.length / ITEMS_PER_PAGE),
    MAX_PAGES
  );
  const maxShortcuts = MAX_PAGES * ITEMS_PER_PAGE;
  const displayableShortcuts = shortcuts.slice(0, maxShortcuts);
  const pageShortcuts = displayableShortcuts.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );
  const previewStyle = {
    width: previewLayout.width,
    height: previewLayout.height,
    "--folder-preview-columns": String(previewLayout.columns),
    "--folder-preview-rows": String(previewLayout.rows),
  } as React.CSSProperties;

  const handleOpen = useCallback(() => {
    setCurrentPage(0);
    setIsModalOpen(true);
  }, []);

  useEffect(() => {
    if (!folderPreviewStageRef.current) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(Math.floor(entry.contentRect.width), 0);
      const nextHeight = Math.max(Math.floor(entry.contentRect.height), 0);
      const nextLayout = getPreviewLayoutForBounds(
        nextWidth,
        nextHeight
      );

      setPreviewLayout((current) => {
        if (
          current.width === nextLayout.width &&
          current.height === nextLayout.height &&
          current.columns === nextLayout.columns &&
          current.rows === nextLayout.rows
        ) {
          return current;
        }

        return nextLayout;
      });
    });

    observer.observe(folderPreviewStageRef.current);

    return () => observer.disconnect();
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
    if (
      !activePointer ||
      !activeShortcutId ||
      !folderContainerRef.current ||
      !sectionId
    )
      return;

    const rect = folderContainerRef.current.getBoundingClientRect();
    const isOver =
      activePointer.x >= rect.left &&
      activePointer.x <= rect.right &&
      activePointer.y >= rect.top &&
      activePointer.y <= rect.bottom;

    if (isOver) {
      const nextIndex = shortcuts.filter(
        (shortcut) => shortcut.id !== activeShortcutId
      ).length;
      const previewSize = Math.min(
        rect.width,
        rect.height,
        dragSourceRect?.width ?? 96
      );
      setDragTarget({
        kind: "section",
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
  }, [
    activePointer,
    activeShortcutId,
    clearOpenTimer,
    dragSourceRect,
    isEditing,
    isModalOpen,
    sectionId,
    setDragTarget,
    shortcuts,
    startOpenTimer,
  ]);

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
          const elements = document.elementsFromPoint(
            pointerForHandoff.x,
            pointerForHandoff.y
          );
          const isOverShortcutDropzone = elements.some((el) =>
            Boolean(
              el.closest("[data-shortcut-dropzone]") ||
                el.closest('[role="dialog"]')
            )
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
            kind: "dashboard",
            pageId,
            grid: targetGrid,
            rect: getDashboardCellRect(
              gridStack.el.getBoundingClientRect(),
              gridStack.getColumn(),
              gridStack.getCellHeight(true),
              targetGrid
            ),
          });
          isHandingOffRef.current = false;
        });
      }, 120);
    }

    return () => {
      if (closeTimeout) clearTimeout(closeTimeout);
    };
  }, [
    activePointer,
    dragPointer,
    draggedShortcutId,
    gridStack,
    isEditing,
    isModalOpen,
    pageId,
    setDragTarget,
    widgets,
  ]);

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
        <div className={styles.folderHeader}>
          <span className={styles.folderHeaderTitle}>{title}</span>
        </div>

        <div
          ref={folderPreviewStageRef}
          className={styles.folderPreviewStage}
        >
          <div className={styles.folderPreview} style={previewStyle}>
            {Array.from({ length: previewCount }).map((_, i) => {
              const shortcut = previewShortcuts[i];
              if (shortcut) {
                return <PreviewIcon key={shortcut.id} shortcut={shortcut} />;
              }
              return <div key={i} className={styles.folderPreviewEmpty} />;
            })}
          </div>
        </div>

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
          className={styles.folderModalInner}
          data-widget-type="section"
          data-widget-id={sectionId}
        >
          <ModalContent
            className={styles.folderModalContent}
            style={{ borderRadius: "var(--widget-radius, 24px)" }}
          >
            <ModalHeader title={title} onClose={() => setIsModalOpen(false)} />
            <ModalBody className={styles.folderModalBody}>
              {shortcuts.length === 0 ? (
                <ShortcutCollection
                  sectionId={sectionId || ""}
                  shortcuts={shortcuts}
                  visibleShortcuts={pageShortcuts}
                  isEditing={isEditing}
                  gridClassName={styles.modalShortcutGrid}
                  slotClassName={styles.modalShortcutSlot}
                  shortcutWidgetClassName={styles.sectionShortcutCard}
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
                    sectionId={sectionId || ""}
                    shortcuts={shortcuts}
                    visibleShortcuts={pageShortcuts}
                    isEditing={isEditing}
                    gridClassName={styles.modalShortcutGrid}
                    slotClassName={styles.modalShortcutSlot}
                    shortcutWidgetClassName={styles.sectionShortcutCard}
                  />

                  {totalPages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.paginationArrow}
                        onClick={() =>
                          setCurrentPage((p) => Math.max(0, p - 1))
                        }
                        disabled={currentPage === 0}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <div className={styles.paginationDots}>
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            className={`${styles.paginationDot} ${
                              i === currentPage ? styles.active : ""
                            }`}
                            onClick={() => setCurrentPage(i)}
                            aria-label={`Page ${i + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        className={styles.paginationArrow}
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                        }
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
