import React, { ButtonHTMLAttributes } from 'react';
import { Plus } from 'lucide-react';
import styles from './FloatingActionButton.module.css';

interface FloatingActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottomRight' | 'bottomLeft' | 'topRight' | 'topLeft';
  icon?: React.ReactNode;
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    position = 'bottomRight',
    icon,
    children,
    disabled, 
    ...props 
  }, ref) => {
    
    return (
      <button
        ref={ref}
        className={`
          ${styles.fab} 
          ${styles[variant]} 
          ${styles[size]} 
          ${styles[position]}
          ${className || ''}
        `}
        disabled={disabled}
        {...props}
      >
        {icon || children || <Plus size={24} />}
      </button>
    );
  }
);

FloatingActionButton.displayName = 'FloatingActionButton';
