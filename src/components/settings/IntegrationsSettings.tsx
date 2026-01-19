"use client";

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Link2, ArrowLeft, Check } from 'lucide-react';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import { 
  Integration, 
  IntegrationType, 
  INTEGRATION_TYPE_META,
  getIntegrationTypeMeta 
} from '@/types/integration';
import { usePersistenceStore } from '@/store/usePersistenceStore';
import { v4 as uuidv4 } from 'uuid';
import { IconSelector } from '../ui/IconSelector';
import styles from './SettingsDialog.module.css';
import { Button, Input, Label, Card } from '../primitives';

type ViewMode = 'list' | 'add-select-type' | 'add-form' | 'edit';

export const IntegrationsSettings: React.FC = () => {
  const { 
    integrations, 
    addIntegration, 
    updateIntegration,
    removeIntegration
  } = useIntegrationStore();

  const { saveConfig } = usePersistenceStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [endpointId, setEndpointId] = useState('');

  const resetForm = () => {
    setViewMode('list');
    setEditingId(null);
    setSelectedType(null);
    setName('');
    setIconUrl('');
    setUrl('');
    setApiKey('');
    setUsername('');
    setPassword('');
    setUserId('');
    setClientId('');
    setClientSecret('');
    setEndpointId('');
  };

  const handleSelectType = (type: IntegrationType) => {
    setSelectedType(type);
    const meta = getIntegrationTypeMeta(type);
    setName(meta?.label || type);
    setViewMode('add-form');
  };

  const handleEdit = (integration: Integration) => {
    setEditingId(integration.id);
    setSelectedType(integration.type);
    setName(integration.name);
    setIconUrl(integration.iconUrl || '');
    
    const config = integration.config as Record<string, string | undefined>;
    setUrl(config.url || '');
    setApiKey(config.apiKey || '');
    setUsername(config.username || '');
    setPassword(config.password || '');
    setUserId(config.userId || '');
    setClientId(config.clientId || '');
    setClientSecret(config.clientSecret || '');
    setEndpointId(config.endpointId || '');
    
    setViewMode('edit');
  };

  const buildConfig = (): Record<string, string> => {
    const config: Record<string, string> = {};
    
    if (!selectedType) return config;
    
    // Add fields based on type
    switch (selectedType) {
      case 'jellyfin':
        if (url) config.url = url;
        if (apiKey) config.apiKey = apiKey;
        if (userId) config.userId = userId;
        break;
      case 'jellyseerr':
      case 'sabnzbd':
      case 'radarr':
      case 'sonarr':
        if (url) config.url = url;
        if (apiKey) config.apiKey = apiKey;
        break;
      case 'netdata':
        if (url) config.url = url;
        break;
      case 'portainer':
        if (url) config.url = url;
        if (apiKey) config.apiKey = apiKey;
        if (endpointId) config.endpointId = endpointId;
        break;
      case 'qbittorrent':
        if (url) config.url = url;
        if (username) config.username = username;
        if (password) config.password = password;
        break;
      case 'twitch':
        if (clientId) config.clientId = clientId;
        if (clientSecret) config.clientSecret = clientSecret;
        break;
    }
    
    return config;
  };

  const handleSave = () => {
    if (!name || !selectedType) return;

    const config = buildConfig();

    if (editingId) {
      updateIntegration(editingId, {
        name,
        type: selectedType,
        iconUrl: iconUrl || undefined,
        config
      });
    } else {
      const integration: Integration = {
        id: uuidv4(),
        name,
        type: selectedType,
        iconUrl: iconUrl || undefined,
        config
      };
      addIntegration(integration);
    }

    saveConfig();
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this integration?')) {
      removeIntegration(id);
      saveConfig();
    }
  };

  // Render type selection cards
  const renderTypeSelection = () => (
    <div className={styles.form}>
      <div className={styles.formHeader}>
        <Button onClick={resetForm} variant="ghost" size="icon" title="Back">
          <ArrowLeft size={18} />
        </Button>
        <h3 className={styles.formHeaderTitle}>Select Service Type</h3>
      </div>
      
      <div className={styles.typeGrid}>
        {INTEGRATION_TYPE_META.map((meta) => (
          <Card 
            key={meta.type}
            className={styles.typeCard}
            onClick={() => handleSelectType(meta.type)}
            style={{ cursor: 'pointer', padding: '16px' }}
          >
            <div className={styles.typeCardContent}>
              <span className={styles.typeCardLabel}>{meta.label}</span>
              <span className={styles.typeCardDescription}>{meta.description}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render form fields based on selected type
  const renderFormFields = () => {
    if (!selectedType) return null;

    const hasUrl = ['jellyfin', 'jellyseerr', 'netdata', 'portainer', 'sabnzbd', 'qbittorrent', 'radarr', 'sonarr'].includes(selectedType);
    const hasApiKey = ['jellyfin', 'jellyseerr', 'portainer', 'sabnzbd', 'radarr', 'sonarr'].includes(selectedType);
    const hasCredentials = selectedType === 'qbittorrent';
    const hasTwitchAuth = selectedType === 'twitch';
    const hasUserId = selectedType === 'jellyfin';
    const hasEndpointId = selectedType === 'portainer';

    return (
      <>
        {hasUrl && (
          <div className={styles.formGroup}>
            <Input 
              label="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://192.168.1.100:8096"
            />
          </div>
        )}

        {hasApiKey && (
          <div className={styles.formGroup}>
            <Input 
              label="API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="API Key / Token"
            />
          </div>
        )}

        {hasUserId && (
          <div className={styles.formGroup}>
            <Input 
              label="User ID (Optional)"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Jellyfin User ID"
            />
          </div>
        )}

        {hasEndpointId && (
          <div className={styles.formGroup}>
            <Input 
              label="Endpoint ID"
              value={endpointId}
              onChange={(e) => setEndpointId(e.target.value)}
              placeholder="1"
            />
          </div>
        )}

        {hasCredentials && (
          <>
            <div className={styles.formGroup}>
              <Input 
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
              />
            </div>
            <div className={styles.formGroup}>
              <Input 
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        )}

        {hasTwitchAuth && (
          <>
            <div className={styles.formGroup}>
              <Input 
                label="Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Twitch Client ID"
              />
            </div>
            <div className={styles.formGroup}>
              <Input 
                label="Client Secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="Twitch Client Secret"
              />
            </div>
          </>
        )}
      </>
    );
  };

  // Render form (add or edit)
  const renderForm = () => {
    const typeMeta = selectedType ? getIntegrationTypeMeta(selectedType) : null;
    
    return (
      <div className={styles.form}>
        <div className={styles.formHeader}>
          <Button 
            onClick={() => editingId ? resetForm() : setViewMode('add-select-type')} 
            variant="ghost" 
            size="icon" 
            title="Back"
          >
            <ArrowLeft size={18} />
          </Button>
          <h3 className={styles.formHeaderTitle}>
            {editingId ? 'Edit' : 'New'} {typeMeta?.label || 'Integration'}
          </h3>
        </div>

        <div className={styles.formGroup}>
          <Input 
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Home Media Server"
          />
        </div>

        <div className={styles.formGroup}>
          <Label>Custom Icon (Optional)</Label>
          <IconSelector 
            iconUrl={iconUrl} 
            onIconSelect={setIconUrl} 
          />
        </div>

        {renderFormFields()}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
          <Button 
            onClick={resetForm} 
            variant="secondary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            variant="primary"
            leftIcon={<Check size={16} />}
          >
            {editingId ? 'Update' : 'Save'}
          </Button>
        </div>
      </div>
    );
  };

  // Render list view
  const renderList = () => (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <Button 
          onClick={() => setViewMode('add-select-type')} 
          variant="primary"
          leftIcon={<Plus size={16} />}
        >
          Add Integration
        </Button>
      </div>
      
      <div className={styles.integrationList}>
        {integrations.map((integration) => {
          const meta = getIntegrationTypeMeta(integration.type);
          const config = integration.config as Record<string, string | undefined>;
          
          return (
            <Card 
              key={integration.id} 
              className={styles.integrationItem} 
              style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div className={styles.integrationInfo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link2 size={16} style={{ color: 'var(--text-muted)' }} />
                  <span className={styles.integrationName}>{integration.name}</span>
                </div>
                <span className={styles.integrationType}>
                  {meta?.label || integration.type}
                  {config.url && ` • ${config.url}`}
                </span>
              </div>
              <div className={styles.actions}>
                <Button 
                  onClick={() => handleEdit(integration)} 
                  variant="ghost"
                  size="icon"
                >
                  <Pencil size={18} />
                </Button>
                <Button 
                  onClick={() => handleDelete(integration.id)} 
                  variant="danger"
                  size="icon"
                >
                  <Trash2 size={18} />
                </Button>
              </div>
            </Card>
          );
        })}
        
        {integrations.length === 0 && (
          <div className={styles.emptyState}>
            <Link2 size={32} className={styles.emptyStateIcon} />
            <p>No integrations configured yet.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.7 }}>
              Integrations let you save connection settings and reuse them across widgets.
            </p>
          </div>
        )}
      </div>
    </>
  );

  // Main render
  switch (viewMode) {
    case 'add-select-type':
      return renderTypeSelection();
    case 'add-form':
    case 'edit':
      return renderForm();
    default:
      return renderList();
  }
};
