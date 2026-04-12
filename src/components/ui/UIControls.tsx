"use client";

import React from 'react';
import { Settings, Pencil, X, Plus, Loader2, Check, AlertCircle, Layout, LayoutGrid } from 'lucide-react';
import styles from './UIControls.module.css';

interface UIControlsProps {
  isEditing: boolean;
  canEdit?: boolean;
  showLayoutControlsToggle?: boolean;
  isLayoutControlsOpen?: boolean;
  onToggleEdit: () => void;
  onToggleLayoutControls?: () => void;
  onAdd: () => void;
  onSave: () => void;
  onAddPage: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onOpenSettings: () => void;
}

export const UIControls: React.FC<UIControlsProps> = ({ 
  isEditing, 
  canEdit = true,
  showLayoutControlsToggle = false,
  isLayoutControlsOpen = false,
  onToggleEdit, 
  onToggleLayoutControls,
  onAdd, 
  onAddPage,
  saveStatus = 'idle',
  onOpenSettings
}) => {
  return (
    <div className={styles.container}>
      {saveStatus !== 'idle' && (
        <div 
          className={`${styles.indicator} ${styles.statusIndicator}`}
          aria-label={
            saveStatus === 'saving' ? 'Saving...' : 
            saveStatus === 'saved' ? 'Saved' : 
            'Save Error'
          }
        >
          {saveStatus === 'saving' ? (
            <Loader2 size={20} className={styles.spin} />
          ) : saveStatus === 'saved' ? (
            <Check size={20} color="var(--accent-green)" />
          ) : (
            <AlertCircle size={20} color="var(--accent-red)" />
          )}
        </div>
      )}

      {isEditing && canEdit && (
        <button 
          className={styles.button}
          onClick={onAddPage}
          aria-label="Add Page"
          title="Add Page"
        >
          <Layout size={20} />
          <Plus size={12} style={{ position: 'absolute', top: 8, right: 8 }} />
        </button>
      )}

      {showLayoutControlsToggle && onToggleLayoutControls && (
        <button
          className={`${styles.button} ${isLayoutControlsOpen ? styles.active : ''}`}
          onClick={onToggleLayoutControls}
          aria-label={isLayoutControlsOpen ? "Close Layout Controls" : "Open Layout Controls"}
          title={isLayoutControlsOpen ? "Close layout controls" : "Open layout controls"}
          aria-pressed={isLayoutControlsOpen}
        >
          <LayoutGrid size={20} />
        </button>
      )}

      {canEdit && (
        <button 
          className={styles.button}
          onClick={onAdd}
          aria-label="Add Widget"
        >
          <Plus size={20} />
        </button>
      )}

      <button 
        className={`${styles.button} ${isEditing ? styles.active : ''}`}
        onClick={onToggleEdit}
        aria-label={isEditing ? "Stop Editing" : "Edit Dashboard"}
      >
        {isEditing ? <X size={20} /> : <Pencil size={20} />}
      </button>
      
      <button 
        className={styles.button}
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        <Settings size={20} />
      </button>
    </div>
  );
};
