import React from 'react';
import styles from './SpacerWidget.module.css';

interface SpacerWidgetProps {
  isEditing?: boolean;
}

export const SpacerWidget: React.FC<SpacerWidgetProps> = ({ isEditing }) => {
  if (!isEditing) {
    return <div className={styles.spacer} />;
  }

  return (
    <div className={`${styles.spacer} ${styles.editing}`}>
      <span className={styles.label}>Spacer</span>
    </div>
  );
};
