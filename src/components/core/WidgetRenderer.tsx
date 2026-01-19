'use client';

import React from 'react';
import { Widget } from '@/types/widget';
import { WidgetWrapper } from '@/components/core/WidgetWrapper';
import { WIDGET_REGISTRY, getWidgetTypeFromWidget } from '@/features/widgets';
import { AppShortcutWidget } from '@/components/widgets/shortcut/AppShortcutWidget';
import { SpacerWidget } from '@/components/widgets/spacer/SpacerWidget';

interface WidgetRendererProps {
  widget: Widget;
  isEditing: boolean;
  canEditDashboard?: boolean;
  onEdit: (widget: Widget) => void;
  showTitle?: boolean;
}

export const WidgetRenderer: React.FC<WidgetRendererProps> = ({ 
  widget, 
  isEditing, 
  canEditDashboard = true, 
  onEdit, 
  showTitle = true 
}) => {
  const widgetType = getWidgetTypeFromWidget(widget);
  
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

  const getTitle = (defaultTitle?: string) => 
    showTitle ? (widget.name || defaultTitle) : undefined;

  const handleEdit = canConfigureWidget ? () => onEdit(widget) : undefined;

  // Special case: Shortcut widget has its own wrapper
  if (widgetType === 'shortcut') {
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

  // Special case: Spacer has transparent styling when not editing
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
      title={getTitle(definition.defaultTitle)} 
      icon={icon}
      isEditing={isEditing} 
      onEdit={handleEdit}
    >
      <WidgetComponent 
        config={widget.config} 
        integrationId={widget.integrationId}
        isEditing={isEditing}
      />
    </WidgetWrapper>
  );
};
