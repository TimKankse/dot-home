import React, { LabelHTMLAttributes } from 'react';
import styles from './Label.module.css';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label: React.FC<LabelProps> = ({ className, children, required, ...props }) => {
  return (
    <label 
      className={`${styles.label} ${required ? styles.required : ''} ${className || ''}`} 
      {...props}
    >
      {children}
    </label>
  );
};
