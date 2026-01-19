import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  name?: string; // For form compatibility if needed
}

export const Select: React.FC<SelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select option...', 
  icon, 
  disabled = false,
  className = '',
  name
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div 
      className={`${styles.selectWrapper} ${className}`} 
      ref={containerRef}
    >
      <div
        className={`${styles.trigger} ${isOpen ? styles.active : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={name ? `${name}-listbox` : 'select-listbox'}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        <div className={styles.content}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <span className={styles.value}>
            {selectedOption ? (
              <span className={styles.content}>
                {selectedOption.icon && <span className={styles.icon}>{selectedOption.icon}</span>}
                {selectedOption.label}
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
            )}
          </span>
        </div>
        <ChevronDown 
          size={16} 
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`} 
        />
      </div>

      {isOpen && (
        <div 
          className={styles.dropdown} 
          role="listbox"
          id={name ? `${name}-listbox` : 'select-listbox'}
        >
          {options.map((option) => (
            <div
              key={option.value}
              className={`${styles.option} ${option.value === value ? styles.selected : ''}`}
              onClick={() => handleSelect(option.value)}
              role="option"
              aria-selected={option.value === value}
            >
              <div className={styles.content}>
                {option.icon && <span className={styles.icon}>{option.icon}</span>}
                {option.label}
              </div>
            </div>
          ))}
          {options.length === 0 && (
            <div className={styles.option} style={{ cursor: 'default' }}>
              No options
            </div>
          )}
        </div>
      )}
      
      {/* Hidden input for form submission if needed */}
      {name && <input type="hidden" name={name} value={value} />}
    </div>
  );
};
