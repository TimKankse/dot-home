import React from 'react';
import styles from './ToggleGroup.module.css';

interface ToggleOption {
  value: string;
  label: React.ReactNode;
}

interface ToggleGroupProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export const ToggleGroup: React.FC<ToggleGroupProps> = ({
  options,
  value,
  onChange,
  className = '',
  fullWidth = false,
}) => {
  return (
    <div className={`${styles.group} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.item} ${value === option.value ? styles.active : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};
