import React from 'react';
import styles from './WidgetWrapper.module.css';
import { Settings } from 'lucide-react';

interface WidgetWrapperProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  title?: string;
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
  title,
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
      {(title || icon) && (
        <div className={styles.header}>
          {icon && <div className={styles.icon}>{icon}</div>}
          {title && <h2 className={styles.title}>{title}</h2>}
        </div>
      )}
      
      <div className={`${styles.content} ${contentClassName}`}>
        {children}
      </div>

      {footer && (
        <div className={styles.footer}>
          {footer}
        </div>
      )}
    </div>
  );
};
