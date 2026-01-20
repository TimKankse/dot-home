'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Link2, Unlink } from 'lucide-react';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import type { IntegrationType, Integration } from '@/types';
import styles from './IntegrationSelect.module.css';

interface IntegrationSelectProps {
  /** Filter to integrations of this type */
  type: IntegrationType;
  /** Currently selected integration ID */
  value?: string;
  /** Called when selection changes */
  onChange: (integrationId: string | undefined) => void;
  /** Placeholder text when nothing selected */
  placeholder?: string;
  /** Whether the select is disabled */
  disabled?: boolean;
}

export const IntegrationSelect: React.FC<IntegrationSelectProps> = ({
  type,
  value,
  onChange,
  placeholder = 'Select integration...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Select raw integrations array (stable reference) and filter with useMemo
  // to avoid infinite loop from calling filter inside selector
  const allIntegrations = useIntegrationStore((s) => s.integrations);
  const integrations = useMemo(
    () => allIntegrations.filter((i) => i.type === type),
    [allIntegrations, type]
  );
  const selectedIntegration = integrations.find((i) => i.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (integration: Integration | undefined) => {
    onChange(integration?.id);
    setIsOpen(false);
  };

  const handleUseCustom = () => {
    onChange(undefined);
    setIsOpen(false);
  };

  const getIntegrationUrl = (integration: Integration): string | undefined => {
    const config = integration.config as Record<string, unknown>;
    return config.url as string | undefined;
  };

  return (
    <div className={styles.container} ref={containerRef} style={{ position: 'relative' }}>
      <div 
        className={`${styles.trigger} ${isOpen ? styles.active : ''} ${disabled ? styles.disabled : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className={styles.triggerContent}>
          <span className={styles.icon}>
            <Link2 size={14} />
          </span>
          
          {selectedIntegration ? (
            <div className={styles.selectedInfo}>
              <span className={styles.selectedName}>{selectedIntegration.name}</span>
              {getIntegrationUrl(selectedIntegration) && (
                <span className={styles.selectedUrl}>{getIntegrationUrl(selectedIntegration)}</span>
              )}
            </div>
          ) : value === undefined ? (
            <span className={styles.placeholder}>{placeholder}</span>
          ) : (
            <>
              <span className={styles.placeholder}>Custom configuration</span>
              <span className={styles.customBadge}>Manual</span>
            </>
          )}
        </div>
        <ChevronDown size={14} className={styles.chevron} />
      </div>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.optionsList}>
            {integrations.length > 0 ? (
              <>
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className={`${styles.option} ${integration.id === value ? styles.selected : ''}`}
                    onClick={() => handleSelect(integration)}
                  >
                    <Link2 size={14} />
                    <div className={styles.optionInfo}>
                      <span className={styles.optionName}>{integration.name}</span>
                      {getIntegrationUrl(integration) && (
                        <span className={styles.optionUrl}>{getIntegrationUrl(integration)}</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className={styles.divider} />
              </>
            ) : (
              <div className={styles.noIntegrations}>
                No {type} integrations saved yet
              </div>
            )}
            
            <div 
              className={`${styles.option} ${styles.actionOption}`}
              onClick={handleUseCustom}
            >
              <Unlink size={14} />
              <span>Use custom configuration</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
