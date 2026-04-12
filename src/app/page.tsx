"use client";

import React, { useEffect, useMemo, useState } from 'react';
import styles from "./page.module.css";
import { WidgetRenderer } from "@/components/core/WidgetRenderer";
import { DashboardGrid } from "@/components/core/DashboardGrid";
import { CustomDragGhost } from "@/components/core/CustomDragGhost";
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
import { resolveResponsivePageLayout } from "@/utils/gridUtils";
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
  gapSize: number;
}

const PREVIEW_VIEWPORT_OFFSETS: Record<ResponsiveBreakpointKey, number> = {
  tablet: 120,
  mobile: 48,
};

const DashboardPageContent: React.FC<DashboardPageContentProps> = ({
  pageId,
  widgets,
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
        onLayoutChange={(layout) => onLayoutChange(pageId, layout)}
        onWidgetDragStop={onWidgetDragStop}
        rowHeight={rowHeight}
        gap={gapSize}
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
              <div className="grid-stack-item-content">
                <WidgetRenderer
                  widget={widget}
                  isEditing={allowGridEditing}
                  canEditDashboard={canEditDashboard}
                  onEdit={handleEditWidget}
                  showWidgetNames={showWidgetNames}
                />
              </div>
            </div>
          );
        })}
      </DashboardGrid>
    </div>
  );
};

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
    getRenderableWidgetsByPage,
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
  const [gapSize, setGapSize] = useState(8);
  const [borderRadius, setBorderRadius] = useState(32);
  const [showWidgetNames, setShowWidgetNames] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLayoutControlsOpen, setIsLayoutControlsOpen] = useState(false);
  const [layoutTargetBreakpoint, setLayoutTargetBreakpoint] = useState<BreakpointKey>('desktop');

  useEffect(() => {
    const loadGridSettings = () => {
      const storedRowHeight = localStorage.getItem('grid-row-height');
      const storedGapSize = localStorage.getItem('grid-gap-size');
      const storedBorderRadius = localStorage.getItem('grid-border-radius');
      const storedShowWidgetNames = localStorage.getItem('show-widget-names');

      if (storedRowHeight) setRowHeight(parseInt(storedRowHeight));
      if (storedGapSize) setGapSize(parseInt(storedGapSize));
      if (storedBorderRadius) setBorderRadius(parseInt(storedBorderRadius));
      if (storedShowWidgetNames !== null) setShowWidgetNames(storedShowWidgetNames === 'true');
    };

    loadGridSettings();

    const handleChange = (event: CustomEvent) => {
      if (event.detail.rowHeight !== undefined) setRowHeight(event.detail.rowHeight);
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
  const currentPageId = pages[currentPageIndex]?.id;
  const currentLayoutState = currentPageId
    ? getResponsiveLayoutState(currentPageId, renderedBreakpoint)
    : { isCustom: false, sourceBreakpoint: 'desktop' as BreakpointKey };

  useKeyboardShortcuts({
    onToggleEdit: () => handleToggleEdit(),
    onOpenSettings: () => setIsSettingsOpen(true),
    onAddItem: openAddModal,
    onSaveChanges: saveConfig,
    onPrevPage: () => currentPageIndex > 0 && setPageIndex(currentPageIndex - 1),
    onNextPage: () => currentPageIndex < pages.length - 1 && setPageIndex(currentPageIndex + 1),
    onPageNavigate: (index) => index < pages.length && setPageIndex(index),
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
    currentPageIndex,
    pagesLength: pages.length,
    setPageIndex,
    isModalOpen: isAddModalOpen || isSettingsOpen,
    effectiveScrollDirection,
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

  const getWidgetsForPage = (pageId: string) => {
    const pageWidgets = getRenderableWidgetsByPage(pageId);
    return resolveResponsivePageLayout(pageWidgets, pageId, renderedBreakpoint, responsiveLayouts).widgets;
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
          canSelectTarget={canEditFromDesktopPreview}
          breakpointThresholds={breakpointThresholds}
          onClose={() => setIsLayoutControlsOpen(false)}
          onTargetChange={setLayoutTargetBreakpoint}
          onBreakpointWidthChange={handleBreakpointWidthChange}
          onMakeCustom={handleMakeCurrentPageCustom}
          onResetToAuto={handleResetCurrentPageLayout}
        />
      )}

      <PageIndicators breakpoint={isDesktop ? 'desktop' : renderedBreakpoint} />

      <div className={`${styles.dashboardViewport} ${isPreviewingResponsiveLayout ? styles.previewViewport : ''}`}>
        <div
          className={styles.pagesWrapper}
          data-scroll={effectiveScrollDirection}
          style={{
            ['--current-page-index' as string]: currentPageIndex,
            ['--total-pages' as string]: pages.length,
          } as React.CSSProperties}
        >
          {pages.map((page) => {
            const pageWidgets = getWidgetsForPage(page.id);
            const { maxRows } = getGridDimensions(renderedBreakpoint);
            const usedRows = pageWidgets.reduce<number>(
              (maxRow, widget) => Math.max(maxRow, widget.grid.y + widget.grid.h),
              maxRows,
            );
            const pageContentHeight = usedRows * rowHeight;

            return (
              <div
                key={page.id}
                className={`${styles.pageContainer} ${renderedBreakpoint !== 'desktop' ? styles.scrollable : ''}`}
              >
                <DashboardPageContent
                  pageId={page.id}
                  widgets={pageWidgets}
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
