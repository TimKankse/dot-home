'use client';

import React from 'react';
import { useWidgetStore } from '@/store/useWidgetStore';
import { Widget } from '@/types/widget';
import { DefaultVariation } from './variations/DefaultVariation';
import { FolderVariation } from './variations/FolderVariation';

interface SectionWidgetProps {
  config?: {
    variant?: 'default' | 'folder';
    title?: string;
    shortcutIds?: string[];
  };
  isEditing?: boolean;
}

export const SectionWidget: React.FC<SectionWidgetProps & { id?: string }> = ({ config, isEditing, id }) => {
  const variant = config?.variant || 'default';
  const shortcutIds = config?.shortcutIds || [];
  const { widgets } = useWidgetStore();
  const sectionWidget = widgets.find(widget => widget.id === id);
  const pageId = sectionWidget?.pageId;

  // Resolve shortcut IDs to full Widget objects
  const shortcuts: Widget[] = shortcutIds
    .map(shortcutId => widgets.find(w => w.id === shortcutId))
    .filter((w): w is Widget => !!w);

  if (variant === 'folder') {
    return (
      <FolderVariation
        title={config?.title || 'Folder'}
        shortcuts={shortcuts}
        isEditing={isEditing}
        sectionId={id}
        pageId={pageId}
      />
    );
  }

  return (
    <DefaultVariation
      title={config?.title || 'Section'}
      shortcuts={shortcuts}
      isEditing={isEditing}
      sectionId={id}
      pageId={pageId}
    />
  );
};
