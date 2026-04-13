"use client";

import React, { useState, useEffect } from 'react';
import { FormProps } from '../types';
import styles from '../ItemEditorDialog.module.css';
import { IconSelector } from '../../ui/IconSelector';
import { Input } from '../../primitives/input';
import { Select } from '../../primitives/select';
import { useIntegrationStore } from '@/store/useIntegrationStore';

export const ShortcutForm: React.FC<FormProps> = ({ 
  initialData, 
  onSubmit, 
  activeTab = 'configuration',
  formId,
  onValidityChange
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [url, setUrl] = useState(initialData?.url || ''); // External URL
  const [internalUrl, setInternalUrl] = useState(initialData?.internalUrl || '');
  const [iconUrl, setIconUrl] = useState(initialData?.iconUrl || '');
  const [integrationId, setIntegrationId] = useState(initialData?.integrationId || '');

  const { integrations } = useIntegrationStore();

  const availableIntegrations = integrations; 

  const handleIntegrationChange = (newIntegrationId: string) => {
    setIntegrationId(newIntegrationId);
    
    if (newIntegrationId) {
      const integration = integrations.find(i => i.id === newIntegrationId);
      if (integration) {
        if (!name) setName(integration.name);
        // Safely access url which may not exist on all integration types
        const configUrl = (integration.config as { url?: string }).url;
        if (configUrl) {
          if (!url) setUrl(configUrl);
          if (!internalUrl) setInternalUrl(configUrl);
        }
      }
    }
  };

  useEffect(() => {
    onValidityChange?.(Boolean(name && (url || internalUrl)));
  }, [name, url, internalUrl, onValidityChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      url,
      internalUrl,
      iconUrl,
      type: 'shortcut',
      integrationId: integrationId || undefined,
      isSelfHosted: Boolean(internalUrl),
      w: initialData?.w || 1,
      h: initialData?.h || 1
    });
  };

  return (
    <div className={styles.formContainer}>
      <form id={formId} onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          <div style={{ display: activeTab === 'configuration' ? 'block' : 'none' }}>
             {availableIntegrations.length > 0 && (
               <div className={styles.section}>
                 <h3 className={styles.sectionTitle}>Integration</h3>
                 <div className={styles.formGroup}>
                    <label className={styles.label}>Link to Integration</label>
                    <Select
                      options={[
                        { value: '', label: 'None' },
                        ...availableIntegrations.map(int => ({
                          value: int.id,
                          label: int.name || (int.config as { url?: string }).url || 'Unnamed Integration'
                        }))
                      ]}
                      value={integrationId}
                      onChange={(val) => handleIntegrationChange(val)}
                      className={styles.fullWidthSelect}
                    />
                 </div>
               </div>
             )}

             <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Shortcut Settings</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. YouTube"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>External URL</label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Internal URL</label>
                <Input
                  value={internalUrl}
                  onChange={(e) => setInternalUrl(e.target.value)}
                  placeholder="http://192.168.1.x:port"
                  type="url"
                />
              </div>
             </div>
          </div>

          <div style={{ display: activeTab === 'appearance' ? 'block' : 'none' }}>


              <div className={styles.formGroup}>
                <label className={styles.label}>Icon</label>
                <IconSelector 
                  iconUrl={iconUrl} 
                  onIconSelect={setIconUrl} 
                />
              </div>
          </div>
        </div>

      </form>
    </div>
  );
};
