"use client";

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Puzzle } from 'lucide-react';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import { Integration } from '@/types/integration';
import { usePersistenceStore } from '@/store/usePersistenceStore';
import { v4 as uuidv4 } from 'uuid';
import { IconSelector } from '../ui/IconSelector';
import styles from './SettingsDialog.module.css';

const INTEGRATION_TYPES = [
  { value: 'jellyfin', label: 'Jellyfin' },
  { value: 'sonarr', label: 'Sonarr' },
  { value: 'radarr', label: 'Radarr' },
  { value: 'portainer', label: 'Portainer' },
  { value: 'netdata', label: 'Netdata' },
  { value: 'generic', label: 'Generic' },
];

export const IntegrationsSettings: React.FC = () => {
  // Integration store
  const { 
    integrations, 
    addIntegration, 
    updateIntegration,
    removeIntegration
  } = useIntegrationStore();

  // Persistence store  
  const { saveConfig } = usePersistenceStore();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newIntegration, setNewIntegration] = useState<Partial<Integration>>({
    name: '',
    type: 'generic',
    config: {}
  });

  // Form state
  const [url, setUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);

  const handleSaveIntegration = () => {
    if (!newIntegration.name || !newIntegration.type) return;

    const config: Record<string, any> = {};
    if (url) config.url = url;
    if (externalUrl) config.externalUrl = externalUrl;
    if (apiKey) config.apiKey = apiKey;
    if (username) config.username = username;
    if (password) config.password = password;
    if (iconUrl) config.iconUrl = iconUrl;
    
    customFields.forEach(field => {
      if (field.key && field.value) {
        config[field.key] = field.value;
      }
    });

    if (editingId) {
      updateIntegration(editingId, {
        name: newIntegration.name,
        type: newIntegration.type,
        config
      });
    } else {
      const integration: Integration = {
        id: uuidv4(),
        name: newIntegration.name!,
        type: newIntegration.type!,
        config
      };
      addIntegration(integration);
    }

    saveConfig();
    resetForm();
  };

  const handleEdit = (integration: Integration) => {
    setIsAdding(true);
    setEditingId(integration.id);
    setNewIntegration({
      name: integration.name,
      type: integration.type,
      config: integration.config
    });

    setUrl(integration.config.url || '');
    setExternalUrl(integration.config.externalUrl || '');
    setApiKey(integration.config.apiKey || '');
    setUsername(integration.config.username || '');
    setPassword(integration.config.password || '');
    setIconUrl(integration.config.iconUrl || '');

    const standardKeys = ['url', 'externalUrl', 'apiKey', 'username', 'password', 'iconUrl'];
    const custom = Object.entries(integration.config)
      .filter(([key]) => !standardKeys.includes(key))
      .map(([key, value]) => ({ key, value: String(value) }));
    setCustomFields(custom);
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewIntegration({ name: '', type: 'generic', config: {} });
    setUrl('');
    setExternalUrl('');
    setApiKey('');
    setUsername('');
    setPassword('');
    setIconUrl('');
    setCustomFields([]);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this integration?')) {
      removeIntegration(id);
      saveConfig();
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    const newFields = [...customFields];
    newFields[index][field] = value;
    setCustomFields(newFields);
  };

  const removeCustomField = (index: number) => {
    const newFields = customFields.filter((_, i) => i !== index);
    setCustomFields(newFields);
  };

  return (
    <>
      {!isAdding ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
            <button 
              onClick={() => setIsAdding(true)} 
              className={`${styles.button} ${styles.primaryButton}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} /> Add Integration
            </button>
          </div>
          <div className={styles.integrationList}>
            {integrations.map((integration) => (
              <div key={integration.id} className={styles.integrationItem}>
                <div className={styles.integrationInfo}>
                  <span className={styles.integrationName}>{integration.name}</span>
                  <span className={styles.integrationType}>
                    {INTEGRATION_TYPES.find(t => t.value === integration.type)?.label || integration.type}
                    {integration.config.url && ` • ${integration.config.url}`}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button 
                    onClick={() => handleEdit(integration)} 
                    className={styles.iconButton}
                  >
                    <Pencil size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(integration.id)} 
                    className={`${styles.iconButton} ${styles.danger}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {integrations.length === 0 && (
              <div className={styles.emptyState}>
                <Puzzle size={32} className={styles.emptyStateIcon} />
                <p>No integrations configured yet.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.7 }}>Click &quot;Add Integration&quot; to get started.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.form}>
          <h3 className={styles.sectionTitle}>
            {editingId ? 'Edit Integration' : 'New Integration'}
          </h3>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Name</label>
            <input 
              className={styles.input}
              value={newIntegration.name}
              onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
              placeholder="e.g. Home Jellyfin"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Custom Icon (Optional)</label>
            <IconSelector 
              iconUrl={iconUrl} 
              onIconSelect={setIconUrl} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Type</label>
            <select 
              className={styles.select}
              value={newIntegration.type}
              onChange={(e) => setNewIntegration({ ...newIntegration, type: e.target.value })}
            >
              {INTEGRATION_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>URL (Internal)</label>
            <input 
              className={styles.input}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.100:8096"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>External URL</label>
            <input 
              className={styles.input}
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://jellyfin.example.com"
            />
          </div>

          {['jellyfin', 'sonarr', 'radarr', 'netdata'].includes(newIntegration.type || '') && (
            <div className={styles.formGroup}>
              <label className={styles.label}>API Key / Token</label>
              <input 
                className={styles.input}
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Secret API Key"
              />
            </div>
          )}

          {['portainer'].includes(newIntegration.type || '') && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Username</label>
                <input 
                  className={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Password</label>
                <input 
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}

          <hr className={styles.divider} />
          
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label className={styles.label} style={{ marginBottom: 0 }}>Custom Fields</label>
              <button 
                onClick={addCustomField}
                className={`${styles.button} ${styles.secondaryButton}`}
                style={{ fontSize: '0.8rem', padding: '4px 12px', height: 'auto' }}
              >
                <Plus size={12} style={{ marginRight: '4px' }} /> Add Field
              </button>
            </div>
            
            {customFields.map((field, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input 
                  className={styles.input}
                  value={field.key}
                  onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                  placeholder="Field Name"
                  style={{ flex: 1 }}
                />
                <input 
                  className={styles.input}
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                  placeholder="Value"
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={() => removeCustomField(index)}
                  className={styles.iconButton}
                  style={{ color: 'var(--accent-red)' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
            <button 
              onClick={resetForm} 
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveIntegration} 
              className={`${styles.button} ${styles.primaryButton}`}
            >
              {editingId ? 'Update Integration' : 'Save Integration'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
