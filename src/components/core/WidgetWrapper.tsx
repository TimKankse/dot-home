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
  return (
    <div className={`${styles.card} ${className}`} style={style}>
      {isEditing && onEdit && (
        <button 
          className={`${styles.configButton} nodrag`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            zIndex: 20,
            background: 'rgba(0,0,0,0.6)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
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
      
      <div className={`${styles.content} ${contentClassName}`}>
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
