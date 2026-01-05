"use client";

import React, { useState } from 'react';
import { FormProps } from '../types';
import styles from '../AddItemDialog.module.css';
import { IconSelector } from '../../ui/IconSelector';
import { useIntegrationStore } from '@/store/useIntegrationStore';

export const ShortcutForm: React.FC<FormProps> = ({ 
  initialData, 
  onSubmit, 
  onCancel,
  onDelete,
  isEditing,
  activeTab = 'configuration'
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [url, setUrl] = useState(initialData?.url || ''); // External URL
  const [internalUrl, setInternalUrl] = useState(initialData?.internalUrl || '');
  const [iconUrl, setIconUrl] = useState(initialData?.iconUrl || '');
  const [integrationId, setIntegrationId] = useState(initialData?.integrationId || '');

  const { integrations } = useIntegrationStore();

  const availableIntegrations = integrations; 

  // Handle integration selection with auto-fill
  const handleIntegrationChange = (newIntegrationId: string) => {
    setIntegrationId(newIntegrationId);
    
    if (newIntegrationId) {
      const integration = integrations.find(i => i.id === newIntegrationId);
      if (integration) {
        // Auto-fill only empty fields
        if (!name) setName(integration.name);
        if (integration.config.url) {
          if (!url) setUrl(integration.config.url as string);
          if (!internalUrl) setInternalUrl(integration.config.url as string);
        }
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      url,
      internalUrl,
      iconUrl,
      type: 'shortcut',
      integrationId: integrationId || undefined,
      w: initialData?.w || 1,
      h: initialData?.h || 1
    });
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          <div style={{ display: activeTab === 'configuration' ? 'block' : 'none' }}>
             {/* Integration Selection */}
             {availableIntegrations.length > 0 && (
               <div className={styles.section}>
                 <h3 className={styles.sectionTitle}>Integration</h3>
                 <div className={styles.formGroup}>
                    <label className={styles.label}>Link to Integration</label>
                    <select
                      className={styles.select}
                      value={integrationId}
                      onChange={(e) => handleIntegrationChange(e.target.value)}
                    >
                      <option value="">None</option>
                      {availableIntegrations.map(int => (
                        <option key={int.id} value={int.id}>
                          {int.name || int.config.url || 'Unnamed Integration'}
                        </option>
                      ))}
                    </select>
                 </div>
               </div>
             )}

             <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Shortcut Settings</h3>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name</label>
                <input 
                  className={styles.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. YouTube"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>External URL</label>
                <input 
                  className={styles.input}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Internal URL</label>
                <input 
                  className={styles.input}
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

        <div className={styles.actions}>
          {isEditing && onDelete && (
            <button 
              type="button" 
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={onDelete}
            >
              Delete
            </button>
          )}
          <button 
            type="button" 
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={!name || (!url && !internalUrl)}
          >
            {isEditing ? 'Save Changes' : 'Add Shortcut'}
          </button>
        </div>
      </form>
    </div>
  );
};
