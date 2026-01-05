import { useState } from 'react';
import { useWidgetStore } from "@/store/useWidgetStore";
import { Widget, NewWidgetInput, WidgetConfig } from "@/types/widget";
import { usePageStore } from "@/store/usePageStore";
import { NewItem } from "@/components/add-item/types";

export function useWidgetManager() {
  const { 
    updateWidget, 
    removeWidget, 
    addWidget,
    findAvailablePosition
  } = useWidgetStore();

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
      integrationId: widget.integrationId
    };
    setEditingItem(itemToEdit);
    setIsAddModalOpen(true);
  };

  const handleUpdateWidget = (id: string, updates: Partial<NewItem>) => {
    // Map NewItem updates back to Widget updates
    const widgetUpdates: Partial<Widget> = {
      name: updates.name,
      url: updates.url,
      iconUrl: updates.iconUrl,
      internalUrl: updates.internalUrl,
      isSelfHosted: updates.isSelfHosted,
      widgetType: updates.widgetType,
      config: updates.config
    };
    updateWidget(id, widgetUpdates);
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

    const widgetInput: NewWidgetInput = {
      ...newItem,
      type: newItem.type,
      x: position.x,
      y: position.y,
      w,
      h,
      pageId: currentPageId,
      config: newItem.config as WidgetConfig // Cast config to any or WidgetConfig to satisfy the interface. simpler to use any here for the looser input type.
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
