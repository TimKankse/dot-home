"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from "./page.module.css";
import { WidgetRenderer } from "@/components/core/WidgetRenderer";
import { DashboardGrid } from "@/components/core/DashboardGrid";
import { CustomDragGhost } from "@/components/core/CustomDragGhost";
import { TouchHoldGridItemContent } from "@/components/core/TouchHoldGridItemContent";
import { UIControls } from "@/components/ui/UIControls";
import { LayoutTargetControls } from "@/components/ui/LayoutTargetControls";
import { ItemEditorDialog } from "@/components/item-editor/ItemEditorDialog";
import { SettingsModal } from '@/components/settings/SettingsModal';
import { usePersistenceStore } from "@/store/usePersistenceStore";
import { useWidgetStore } from "@/store/useWidgetStore";
import { usePageStore } from "@/store/usePageStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { PageIndicators } from "@/components/ui/PageIndicators";
import { useScrollNavigation } from "@/hooks/useScrollNavigation";
import { useResponsiveState } from "@/hooks/useResponsiveState";
import { useShortcutDragController } from "@/hooks/useShortcutDragController";
import { useWidgetManager } from "@/hooks/useWidgetManager";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  createRenderedResponsivePages,
  resolveResponsivePageLayout,
  type RenderedResponsivePage,
} from "@/utils/gridUtils";
import { NewWidgetInput, Widget } from "@/types/widget";
import { useAutoSave } from "@/hooks/useAutoSave";
import { getMinDimensions } from "@/constants/widget-definitions";
import {
  getResponsivePreviewWidth,
  getGridDimensions,
  type BreakpointKey,
  type ResponsiveBreakpointKey,
} from "@/constants/grid";

interface DashboardPageContentProps {
  pageId: string;
  widgets: Widget[];
  rowOffset: number;
  contentHeight: number;
  safeAreaTop: number;
  className: string;
  isEditing: boolean;
  canEditDashboard: boolean;
  breakpoint: BreakpointKey;
  onLayoutChange: (pageId: string, layout: { i?: string; x?: number; y?: number; w?: number; h?: number }[]) => void;
  onWidgetDragStop: (widgetId: string, mouseX: number, mouseY: number) => void;
  handleEditWidget: (w: Widget) => void;
  showWidgetNames: boolean;
  rowHeight: number;
  columnWidth: number;
  gapSize: number;
}

const PREVIEW_VIEWPORT_OFFSETS: Record<ResponsiveBreakpointKey, number> = {
  tablet: 120,
  mobile: 48,
};

const DashboardPageContent: React.FC<DashboardPageContentProps> = ({
  pageId,
  widgets,
  rowOffset,
  contentHeight,
  safeAreaTop,
  className,
  isEditing,
  canEditDashboard,
  breakpoint,
  onLayoutChange,
  onWidgetDragStop,
  handleEditWidget,
  showWidgetNames,
  rowHeight,
  columnWidth,
  gapSize,
}) => {
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      setWindowHeight(window.innerHeight);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const paddingTop = useMemo(() => {
    if (windowHeight === 0) return safeAreaTop;

    const delta = windowHeight - contentHeight;
    return Math.max(0, delta / 2);
  }, [windowHeight, contentHeight, safeAreaTop]);

  const allowGridEditing = isEditing && canEditDashboard;

  return (
    <div
      className={className}
      style={{ paddingTop: `${paddingTop}px` }}
    >
      <DashboardGrid
        pageId={pageId}
        items={widgets}
        isEditing={allowGridEditing}
        onLayoutChange={(layout) => onLayoutChange(
          pageId,
          layout.map((item) => ({
            ...item,
            y: item.y === undefined ? item.y : item.y + rowOffset,
          })),
        )}
        onWidgetDragStop={onWidgetDragStop}
        rowHeight={rowHeight}
        gap={gapSize}
        columnWidth={columnWidth}
        gs-no-move={allowGridEditing ? "false" : "true"}
        gs-no-resize={allowGridEditing ? "false" : "true"}
        breakpoint={breakpoint}
      >
        {widgets.map((widget) => {
          const { w: minW, h: minH } = getMinDimensions(
            (widget.type === 'widget' ? widget.widgetType : widget.type) || 'clock',
            widget.config || {},
          );

          return (
            <div
              key={widget.id}
              className="widget-candidate"
              gs-id={widget.id}
              gs-x={widget.grid.x}
              gs-y={widget.grid.y}
              gs-w={widget.grid.w}
              gs-h={widget.grid.h}
              gs-min-w={minW}
              gs-min-h={minH}
              data-gs-min-w={minW}
              data-gs-min-h={minH}
              data-widget-type={widget.type}
              data-widget-id={widget.id}
            >
              <TouchHoldGridItemContent isEditing={allowGridEditing}>
                <WidgetRenderer
                  widget={widget}
                  isEditing={allowGridEditing}
                  canEditDashboard={canEditDashboard}
                  onEdit={handleEditWidget}
                  showWidgetNames={showWidgetNames}
                />
              </TouchHoldGridItemContent>
            </div>
          );
        })}
      </DashboardGrid>
    </div>
  );
};

interface RenderedDashboardPage extends Omit<RenderedResponsivePage, 'breakpoint'> {
  basePageIndex: number;
  breakpoint: BreakpointKey;
}

export default function Home() {
  const {
    isEditing,
    canEditDashboard,
    saveStatus,
    fetchConfig,
    saveConfig,
    toggleEdit,
    isLoaded,
  } = usePersistenceStore();

  const {
    widgets,
    responsiveLayouts,
    updateLayout,
    moveShortcut,
    getResponsiveLayoutState,
    materializeResponsiveLayout,
    resetResponsiveLayout,
  } = useWidgetStore();

  const {
    pages,
    currentPageIndex,
    scrollDirection,
    addPage,
    setPageIndex,
  } = usePageStore();

  const {
    breakpoint: viewportBreakpoint,
    isDesktop,
    breakpointThresholds,
    mainRef,
  } = useResponsiveState();
  const updateDisplaySettings = useSettingsStore((state) => state.updateDisplay);

  const [rowHeight, setRowHeight] = useState(100);
  const [columnWidth, setColumnWidth] = useState(150);
  const [gapSize, setGapSize] = useState(8);
  const [borderRadius, setBorderRadius] = useState(32);
  const [showWidgetNames, setShowWidgetNames] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutControlsOpen, setIsLayoutControlsOpen] = useState(false);
  const [layoutTargetBreakpoint, setLayoutTargetBreakpoint] = useState<BreakpointKey>('desktop');
  const [requestedRenderedPageIndex, setRequestedRenderedPageIndex] = useState(0);
  const [pendingRenderedBasePageIndex, setPendingRenderedBasePageIndex] = useState<number | null>(null);
  const dashboardViewportRef = useRef<HTMLDivElement>(null);
  const pagesWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadGridSettings = () => {
      const storedRowHeight = localStorage.getItem('grid-row-height');
      const storedColumnWidth = localStorage.getItem('grid-column-width');
      const storedGapSize = localStorage.getItem('grid-gap-size');
      const storedBorderRadius = localStorage.getItem('grid-border-radius');
      const storedShowWidgetNames = localStorage.getItem('show-widget-names');

      if (storedRowHeight) setRowHeight(parseInt(storedRowHeight));
      if (storedColumnWidth) setColumnWidth(parseInt(storedColumnWidth));
      if (storedGapSize) setGapSize(parseInt(storedGapSize));
      if (storedBorderRadius) setBorderRadius(parseInt(storedBorderRadius));
      if (storedShowWidgetNames !== null) setShowWidgetNames(storedShowWidgetNames === 'true');
    };

    loadGridSettings();

    const handleChange = (event: CustomEvent) => {
      if (event.detail.rowHeight !== undefined) setRowHeight(event.detail.rowHeight);
      if (event.detail.columnWidth !== undefined) setColumnWidth(event.detail.columnWidth);
      if (event.detail.gapSize !== undefined) setGapSize(event.detail.gapSize);
      if (event.detail.borderRadius !== undefined) setBorderRadius(event.detail.borderRadius);
      if (event.detail.showWidgetNames !== undefined) setShowWidgetNames(event.detail.showWidgetNames);
    };

    window.addEventListener('grid-appearance-change', handleChange as EventListener);

    return () => {
      window.removeEventListener('grid-appearance-change', handleChange as EventListener);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--widget-radius', `${borderRadius}px`);
    document.documentElement.style.setProperty('--row-height', `${rowHeight}px`);
    document.documentElement.style.setProperty('--gap-size', `${gapSize}px`);
  }, [borderRadius, rowHeight, gapSize]);

  const {
    isAddModalOpen,
    editingItem,
    handleEditWidget,
    handleUpdateWidget,
    handleDeleteWidget,
    handleAdd,
    closeAddModal,
    openAddModal,
  } = useWidgetManager();

  const canOpenLayoutControls = isEditing && canEditDashboard;
  const canEditFromDesktopPreview = canOpenLayoutControls && isDesktop;
  const renderedBreakpoint = canEditFromDesktopPreview ? layoutTargetBreakpoint : viewportBreakpoint;
  const isPreviewingResponsiveLayout = canEditFromDesktopPreview && renderedBreakpoint !== 'desktop';
  const pageLayouts = useMemo(() => {
    const hiddenShortcutIds = new Set<string>();

    widgets.forEach((widget) => {
      if (widget.type === 'section' && widget.config?.shortcutIds) {
        (widget.config.shortcutIds as string[]).forEach((shortcutId) => hiddenShortcutIds.add(shortcutId));
      }
    });

    return pages.map((page, basePageIndex) => {
      const pageWidgets = widgets.filter((widget) =>
        widget.pageId === page.id && !hiddenShortcutIds.has(widget.id),
      );
      const resolvedLayout = resolveResponsivePageLayout(
        pageWidgets,
        page.id,
        renderedBreakpoint,
        responsiveLayouts,
      );

      return {
        pageId: page.id,
        basePageIndex,
        resolvedLayout,
      };
    });
  }, [pages, renderedBreakpoint, responsiveLayouts, widgets]);

  const renderedPages = useMemo<RenderedDashboardPage[]>(() => {
    if (renderedBreakpoint === 'desktop') {
      return pageLayouts.map(({ pageId, basePageIndex, resolvedLayout }) => ({
        id: pageId,
        basePageId: pageId,
        basePageIndex,
        breakpoint: 'desktop',
        segmentIndex: 0,
        segmentCount: 1,
        rowOffset: 0,
        widgets: resolvedLayout.widgets,
        diagnostics: resolvedLayout.diagnostics,
      }));
    }

    return pageLayouts.flatMap(({ pageId, basePageIndex, resolvedLayout }) => (
      createRenderedResponsivePages(
        pageId,
        renderedBreakpoint as ResponsiveBreakpointKey,
        resolvedLayout,
      ).map((renderedPage) => ({
        ...renderedPage,
        basePageIndex,
      }))
    ));
  }, [pageLayouts, renderedBreakpoint]);

  const renderedPageIndex = useMemo(() => {
    if (renderedPages.length === 0) {
      return 0;
    }

    const clampedRequestedIndex = Math.max(0, Math.min(requestedRenderedPageIndex, renderedPages.length - 1));

    if (renderedBreakpoint === 'desktop') {
      return Math.max(0, Math.min(currentPageIndex, renderedPages.length - 1));
    }

    const activeRenderedPage = renderedPages[clampedRequestedIndex];
    if (
      activeRenderedPage &&
      (
        activeRenderedPage.basePageIndex === currentPageIndex ||
        activeRenderedPage.basePageIndex === pendingRenderedBasePageIndex
      )
    ) {
      return clampedRequestedIndex;
    }

    const nextIndex = renderedPages.findIndex((page) => page.basePageIndex === currentPageIndex);
    if (nextIndex >= 0) {
      return nextIndex;
    }

    return clampedRequestedIndex;
  }, [currentPageIndex, pendingRenderedBasePageIndex, renderedBreakpoint, renderedPages, requestedRenderedPageIndex]);

  const setActiveRenderedPage = useCallback((index: number) => {
    if (renderedPages.length === 0) return;

    const clampedIndex = Math.max(0, Math.min(index, renderedPages.length - 1));
    const nextRenderedPage = renderedPages[clampedIndex];

    setRequestedRenderedPageIndex(clampedIndex);
    setPendingRenderedBasePageIndex(nextRenderedPage?.basePageIndex ?? null);

    if (nextRenderedPage && nextRenderedPage.basePageIndex !== currentPageIndex) {
      setPageIndex(nextRenderedPage.basePageIndex);
    }
  }, [currentPageIndex, renderedPages, setPageIndex]);

  useEffect(() => {
    let cancelled = false;
    const scheduleStateSync = (callback: () => void) => {
      queueMicrotask(() => {
        if (!cancelled) {
          callback();
        }
      });
    };

    if (renderedPages.length === 0) {
      if (pendingRenderedBasePageIndex !== null) {
        scheduleStateSync(() => setPendingRenderedBasePageIndex(null));
      }
      if (requestedRenderedPageIndex !== 0) {
        scheduleStateSync(() => setRequestedRenderedPageIndex(0));
      }
      return () => {
        cancelled = true;
      };
    }

    if (pendingRenderedBasePageIndex === currentPageIndex) {
      scheduleStateSync(() => setPendingRenderedBasePageIndex(null));
      return () => {
        cancelled = true;
      };
    }

    if (pendingRenderedBasePageIndex !== null) {
      return () => {
        cancelled = true;
      };
    }

    const nextRenderedIndex = renderedBreakpoint === 'desktop'
      ? Math.max(0, Math.min(currentPageIndex, renderedPages.length - 1))
      : renderedPages.findIndex((page) => page.basePageIndex === currentPageIndex);

    if (nextRenderedIndex >= 0 && nextRenderedIndex !== requestedRenderedPageIndex) {
      scheduleStateSync(() => setRequestedRenderedPageIndex(nextRenderedIndex));
    }

    return () => {
      cancelled = true;
    };
  }, [currentPageIndex, pendingRenderedBasePageIndex, renderedBreakpoint, renderedPages, requestedRenderedPageIndex]);

  const currentRenderedPage = renderedPages[renderedPageIndex] ?? renderedPages[0];
  const currentPageId = currentRenderedPage?.basePageId ?? pages[currentPageIndex]?.id;
  const currentPageLayout = pageLayouts.find((page) => page.pageId === currentPageId);
  const currentLayoutState = currentPageId
    ? getResponsiveLayoutState(currentPageId, renderedBreakpoint)
    : { isCustom: false, sourceBreakpoint: 'desktop' as BreakpointKey };

  useKeyboardShortcuts({
    onToggleEdit: () => handleToggleEdit(),
    onOpenSettings: () => setIsSettingsOpen(true),
    onAddItem: openAddModal,
    onSaveChanges: saveConfig,
    onPrevPage: () => renderedPageIndex > 0 && setActiveRenderedPage(renderedPageIndex - 1),
    onNextPage: () => renderedPageIndex < renderedPages.length - 1 && setActiveRenderedPage(renderedPageIndex + 1),
    onPageNavigate: (index) => index < renderedPages.length && setActiveRenderedPage(index),
    isModalOpen: isAddModalOpen || isSettingsOpen,
  });

  useEffect(() => {
    const handleWidgetEdit = (event: Event) => {
      const customEvent = event as CustomEvent<{ widget?: Widget; widgetId?: string }>;
      const eventWidget = customEvent.detail?.widget;
      const widgetId = customEvent.detail?.widgetId;
      const resolvedWidget = eventWidget ?? (widgetId
        ? widgets.find((widget) => widget.id === widgetId)
        : undefined);

      if (resolvedWidget) {
        handleEditWidget(resolvedWidget);
      }
    };

    window.addEventListener('widget-edit', handleWidgetEdit);
    return () => {
      window.removeEventListener('widget-edit', handleWidgetEdit);
    };
  }, [handleEditWidget, widgets]);

  useAutoSave();
  useShortcutDragController(isEditing);

  const effectiveScrollDirection = renderedBreakpoint === 'desktop' ? scrollDirection : 'horizontal';

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useScrollNavigation({
    currentPageIndex: renderedPageIndex,
    pagesLength: renderedPages.length,
    setPageIndex: setActiveRenderedPage,
    isModalOpen: isAddModalOpen || isSettingsOpen,
    effectiveScrollDirection,
    viewportRef: dashboardViewportRef,
    wrapperRef: pagesWrapperRef,
  });

  const handleToggleEdit = () => {
    if (isEditing) {
      saveConfig();
      setIsLayoutControlsOpen(false);
    }
    toggleEdit();
  };

  const handleLayoutChange = (
    pageId: string,
    currentLayout: { i?: string; x?: number; y?: number; w?: number; h?: number }[],
  ) => {
    if (!isEditing || !canEditDashboard) return;

    const validLayout = currentLayout.filter(
      (item): item is { i: string; x: number; y: number; w: number; h: number } =>
        item.i !== undefined &&
        item.x !== undefined &&
        item.y !== undefined &&
        item.w !== undefined &&
        item.h !== undefined,
    );

    updateLayout(pageId, renderedBreakpoint, validLayout);
  };

  const handleWidgetDragStop = (widgetId: string, mouseX: number, mouseY: number) => {
    if (!isEditing) return;

    const draggedWidget = widgets.find((widget) => widget.id === widgetId);
    if (!draggedWidget || draggedWidget.type !== 'shortcut') return;

    const elementsUnderMouse = document.elementsFromPoint(mouseX, mouseY);

    for (const element of elementsUnderMouse) {
      const sectionElement = (element as HTMLElement).closest('[data-widget-type="section"]');
      if (sectionElement && sectionElement !== element.closest(`[data-widget-id="${widgetId}"]`)) {
        const sectionId = sectionElement.getAttribute('data-widget-id');
        if (!sectionId) continue;

        const section = widgets.find((widget) => widget.id === sectionId);
        if (!section) continue;

        const sectionConfig = (section.config || {}) as Record<string, unknown>;
        const existingShortcutIds = (sectionConfig.shortcutIds as string[]) || [];

        if (existingShortcutIds.includes(widgetId)) return;

        const gridElement = sectionElement.querySelector('[data-placeholder-index]');
        const placeholderIndex = gridElement ? parseInt((gridElement as HTMLElement).dataset.placeholderIndex!, 10) : null;

        let insertIndex = placeholderIndex ?? existingShortcutIds.length;
        insertIndex = Math.max(0, Math.min(insertIndex, existingShortcutIds.length));

        moveShortcut(widgetId, {
          container: {
            type: 'section',
            sectionId,
          },
          index: insertIndex,
        });

        return;
      }
    }
  };

  const handleMakeCurrentPageCustom = () => {
    if (!currentPageId || renderedBreakpoint === 'desktop') return;
    materializeResponsiveLayout(currentPageId, renderedBreakpoint as ResponsiveBreakpointKey);
  };

  const handleResetCurrentPageLayout = () => {
    if (!currentPageId || renderedBreakpoint === 'desktop') return;
    resetResponsiveLayout(currentPageId, renderedBreakpoint as ResponsiveBreakpointKey);
  };

  const handleBreakpointWidthChange = (breakpoint: ResponsiveBreakpointKey, value: number) => {
    if (breakpoint === 'mobile') {
      updateDisplaySettings({ mobileBreakpointMaxWidth: value });
      return;
    }

    updateDisplaySettings({ tabletBreakpointMaxWidth: value });
  };

  const previewWidth = isPreviewingResponsiveLayout
    ? getResponsivePreviewWidth(renderedBreakpoint as ResponsiveBreakpointKey, breakpointThresholds)
    : null;

  const dashboardShellWidth = isPreviewingResponsiveLayout
    ? `min(${previewWidth}px, calc(100vw - ${PREVIEW_VIEWPORT_OFFSETS[renderedBreakpoint as ResponsiveBreakpointKey]}px))`
    : '100%';
  const dashboardShellHeight = isPreviewingResponsiveLayout
    ? 'calc(100dvh - 80px)'
    : '100dvh';

  if (!isLoaded || pages.length === 0) {
    return null;
  }

  return (
    <main
      ref={mainRef}
      className={styles.mainContainer}
      style={{
        ['--widget-radius' as string]: `${borderRadius}px`,
        ['--row-height' as string]: `${rowHeight}px`,
        ['--gap-size' as string]: `${gapSize}px`,
        ['--dashboard-shell-width' as string]: dashboardShellWidth,
        ['--dashboard-shell-height' as string]: dashboardShellHeight,
      } as React.CSSProperties}
    >
      {canOpenLayoutControls && (
        <LayoutTargetControls
          isOpen={isLayoutControlsOpen}
          target={renderedBreakpoint}
          isCustom={currentLayoutState.isCustom}
          sourceBreakpoint={currentLayoutState.sourceBreakpoint}
          diagnostics={renderedBreakpoint === 'desktop' ? null : currentPageLayout?.resolvedLayout.diagnostics ?? null}
          canSelectTarget={canEditFromDesktopPreview}
          breakpointThresholds={breakpointThresholds}
          onClose={() => setIsLayoutControlsOpen(false)}
          onTargetChange={setLayoutTargetBreakpoint}
          onBreakpointWidthChange={handleBreakpointWidthChange}
          onMakeCustom={handleMakeCurrentPageCustom}
          onResetToAuto={handleResetCurrentPageLayout}
        />
      )}

      <PageIndicators
        breakpoint={isDesktop ? 'desktop' : renderedBreakpoint}
        renderedPages={renderedPages.map((page) => ({
          id: page.id,
          basePageId: page.basePageId,
        }))}
        currentRenderedPageIndex={renderedPageIndex}
        onRenderedPageChange={setActiveRenderedPage}
      />

      <div
        ref={dashboardViewportRef}
        className={`${styles.dashboardViewport} ${isPreviewingResponsiveLayout ? styles.previewViewport : ''}`}
        data-scroll={effectiveScrollDirection}
      >
        <div
          ref={pagesWrapperRef}
          className={styles.pagesWrapper}
          data-scroll={effectiveScrollDirection}
          style={{
            ['--total-pages' as string]: renderedPages.length,
          } as React.CSSProperties}
        >
          {renderedPages.map((page) => {
            const { maxRows } = getGridDimensions(renderedBreakpoint);
            const usedRows = page.widgets.reduce<number>(
              (maxRow, widget) => Math.max(maxRow, widget.grid.y + widget.grid.h),
              maxRows,
            );
            const pageContentHeight = usedRows * rowHeight;
            const isScrollablePage =
              renderedBreakpoint !== 'desktop' ||
              usedRows > maxRows;

            return (
              <div
                key={page.id}
                className={`${styles.pageContainer} ${isScrollablePage ? styles.scrollable : ''}`}
              >
                <DashboardPageContent
                  pageId={page.basePageId}
                  widgets={page.widgets}
                  rowOffset={page.rowOffset}
                  contentHeight={pageContentHeight}
                  safeAreaTop={32}
                  className={styles.dashboard}
                  isEditing={isEditing}
                  canEditDashboard={canEditDashboard}
                  breakpoint={renderedBreakpoint}
                  onLayoutChange={handleLayoutChange}
                  onWidgetDragStop={handleWidgetDragStop}
                  handleEditWidget={handleEditWidget}
                  showWidgetNames={showWidgetNames}
                  rowHeight={rowHeight}
                  columnWidth={columnWidth}
                  gapSize={gapSize}
                />
              </div>
            );
          })}
        </div>
      </div>

      <UIControls
        isEditing={isEditing}
        canEdit={canEditDashboard}
        showLayoutControlsToggle={canOpenLayoutControls}
        isLayoutControlsOpen={isLayoutControlsOpen}
        onToggleEdit={handleToggleEdit}
        onToggleLayoutControls={() => setIsLayoutControlsOpen((current) => !current)}
        onAdd={openAddModal}
        onSave={saveConfig}
        onAddPage={addPage}
        saveStatus={saveStatus}
        onOpenSettings={() => {
          setIsLayoutControlsOpen(false);
          setIsSettingsOpen(true);
        }}
      />

      <ItemEditorDialog
        key={editingItem?.id || 'new'}
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onAdd={(newItem) => handleAdd(newItem as unknown as NewWidgetInput, 'desktop')}
        onEdit={handleUpdateWidget}
        onDelete={canEditDashboard ? handleDeleteWidget : undefined}
        initialItem={editingItem}
        mode={editingItem ? 'edit' : 'add'}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <CustomDragGhost />
    </main>
  );
}
