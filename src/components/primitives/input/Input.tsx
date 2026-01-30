import React, { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string; // Optional built-in label support for convenience
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightIcon, error, label, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = props.type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : props.type;
    const hasRightElement = rightIcon || isPassword;

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
              ${hasRightElement ? styles.hasRightIcon : ''}
              ${error ? styles.errorInput : ''}
              ${className || ''}
            `}
            {...props}
            type={inputType}
          />
          {isPassword ? (
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : (
            rightIcon && <div className={styles.rightIcon}>{rightIcon}</div>
          )}
        </div>
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
