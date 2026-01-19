import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'ghost' | 'outline' | 'solid';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  active?: boolean;
  rounded?: boolean;
  icon?: React.ReactNode;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ 
    className, 
    variant = 'ghost', 
    size = 'md', 
    loading = false, 
    active = false,
    rounded = false,
    icon,
    children, 
    disabled, 
    ...props 
  }, ref) => {
    
    return (
      <button
        ref={ref}
        className={`
          ${styles.iconButton} 
          ${styles[variant]} 
          ${styles[size]} 
          ${active ? styles.active : ''} 
          ${rounded ? styles.rounded : ''}
          ${className || ''}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className={styles.spinner} size={size === 'sm' ? 14 : size === 'lg' ? 24 : 18} />
        ) : (
          icon || children
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
