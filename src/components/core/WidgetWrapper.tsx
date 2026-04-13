import React from 'react';
import styles from './WidgetWrapper.module.css';
import { Settings } from 'lucide-react';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface WidgetWrapperProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  widgetName?: string;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  isEditing?: boolean;
  onEdit?: () => void;
}

export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  children,
  className = '',
  contentClassName = '',
  style,
  widgetName,
  icon,
  footer,
  isEditing = false,
  onEdit,
}) => {
  const showConfigButton = isEditing && Boolean(onEdit);

  return (
    <div className={`${styles.card} ${className}`} style={style}>
      {showConfigButton && (
        <button
          type="button"
          className={`${styles.configButton} nodrag`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          aria-label={`Configure ${widgetName ?? 'widget'}`}
        >
          <Settings size={16} />
        </button>
      )}
      {(widgetName || icon) && (
        <div className={styles.header}>
          {icon && <div className={styles.icon}>{icon}</div>}
          {widgetName && <span className={styles.widgetName}>{widgetName}</span>}
        </div>
      )}
      
      <div className={`${styles.content} ${contentClassName}`.trim()}>
        <WidgetErrorBoundary>
          {children}
        </WidgetErrorBoundary>
      </div>

      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
};
