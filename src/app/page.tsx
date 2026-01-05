"use client";

import React, { useState, useEffect } from 'react';
import styles from "./page.module.css";
import { WidgetRenderer } from "@/components/WidgetRenderer";
import { DashboardGrid } from "@/components/DashboardGrid";
import { UIControls } from "@/components/ui/UIControls";
import { AddItemDialog } from "@/components/add-item/AddItemDialog";
import { SettingsModal } from '@/components/settings/SettingsModal';
import { usePersistenceStore } from "@/store/usePersistenceStore";
import { useWidgetStore } from "@/store/useWidgetStore";
import { usePageStore } from "@/store/usePageStore";
import { PageIndicators } from "@/components/ui/PageIndicators";
import { useScrollNavigation } from "@/hooks/useScrollNavigation";
import { useResponsiveState } from "@/hooks/useResponsiveState";
import { useWidgetManager } from "@/hooks/useWidgetManager";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { getResponsiveLayout } from "@/utils/gridUtils";
import { NewWidgetInput } from "@/types/widget";

export default function Home() {
  // Persistence store
  const { 
    isEditing, 
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
    setPageIndex,
    setScrollDirection
  } = usePageStore();

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

  const handleLayoutChange = (currentLayout: any[]) => { 
    if ((breakpointRef.current === 'lg' || breakpointRef.current === 'md') && !isMedium && !isMobile) {
      updateLayout(currentLayout, isMedium, isMobile);
    }
  };

  const toggleScrollDirection = () => {
    setScrollDirection(scrollDirection === 'vertical' ? 'horizontal' : 'vertical');
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
      <main ref={mainRef} style={{ overflow: 'hidden', width: '100%', height: '100dvh', position: 'relative' }}>
      <PageIndicators />
      
      <div style={{
        display: 'flex',
        flexDirection: effectiveScrollDirection === 'vertical' ? 'column' : 'row',
        transform: effectiveScrollDirection === 'vertical' 
          ? `translateY(-${currentPageIndex * 100}dvh)` 
          : `translateX(-${currentPageIndex * 100}vw)`,
        transition: 'transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1.0)',
        width: effectiveScrollDirection === 'vertical' ? '100%' : `${pages.length * 100}%`,
        height: effectiveScrollDirection === 'vertical' ? `${pages.length * 100}dvh` : '100dvh'
      }}>
        {pages.map((page) => (
          <div key={page.id} style={{ 
            width: '100%', 
            height: '100dvh', 
            overflowY: (isMedium || isMobile) ? 'auto' : 'hidden',
            overflowX: 'hidden',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div className={styles.dashboard}>
              <DashboardGrid 
                items={getWidgetsForPage(page.id)}
                isEditing={isEditing} 
                onLayoutChange={handleLayoutChange} 
                onBreakpointChange={handleBreakpointChange}
                // layouts={getLayoutsForPage(page.id)} // Legacy RGL prop
                rowHeight={106}
                gs-no-move={!isEditing ? "true" : "false"}
                gs-no-resize={!isEditing ? "true" : "false"}
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
                        onEdit={handleEditWidget} 
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
        onToggleEdit={handleToggleEdit} 
        onAdd={openAddModal}
        onSave={saveConfig}
        onAddPage={addPage}
        onToggleScrollDirection={toggleScrollDirection}
        scrollDirection={scrollDirection}
        saveStatus={saveStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <AddItemDialog
        key={editingItem?.id || 'new'}
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onAdd={(newItem) => handleAdd(newItem as unknown as NewWidgetInput, isMedium, isMobile)}
        onEdit={handleUpdateWidget}
        onDelete={handleDeleteWidget}
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
