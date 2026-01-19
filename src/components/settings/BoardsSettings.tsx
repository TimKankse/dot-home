"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, LayoutGrid, Check, Star, Calendar, Layers, Box, Shield, ArrowLeft } from 'lucide-react';
import { PermissionManager } from './PermissionManager';
import { type AccessLevel } from '../ui/AccessLevelSelect';
import { Button, Input, Label, Badge } from '../primitives';
import styles from './SettingsDialog.module.css';

interface Dashboard {
  id: string;
  name: string;
  isDefault: boolean;
  isUserDefault: boolean;
  accessLevel: string;
  ownerId: string;
  ownerName: string | null;
  permission: 'none' | 'view' | 'edit';
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  widgetCount: number;
}

type FormMode = 'list' | 'create' | 'edit';

export const BoardsSettings: React.FC = () => {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form mode and state
  const [formMode, setFormMode] = useState<FormMode>('list');
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [formName, setFormName] = useState('');
  const [formAccessLevel, setFormAccessLevel] = useState<AccessLevel>('PRIVATE');

  const fetchDashboards = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/dashboards');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch dashboards');
      }
      
      setDashboards(data.dashboards || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboards');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const resetForm = () => {
    setFormMode('list');
    setEditingDashboard(null);
    setFormName('');
    setFormAccessLevel('PRIVATE');
  };

  const handleStartCreate = () => {
    setFormMode('create');
    setFormName('');
    setFormAccessLevel('PRIVATE');
  };

  const handleStartEdit = (dashboard: Dashboard) => {
    setFormMode('edit');
    setEditingDashboard(dashboard);
    setFormName(dashboard.name);
    setFormAccessLevel((dashboard.accessLevel || 'PRIVATE') as AccessLevel);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    
    try {
      const res = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create dashboard');
      }
      
      setDashboards(prev => [...prev, data.dashboard]);
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create dashboard');
    }
  };

  const handleUpdate = async () => {
    if (!editingDashboard || !formName.trim()) return;
    
    try {
      const res = await fetch(`/api/dashboards/${editingDashboard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update dashboard');
      }
      
      setDashboards(prev => 
        prev.map(d => d.id === editingDashboard.id ? data.dashboard : d)
      );
      resetForm();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update dashboard');
    }
  };

  const handleSetDefault = async (dashboard: Dashboard) => {
    if (dashboard.isUserDefault) return;
    
    try {
      const res = await fetch('/api/users/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultDashboardId: dashboard.id }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to set default');
      }
      
      setDashboards(prev => 
        prev.map(d => ({
          ...d,
          isUserDefault: d.id === dashboard.id,
        }))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to set default dashboard');
    }
  };

  const handleDelete = async (dashboard: Dashboard) => {
    if (dashboard.isUserDefault) {
      alert('Cannot delete your default dashboard. Set another dashboard as default first.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${dashboard.name}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`/api/dashboards/${dashboard.id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete dashboard');
      }
      
      setDashboards(prev => prev.filter(d => d.id !== dashboard.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete dashboard');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.emptyState}>
        <p>Loading dashboards...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorBanner}>
        <p>{error}</p>
        <button onClick={fetchDashboards} className={`${styles.button} ${styles.secondaryButton}`}>
          Retry
        </button>
      </div>
    );
  }

  // Render the form view (create or edit)
  if (formMode !== 'list') {
    const isEditing = formMode === 'edit';
    
    return (
      <div className={styles.form}>
        <div className={styles.formHeader}>
          <Button variant="ghost" size="icon" onClick={resetForm} title="Back to list" leftIcon={<ArrowLeft size={18} />} />
          <h3 className={styles.formHeaderTitle}>
            {isEditing ? 'Edit Dashboard' : 'New Dashboard'}
          </h3>
        </div>
        
        <div className={styles.formGroup}>
          <Label>Name</Label>
          <Input 
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="My Dashboard"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && (isEditing ? handleUpdate() : handleCreate())}
            disabled={isEditing && editingDashboard?.permission !== 'edit'}
          />
        </div>
        
        {isEditing && editingDashboard && (
          <div style={{ marginTop: '1.5rem' }}>
            <PermissionManager
              objectType="dashboard"
              objectId={editingDashboard.id}
              currentAccessLevel={formAccessLevel}
              onAccessLevelChange={async (level) => {
                setFormAccessLevel(level);
                try {
                  await fetch(`/api/dashboards/${editingDashboard.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessLevel: level }),
                  });
                  fetchDashboards();
                } catch (err) {
                  console.error('Failed to update access level:', err);
                }
              }}
              canEdit={editingDashboard.permission === 'edit'}
            />
          </div>
        )}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
          <Button 
            variant="secondary"
            onClick={resetForm} 
          >
            Cancel
          </Button>
          {(!isEditing || editingDashboard?.permission === 'edit') && (
            <Button 
              variant="primary"
              onClick={isEditing ? handleUpdate : handleCreate}
              disabled={!formName.trim()}
              leftIcon={isEditing ? <Check size={16} /> : <Plus size={16} />}
            >
              {isEditing ? 'Save' : 'Create'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Render the list view
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <Button 
          variant="primary"
          onClick={handleStartCreate} 
          leftIcon={<Plus size={16} />}
        >
          New Dashboard
        </Button>
      </div>
      
      <div className={styles.integrationList}>
        {dashboards.map((dashboard) => (
          <div key={dashboard.id} className={styles.integrationItem}>
            <div className={styles.integrationInfo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={styles.integrationName}>{dashboard.name}</span>
                {dashboard.isUserDefault && (
                  <Badge variant="success" icon={<Star size={10} />}>
                    Your Default
                  </Badge>
                )}
              </div>
              <div className={styles.integrationType} style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Layers size={12} /> {dashboard.pageCount} {dashboard.pageCount === 1 ? 'page' : 'pages'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Box size={12} /> {dashboard.widgetCount} {dashboard.widgetCount === 1 ? 'widget' : 'widgets'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> {formatDate(dashboard.updatedAt)}
                </span>
              </div>
            </div>
            <div className={styles.actions}>
              {!dashboard.isUserDefault && (
                <Button variant="ghost" size="icon"
                  onClick={() => handleSetDefault(dashboard)} 
                  title="Set as your default"
                  leftIcon={<Star size={18} />}
                />
              )}
              <Button variant="ghost" size="icon"
                onClick={() => handleStartEdit(dashboard)} 
                title={dashboard.isOwner ? 'Edit dashboard' : 'View dashboard access'}
                disabled={dashboard.permission !== 'edit'}
                leftIcon={dashboard.isOwner ? <Pencil size={18} /> : <Shield size={18} />}
              />
              <Button variant="danger" size="icon"
                onClick={() => handleDelete(dashboard)} 
                title={!dashboard.isOwner ? 'Cannot delete dashboards you do not own' : 
                       dashboard.isUserDefault ? 'Cannot delete your default dashboard' : 
                       'Delete dashboard'}
                disabled={!dashboard.isOwner || dashboard.isUserDefault}
                style={(!dashboard.isOwner || dashboard.isUserDefault) ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                leftIcon={<Trash2 size={18} />}
              />
            </div>
          </div>
        ))}
        
        {dashboards.length === 0 && (
          <div className={styles.emptyState}>
            <LayoutGrid size={32} className={styles.emptyStateIcon} />
            <p>No dashboards found.</p>
            <p style={{ fontSize: '0.75rem', marginTop: '8px', opacity: 0.7 }}>
              Click &quot;New Dashboard&quot; to create one.
            </p>
          </div>
        )}
      </div>
    </>
  );
};
