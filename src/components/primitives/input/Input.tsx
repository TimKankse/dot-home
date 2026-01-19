import React, { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string; // Optional built-in label support for convenience
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, label, ...props }, ref) => {
    return (
      <div className={styles.container}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={styles.wrapper}>
          {leftIcon && <div className={styles.leftIcon}>{leftIcon}</div>}
          <input
            ref={ref}
            autoComplete="new-password"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            className={`
              ${styles.input} 
              ${leftIcon ? styles.hasLeftIcon : ''} 
              ${rightIcon ? styles.hasRightIcon : ''}
              ${error ? styles.errorInput : ''}
              ${className || ''}
            `}
            {...props}
          />
          {rightIcon && <div className={styles.rightIcon}>{rightIcon}</div>}
        </div>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
