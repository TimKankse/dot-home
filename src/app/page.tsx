"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styles from "./page.module.css";
import { WidgetRenderer } from "@/components/core/WidgetRenderer";
import { DashboardGrid } from "@/components/core/DashboardGrid";
import { CustomDragGhost } from "@/components/core/CustomDragGhost";
import { UIControls } from "@/components/ui/UIControls";
import { ItemEditorDialog } from "@/components/item-editor/ItemEditorDialog";
import { SettingsModal } from '@/components/settings/SettingsModal';
import { usePersistenceStore } from "@/store/usePersistenceStore";
import { useWidgetStore } from "@/store/useWidgetStore";
import { usePageStore } from "@/store/usePageStore";
// import { useSettingsStore } from "@/store/useSettingsStore";
import { PageIndicators } from "@/components/ui/PageIndicators";
import { useScrollNavigation } from "@/hooks/useScrollNavigation";
import { useResponsiveState } from "@/hooks/useResponsiveState";
import { useShortcutDragController } from "@/hooks/useShortcutDragController";
import { useWidgetManager } from "@/hooks/useWidgetManager";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { getResponsiveLayout } from "@/utils/gridUtils";
import { NewWidgetInput } from "@/types/widget";
import { useAutoSave } from "@/hooks/useAutoSave";

import { Widget } from "@/types/widget";
import { getMinDimensions } from "@/constants/widget-definitions";
import { getGridDimensions } from "@/constants/grid";

interface DashboardPageContentProps {
  pageId: string;
  widgets: Widget[];
  contentHeight: number;
  safeAreaTop: number;
  className: string;
  isEditing: boolean;
  canEditDashboard: boolean;
  handleLayoutChange: (layout: { i?: string; x?: number; y?: number; w?: number; h?: number }[]) => void;
  handleBreakpointChange: (bp: string, cols: number) => void;
  handleWidgetDragStop: (widgetId: string, mouseX: number, mouseY: number) => void;
  handleEditWidget: (w: Widget) => void;
  showWidgetNames: boolean;
  rowHeight: number;
  gapSize: number;
  isMedium: boolean;
  isMobile: boolean;
}

const DashboardPageContent: React.FC<DashboardPageContentProps> = ({
  pageId,
  widgets,
  contentHeight,
  safeAreaTop,
  className,
  isEditing,
  canEditDashboard,
  handleLayoutChange,
  handleBreakpointChange,
  handleWidgetDragStop,
  handleEditWidget,
  showWidgetNames,
  rowHeight,
  gapSize,
  isMedium,
  isMobile
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
    const padding = Math.max(0, delta / 2);
    return padding;
  }, [windowHeight, contentHeight, safeAreaTop]);

  return (
    <div 
        className={className} 
        style={{ paddingTop: `${paddingTop}px` }}
    >
      <DashboardGrid 
        pageId={pageId}
        items={widgets}
        isEditing={isEditing && canEditDashboard} 
        onLayoutChange={handleLayoutChange} 
        onBreakpointChange={handleBreakpointChange}
        onWidgetDragStop={handleWidgetDragStop}
        rowHeight={rowHeight}
        gap={gapSize}
        gs-no-move={(!isEditing || !canEditDashboard) ? "true" : "false"}
        gs-no-resize={(!isEditing || !canEditDashboard) ? "true" : "false"}
        isMedium={isMedium}
        isMobile={isMobile}
      >
        {widgets.map((widget) => {
          const { w: minW, h: minH } = getMinDimensions(
            (widget.type === 'widget' ? widget.widgetType : widget.type) || 'clock',
            widget.config || {}
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
                isEditing={isEditing}
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
  // Persistence store
  const { 
    isEditing, 
    canEditDashboard,
    saveStatus, 
    fetchConfig, 
    saveConfig, 
    toggleEdit, 
    isLoaded
  } = usePersistenceStore();

  // Widget store
  const { widgets, updateLayout, moveShortcut } = useWidgetStore();

  // Page store
  const {
    pages,
    currentPageIndex,
    scrollDirection,
    addPage,
    setPageIndex
  } = usePageStore();

  const {
    isMobile,
    isMedium,
    breakpointRef,
    mainRef,
    handleBreakpointChange
  } = useResponsiveState();

  const [rowHeight, setRowHeight] = useState(100);
  const [gapSize, setGapSize] = useState(8);
  const [borderRadius, setBorderRadius] = useState(32);
  const [showWidgetNames, setShowWidgetNames] = useState(true);
  




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
    
    const handleChange = (e: CustomEvent) => {
      if (e.detail.rowHeight !== undefined) setRowHeight(e.detail.rowHeight);
      if (e.detail.gapSize !== undefined) setGapSize(e.detail.gapSize);
      if (e.detail.borderRadius !== undefined) setBorderRadius(e.detail.borderRadius);
      if (e.detail.showWidgetNames !== undefined) setShowWidgetNames(e.detail.showWidgetNames);
    };
    
    window.addEventListener('grid-appearance-change', handleChange as EventListener);
    
    return () => {
      window.removeEventListener('grid-appearance-change', handleChange as EventListener);
    };
  }, []);

  // Sync grid settings to CSS variables on root so Portals (Modals) inherit them
  useEffect(() => {
    document.documentElement.style.setProperty('--widget-radius', `${borderRadius}px`);
    document.documentElement.style.setProperty('--row-height', `${rowHeight}px`);
    document.documentElement.style.setProperty('--gap-size', `${gapSize}px`);
  }, [borderRadius, rowHeight, gapSize]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  


  const {
    isAddModalOpen,
    editingItem,
    handleEditWidget,
    handleUpdateWidget,
    handleDeleteWidget,
    handleAdd,
    closeAddModal,
    openAddModal
  } = useWidgetManager();

  useKeyboardShortcuts({
    onToggleEdit: () => handleToggleEdit(),
    onOpenSettings: () => setIsSettingsOpen(true),
    onAddItem: openAddModal,
    onSaveChanges: saveConfig,
    onPrevPage: () => currentPageIndex > 0 && setPageIndex(currentPageIndex - 1),
    onNextPage: () => currentPageIndex < pages.length - 1 && setPageIndex(currentPageIndex + 1),
    onPageNavigate: (index) => index < pages.length && setPageIndex(index),
    isModalOpen: isAddModalOpen || isSettingsOpen
  });

  // Listen for widget edit requests (e.g. from shortcuts inside sections)
  useEffect(() => {
    const handleWidgetEdit = (e: Event) => {
      const customEvent = e as CustomEvent<{ widget?: Widget; widgetId?: string }>;
      const eventWidget = customEvent.detail?.widget;
      const widgetId = customEvent.detail?.widgetId;
      const resolvedWidget = eventWidget ?? (widgetId
        ? widgets.find(widget => widget.id === widgetId)
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

  const effectiveScrollDirection = (isMedium || isMobile) ? 'horizontal' : scrollDirection;

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useScrollNavigation({
    currentPageIndex,
    pagesLength: pages.length,
    setPageIndex,
    isModalOpen: isAddModalOpen || isSettingsOpen,
    effectiveScrollDirection
  });

  const handleToggleEdit = () => {
    if (isEditing) {
      saveConfig();
    }
    toggleEdit();
  };

  const handleLayoutChange = (currentLayout: { i?: string; x?: number; y?: number; w?: number; h?: number }[]) => { 
    if ((breakpointRef.current === 'lg' || breakpointRef.current === 'md') && !isMedium && !isMobile) {
      const validLayout = currentLayout.filter(
        (item): item is { i: string; x: number; y: number; w: number; h: number } => 
          item.i !== undefined && item.x !== undefined && item.y !== undefined && 
          item.w !== undefined && item.h !== undefined
      );
      updateLayout(validLayout, isMedium, isMobile);
    }
  };

  // When a widget drag ends, check if a shortcut was dropped over a section
  const handleWidgetDragStop = (widgetId: string, mouseX: number, mouseY: number) => {
    if (!isEditing) return;

    const draggedWidget = widgets.find(w => w.id === widgetId);
    if (!draggedWidget || draggedWidget.type !== 'shortcut') return;

    const elementsUnderMouse = document.elementsFromPoint(mouseX, mouseY);
    
    for (const el of elementsUnderMouse) {
      const sectionEl = (el as HTMLElement).closest('[data-widget-type="section"]');
      if (sectionEl && sectionEl !== el.closest(`[data-widget-id="${widgetId}"]`)) {
        const sectionId = sectionEl.getAttribute('data-widget-id');
        if (!sectionId) continue;

        const section = widgets.find(w => w.id === sectionId);
        if (!section) continue;

        const sectionConfig = (section.config || {}) as Record<string, unknown>;
        const existingShortcutIds = (sectionConfig.shortcutIds as string[]) || [];

        if (existingShortcutIds.includes(widgetId)) return;

        // Read the placeholder index set by useSectionDrag on the section grid
        const gridEl = sectionEl.querySelector('[data-placeholder-index]');
        const placeholderIdx = gridEl ? parseInt((gridEl as HTMLElement).dataset.placeholderIndex!, 10) : null;

        let insertIdx = placeholderIdx ?? existingShortcutIds.length;
        insertIdx = Math.max(0, Math.min(insertIdx, existingShortcutIds.length));
        
        moveShortcut(widgetId, {
          container: {
            type: 'section',
            sectionId,
          },
          index: insertIdx,
        });

        return;
      }
    }
  };

  const getWidgetsForPage = (pageId: string) => {
    // Collect IDs of shortcuts that are inside sections
    const hiddenShortcutIds = new Set<string>();
    widgets.forEach(w => {
      if (w.type === 'section' && w.config?.shortcutIds) {
        (w.config.shortcutIds as string[]).forEach(id => hiddenShortcutIds.add(id));
      }
    });

    // Filter widgets: match pageId AND not in hidden set
    const pageWidgets = widgets.filter(w => 
      w.pageId === pageId && !hiddenShortcutIds.has(w.id)
    );

    if (isMobile) {
      return getResponsiveLayout(pageWidgets, 2);
    }
    if (isMedium) {
      return getResponsiveLayout(pageWidgets, 4);
    }
    return pageWidgets;
  };

  if (!isLoaded || pages.length === 0) {
    return null; // Or a loading spinner
  }

  return (
      <main 
        ref={mainRef} 
        className={styles.mainContainer}
        style={{ 
          ['--widget-radius' as string]: `${borderRadius}px`,
          ['--row-height' as string]: `${rowHeight}px`,
          ['--gap-size' as string]: `${gapSize}px`,
        } as React.CSSProperties}
      >
      <PageIndicators />
      
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
            const { maxRows } = getGridDimensions(isMedium, isMobile);
            const pageContentHeight = maxRows * rowHeight;

            return (
            <div 
              key={page.id} 
              className={`${styles.pageContainer} ${(isMedium || isMobile) ? styles.scrollable : ''}`}
            >
              <DashboardPageContent 
                pageId={page.id}
                widgets={pageWidgets}
                contentHeight={pageContentHeight}
                safeAreaTop={32}
                className={styles.dashboard}
                isEditing={isEditing}
                canEditDashboard={canEditDashboard}
                handleLayoutChange={handleLayoutChange}
                handleBreakpointChange={handleBreakpointChange}
                handleWidgetDragStop={handleWidgetDragStop}
                handleEditWidget={handleEditWidget}
                showWidgetNames={showWidgetNames}
                rowHeight={rowHeight}
                gapSize={gapSize}
                isMedium={isMedium}
                isMobile={isMobile}
              />

            </div>
          )})}
      </div>
      


      <UIControls 
        isEditing={isEditing} 
        canEdit={canEditDashboard}
        onToggleEdit={handleToggleEdit} 
        onAdd={openAddModal}
        onSave={saveConfig}
        onAddPage={addPage}
        saveStatus={saveStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <ItemEditorDialog
        key={editingItem?.id || 'new'}
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onAdd={(newItem) => handleAdd(newItem as unknown as NewWidgetInput, isMedium, isMobile)}
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
