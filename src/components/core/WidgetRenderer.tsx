'use client';

import React from 'react';
import { Widget } from '@/types/widget';
import { WidgetWrapper } from '@/components/core/WidgetWrapper';
import { WIDGET_REGISTRY, getWidgetTypeFromWidget } from '@/features/widgets';
import { AppShortcutWidget } from '@/components/widgets/shortcut/AppShortcutWidget';
import { SpacerWidget } from '@/components/widgets/spacer/SpacerWidget';
import { useShortcutDragStore } from '@/store/useShortcutDragStore';

interface WidgetRendererProps {
  widget: Widget;
  isEditing: boolean;
  canEditDashboard?: boolean;
  onEdit: (widget: Widget) => void;
  showWidgetNames?: boolean;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ 
  widget, 
  isEditing, 
  canEditDashboard = true, 
  onEdit, 
  showWidgetNames = true 
}) => {
  const widgetType = getWidgetTypeFromWidget(widget);
  const activeShortcutDragId = useShortcutDragStore(state => state.activeDrag?.shortcutId ?? null);
  
  if (!widgetType) {
    return null;
  }

  const definition = WIDGET_REGISTRY[widgetType];
  const canConfigureWidget = canEditDashboard || widget.syncConfig === false;
  
  const icon = widget.iconUrl ? (
    <img 
      src={widget.iconUrl} 
      alt="icon" 
      style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4 }} 
    />
  ) : undefined;

  const widgetName = showWidgetNames ? definition.displayName : undefined;

  const handleEdit = canConfigureWidget ? () => onEdit(widget) : undefined;

  if (widgetType === 'shortcut') {
    if (activeShortcutDragId === widget.id) {
      return <div style={{ height: '100%', visibility: 'hidden' }} />;
    }

    return (
      <AppShortcutWidget 
        name={widget.name || ''} 
        url={widget.url || ''} 
        iconUrl={widget.iconUrl}
        isSelfHosted={widget.isSelfHosted} 
        internalUrl={widget.internalUrl} 
        config={widget.config}
        isEditing={isEditing}
        onEdit={handleEdit}
      />
    );
  }

  if (widgetType === 'spacer') {
    return (
      <WidgetWrapper 
        isEditing={isEditing} 
        onEdit={handleEdit} 
        style={!isEditing ? { 
          background: 'transparent', 
          border: 'none', 
          boxShadow: 'none',
          pointerEvents: 'none'
        } : undefined}
      >
        <SpacerWidget isEditing={isEditing} />
      </WidgetWrapper>
    );
  }

  const WidgetComponent = definition.component;

  return (
    <WidgetWrapper 
      widgetName={widgetName}
      icon={icon}
      isEditing={isEditing} 
      onEdit={handleEdit}
    >
      <WidgetComponent 
        config={widget.config} 
        integrationId={widget.integrationId}
        isEditing={isEditing}
        id={widget.id}
        title={widget.name}
      />
    </WidgetWrapper>
  );
};
