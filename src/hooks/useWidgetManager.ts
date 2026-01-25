import { useState } from 'react';
import { useWidgetStore } from "@/store/useWidgetStore";
import { usePersistenceStore } from "@/store/usePersistenceStore";
import { Widget, NewWidgetInput, WidgetConfig } from "@/types/widget";
import { usePageStore } from "@/store/usePageStore";
import { NewItem } from "@/components/item-editor/types";

export function useWidgetManager() {
  const { 
    updateWidget, 
    removeWidget, 
    addWidget,
    findAvailablePosition,
    widgets
  } = useWidgetStore();

  const { canEditDashboard } = usePersistenceStore();
  const { pages, currentPageIndex } = usePageStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewItem | undefined>(undefined);

  const handleEditWidget = (widget: Widget) => {
    // Map Widget to NewItem format for the modal
    const itemToEdit: NewItem = {
      id: widget.id,
      type: widget.type === 'shortcut' ? 'shortcut' : 'widget',
      name: widget.name,
      url: widget.url,
      iconUrl: widget.iconUrl,
      internalUrl: widget.internalUrl,
      isSelfHosted: widget.isSelfHosted,
      widgetType: widget.type === 'shortcut' ? undefined : widget.type,
      w: widget.grid.w,
      h: widget.grid.h,
      config: widget.config,
      integrationId: widget.integrationId,
      syncConfig: widget.syncConfig
    };
    setEditingItem(itemToEdit);
    setIsAddModalOpen(true);
  };

  const handleUpdateWidget = async (id: string, updates: Partial<NewItem>) => {
    // Check if this is a per-user config update (viewer editing non-synced widget)
    const widget = widgets.find(w => w.id === id);
    const isPerUserConfig = !canEditDashboard && widget?.syncConfig === false;

    if (isPerUserConfig && updates.config) {
      // Save to per-user config API instead of dashboard layout
      try {
        await fetch(`/api/widgets/${id}/config`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: updates.config }),
        });
        // Update local state for immediate feedback
        updateWidget(id, { config: updates.config });
      } catch (error) {
        console.error('Failed to save per-user widget config:', error);
      }
    } else {
      // Normal dashboard edit - save to layout
      const widgetUpdates: Partial<Widget> = {
        name: updates.name,
        url: updates.url,
        iconUrl: updates.iconUrl,
        internalUrl: updates.internalUrl,
        isSelfHosted: updates.isSelfHosted,
        widgetType: updates.widgetType,
        config: updates.config,
        syncConfig: updates.syncConfig,
        integrationId: updates.integrationId
      };
      updateWidget(id, widgetUpdates);
    }
    
    setIsAddModalOpen(false);
    setEditingItem(undefined);
  };

  const handleDeleteWidget = (id: string) => {
    removeWidget(id);
    setIsAddModalOpen(false);
    setEditingItem(undefined);
  };

  const handleAdd = (newItem: NewItem, isMedium: boolean, isMobile: boolean) => {
    const currentPageId = pages[currentPageIndex]?.id;
    if (!currentPageId) return;

    // Check if there's space available for the new widget
    // Default to 1x1 if not specified (e.g. for shortcuts)
    const w = newItem.w || 1;
    const h = newItem.h || 1;
    const position = findAvailablePosition(currentPageId, w, h, isMedium, isMobile);
    
    if (!position) {
      alert('No space available on this page for a widget of this size. Please remove some widgets or try a smaller size.');
      return;
    }

    if (!newItem.type) return;

    // Destructure id out since this is for new widgets (id should be generated)
    const { id: _existingId, ...itemWithoutId } = newItem;

    const widgetInput: NewWidgetInput = {
      ...itemWithoutId,
      id: crypto.randomUUID(), // Generate new ID for new widgets
      type: newItem.type,
      x: position.x,
      y: position.y,
      w,
      h,
      pageId: currentPageId,
      config: newItem.config as WidgetConfig
    };

    addWidget(widgetInput);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setEditingItem(undefined);
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  }

  return {
    isAddModalOpen,
    editingItem,
    handleEditWidget,
    handleUpdateWidget,
    handleDeleteWidget,
    handleAdd,
    closeAddModal,
    openAddModal
  };
}
