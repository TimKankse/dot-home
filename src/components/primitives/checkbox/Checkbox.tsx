import React, { InputHTMLAttributes } from 'react';
import styles from './Checkbox.module.css';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
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
        <div className={styles.checkbox}>
           <Check size={14} className={styles.checkmark} strokeWidth={3} />
        </div>
        {label && <span className={styles.labelText}>{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
