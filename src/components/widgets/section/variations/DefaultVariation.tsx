import React from 'react';
import { Widget } from '@/types/widget';
import { ShortcutCollection } from '../ShortcutCollection';
import styles from '../SectionWidget.module.css';

interface DefaultVariationProps {
  title: string;
  shortcuts: Widget[];
  isEditing?: boolean;
  sectionId?: string;
  pageId?: string;
}

export const DefaultVariation: React.FC<DefaultVariationProps> = ({
  title,
  shortcuts,
  isEditing,
  sectionId,
  pageId,
}) => {
  return (
    <div className={styles.sectionContainer}>
      <div
        className={styles.sectionTitle}
        style={{ fontFamily: 'var(--font-gloock-serif)' }}
      >
        {title}
      </div>

      <ShortcutCollection
        sectionId={sectionId || ''}
        pageId={pageId}
        shortcuts={shortcuts}
        isEditing={isEditing}
        emptyState={isEditing ? 'Drag shortcuts here' : 'No shortcuts'}
      />
    </div>
  );
};
