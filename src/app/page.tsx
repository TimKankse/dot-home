"use client";

import React, { useState, useEffect } from 'react';
import styles from "./page.module.css";
import { WidgetRenderer } from "@/components/core/WidgetRenderer";
import { DashboardGrid } from "@/components/core/DashboardGrid";
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
import { useWidgetManager } from "@/hooks/useWidgetManager";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { getResponsiveLayout } from "@/utils/gridUtils";
import { NewWidgetInput } from "@/types/widget";
import { useAutoSave } from "@/hooks/useAutoSave";

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
  const { widgets, updateLayout } = useWidgetStore();

  // Page store
  const {
    pages,
    currentPageIndex,
    scrollDirection,
    addPage,
    setPageIndex
  } = usePageStore();

  // const { settings } = useSettingsStore();
  
  // Grid appearance settings from localStorage (personal preferences, like theme)
  const [rowHeight, setRowHeight] = useState(100);
  const [gapSize, setGapSize] = useState(8);
  const [borderRadius, setBorderRadius] = useState(32);
  const [showWidgetNames, setShowWidgetNames] = useState(true);

  // Load grid appearance from localStorage on mount and listen for changes
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
    
    // Listen for changes from AppearanceSettings
    const handleChange = (e: CustomEvent) => {
      if (e.detail.rowHeight !== undefined) setRowHeight(e.detail.rowHeight);
      if (e.detail.gapSize !== undefined) setGapSize(e.detail.gapSize);
      if (e.detail.borderRadius !== undefined) setBorderRadius(e.detail.borderRadius);
      if (e.detail.showWidgetNames !== undefined) setShowWidgetNames(e.detail.showWidgetNames);
    };
    
    window.addEventListener('grid-appearance-change', handleChange as EventListener);
    return () => window.removeEventListener('grid-appearance-change', handleChange as EventListener);
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Custom hooks
  const {
    isMobile,
    isMedium,
    breakpointRef,
    mainRef,
    handleBreakpointChange
  } = useResponsiveState();

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

  // Keyboard shortcuts
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

  // Auto-save hook
  useAutoSave();

  // Determine the effective scroll direction
  // In portrait/mobile mode, we force horizontal layout to allow vertical scrolling for content
  const effectiveScrollDirection = (isMedium || isMobile) ? 'horizontal' : scrollDirection;

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Handle scroll navigation
  useScrollNavigation({
    currentPageIndex,
    pagesLength: pages.length,
    setPageIndex,
    isAddModalOpen,
    effectiveScrollDirection
  });

  const handleToggleEdit = () => {
    // If we're currently editing, save before exiting edit mode
    if (isEditing) {
      saveConfig();
    }
    toggleEdit();
  };

  const handleLayoutChange = (currentLayout: { i?: string; x?: number; y?: number; w?: number; h?: number }[]) => { 
    if ((breakpointRef.current === 'lg' || breakpointRef.current === 'md') && !isMedium && !isMobile) {
      // Filter to only items with all required properties defined
      const validLayout = currentLayout.filter(
        (item): item is { i: string; x: number; y: number; w: number; h: number } => 
          item.i !== undefined && item.x !== undefined && item.y !== undefined && 
          item.w !== undefined && item.h !== undefined
      );
      updateLayout(validLayout, isMedium, isMobile);
    }
  };



  const getWidgetsForPage = (pageId: string) => {
    const pageWidgets = widgets.filter(w => w.pageId === pageId);
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
        {pages.map((page) => (
          <div 
            key={page.id} 
            className={`${styles.pageContainer} ${(isMedium || isMobile) ? styles.scrollable : ''}`}
          >
            <div className={styles.dashboard}>
              <DashboardGrid 
                items={getWidgetsForPage(page.id)}
                isEditing={isEditing && canEditDashboard} 
                onLayoutChange={handleLayoutChange} 
                onBreakpointChange={handleBreakpointChange}
                // layouts={getLayoutsForPage(page.id)} // Legacy RGL prop
                rowHeight={rowHeight}
                gap={gapSize}
                gs-no-move={(!isEditing || !canEditDashboard) ? "true" : "false"}
                gs-no-resize={(!isEditing || !canEditDashboard) ? "true" : "false"}
                isMedium={isMedium}
                isMobile={isMobile}
              >
                {getWidgetsForPage(page.id).map((widget) => (
                  <div 
                    key={widget.id} 
                    className="widget-candidate"
                    gs-id={widget.id}
                    gs-x={widget.grid.x}
                    gs-y={widget.grid.y}
                    gs-w={widget.grid.w}
                    gs-h={widget.grid.h}
                  >
                    <div className="grid-stack-item-content">
                      <WidgetRenderer 
                        widget={widget} 
                        isEditing={isEditing}
                        canEditDashboard={canEditDashboard}
                        onEdit={handleEditWidget}
                        showTitle={showWidgetNames}
                      />
                    </div>
                  </div>
                ))}
              </DashboardGrid>
            </div>
          </div>
        ))}
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
    </main>
  );
}
