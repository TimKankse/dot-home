import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './SearchableSelect.module.css';

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: (Option | string)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  renderOption?: (option: Option) => React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({ 
  options, 
  value, 
  onChange, 
  placeholder = 'Select...', 
  icon,
  disabled = false,
  renderOption
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to object array
  const formattedOptions: Option[] = options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );

  const selectedOption = formattedOptions.find(opt => opt.value === value);

  const filteredOptions = formattedOptions.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className={`${styles.container} ${disabled ? styles.disabled : ''}`} ref={containerRef}>
      <div 
        className={`${styles.trigger} ${isOpen ? styles.active : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {icon && <span className={styles.icon}>{icon}</span>}
          {selectedOption ? (
            <span className={styles.value}>{selectedOption.label}</span>
          ) : (
            <span className={styles.value} style={{ color: value ? 'inherit' : 'var(--text-dim)' }}>
              {value || placeholder}
            </span>
          )}
        </div>
        <ChevronDown size={14} className={styles.chevron} />
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <input
            className={styles.searchInput}
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            onClick={e => e.stopPropagation()}
          />
          <div className={styles.optionsList}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div 
                  key={opt.value}
                  className={`${styles.option} ${opt.value === value ? styles.selected : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {renderOption ? renderOption(opt) : opt.label}
                </div>
              ))
            ) : (
              <div className={styles.noResults}>No results found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
