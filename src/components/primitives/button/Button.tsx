import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    leftIcon, 
    rightIcon, 
    children, 
    disabled, 
    ...props 
  }, ref) => {
    
    return (
      <button
        ref={ref}
        className={`${styles.button} ${styles[variant]} ${styles[size]} ${loading ? styles.loading : ''} ${className || ''}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className={styles.spinner} size={size === 'sm' ? 14 : 16} />}
        {!loading && leftIcon}
        {(!loading || children) && children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
