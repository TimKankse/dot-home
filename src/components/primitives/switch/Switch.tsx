import React, { InputHTMLAttributes } from 'react';
import styles from './Switch.module.css';

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      onChange?.(e);
    };

    return (
      <label className={`${styles.label} ${className || ''}`}>
        <input 
          type="checkbox" 
          className={styles.input} 
          ref={ref} 
          onChange={handleChange}
          {...props} 
        />
        <div className={styles.switch}>
          <div className={styles.slider} />
        </div>
        {label && <span className={styles.labelText}>{label}</span>}
      </label>
    );
  }
);

Switch.displayName = 'Switch';
