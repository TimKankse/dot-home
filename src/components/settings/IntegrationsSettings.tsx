"use client";

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Link2, ArrowLeft, Check } from 'lucide-react';
import { useIntegrationStore } from '@/store/useIntegrationStore';
import { 
  Integration, 
  IntegrationCredentialField,
  IntegrationType, 
  INTEGRATION_TYPE_META,
  getIntegrationTypeMeta 
} from '@/types/integration';
import styles from './SettingsDialog.module.css';
import { Button, Input, Card } from '../primitives';
import { apiFetch } from '@/lib/api-client';

type ViewMode = 'list' | 'add-select-type' | 'add-form' | 'edit';

export const IntegrationsSettings: React.FC = () => {
  const { 
    integrations, 
    addIntegration, 
    updateIntegration,
    removeIntegration
  } = useIntegrationStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [clientId, setClientId] = useState('');
  const [endpointId, setEndpointId] = useState('');

  const resetForm = () => {
    setViewMode('list');
    setEditingId(null);
    setSelectedType(null);
    setName('');
    setUrl('');
    setUsername('');
    setUserId('');
    setClientId('');
    setEndpointId('');
    setIsSaving(false);
    setSaveError(null);
  };

  const handleSelectType = (type: IntegrationType) => {
    setSelectedType(type);
    const meta = getIntegrationTypeMeta(type);
    setName(meta?.label || type);
    setSaveError(null);
    setViewMode('add-form');
  };

  const handleEdit = (integration: Integration) => {
    setEditingId(integration.id);
    setSelectedType(integration.type);
    setName(integration.name);
    
    const config = integration.config as Record<string, string | undefined>;
    setUrl(config.url || '');
    setUsername(config.username || '');
    setUserId(config.userId || '');
    setClientId(config.clientId || '');
    setEndpointId(config.endpointId || '');
    
    setViewMode('edit');
  };

  const credentialStatus = integrations.find(({ id }) => id === editingId)?.credentialStatus;

  const credentialInputProps = (field: IntegrationCredentialField, placeholder?: string) => {
    const status = credentialStatus?.[field];
    return {
      name: field,
      placeholder: status === 'saved' ? 'Saved. Enter a replacement to change it.' : placeholder,
      error: status === 'unreadable'
        ? 'Saved credential can’t be decrypted. Enter a replacement.'
        : undefined,
    };
  };

  const buildConfig = (fields: FormData): Record<string, string> => {
    const config: Record<string, string> = {};
    const apiKey = String(fields.get('apiKey') ?? '');
    const password = String(fields.get('password') ?? '');
    const clientSecret = String(fields.get('clientSecret') ?? '');
    const feedUrl = String(fields.get('secretUrl') ?? '');
    
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
      case 'rss':
        if (feedUrl) config.secretUrl = feedUrl;
        break;
    }
    
    return config;
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || !selectedType || isSaving) return;

    const config = buildConfig(new FormData(event.currentTarget));
    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await apiFetch('/api/integrations', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId ?? undefined, name, type: selectedType, config }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setSaveError(typeof body?.error === 'string' ? body.error : 'Failed to save integration');
        return;
      }

      const saved = await response.json() as Integration;
      if (editingId) updateIntegration(editingId, saved);
      else addIntegration(saved);

      if (Object.values(saved.credentialStatus ?? {}).includes('unreadable')) {
        if (!editingId) {
          setEditingId(saved.id);
          setViewMode('edit');
        }
        setSaveError('Settings saved. An unreadable credential still needs to be replaced.');
        return;
      }

      resetForm();
    } catch (error) {
      console.error(error);
      setSaveError('Failed to save integration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this integration?')) {
      try {
        const res = await apiFetch(`/api/integrations?id=${id}`, {
          method: 'DELETE',
        });

        if (!res.ok) throw new Error('Failed to delete integration');

        removeIntegration(id);
      } catch (error) {
        console.error(error);
        alert('Failed to delete integration');
      }
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
    const hasRssFeed = selectedType === 'rss';

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
              {...credentialInputProps('apiKey', 'API Key / Token')}
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
                {...credentialInputProps('password')}
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
                {...credentialInputProps('clientSecret', 'Twitch Client Secret')}
              />
            </div>
          </>
        )}

        {hasRssFeed && (
          <div className={styles.formGroup}>
            <Input
              label="Private or authenticated feed URL"
              type="password"
              {...credentialInputProps('secretUrl', 'http://192.168.1.10:8080/feed')}
            />
          </div>
        )}
      </>
    );
  };

  // Render form (add or edit)
  const renderForm = () => {
    const typeMeta = selectedType ? getIntegrationTypeMeta(selectedType) : null;
    
    return (
      <form key={editingId ?? selectedType} className={styles.form} onSubmit={handleSave}>
        <div className={styles.formHeader}>
          <Button 
            type="button"
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

        {renderFormFields()}
        {saveError && <div className={styles.errorBanner} role="alert">{saveError}</div>}

        <div className={styles.formActions}>
          <Button 
            type="button"
            onClick={resetForm} 
            variant="secondary"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="primary"
            leftIcon={isSaving ? undefined : <Check size={16} />}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (editingId ? 'Update' : 'Save')}
          </Button>
        </div>
      </form>
    );
  };

  // Render list view
  const renderList = () => (
    <>
      <div className={styles.listToolbar}>
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
              style={{ padding: '16px' }}
            >
              <div className={styles.integrationInfo}>
                <div className={styles.integrationTitleRow}>
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
                  aria-label={`Edit ${integration.name}`}
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
