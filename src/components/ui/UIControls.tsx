"use client";

import React from 'react';
import { Settings, Pencil, X, Plus, Loader2, Check, AlertCircle, Layout, ArrowRightLeft, ArrowUpDown } from 'lucide-react';
import styles from './UIControls.module.css';

interface UIControlsProps {
  isEditing: boolean;
  onToggleEdit: () => void;
  onAdd: () => void;
  onSave: () => void;
  onAddPage: () => void;
  onToggleScrollDirection: () => void;
  scrollDirection: 'vertical' | 'horizontal';
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onOpenSettings: () => void;
}

export const UIControls: React.FC<UIControlsProps> = ({ 
  isEditing, 
  onToggleEdit, 
  onAdd, 
  onSave, 
  onAddPage,
  onToggleScrollDirection,
  scrollDirection,
  saveStatus = 'idle',
  onOpenSettings
}) => {
  return (
    <div className={styles.container}>
      {/* Save Status Indicator - only shows when there's activity */}
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

      {isEditing && (
        <>
          <button 
            className={styles.button}
            onClick={onAddPage}
            aria-label="Add Page"
            title="Add Page"
          >
            <Layout size={20} />
            <Plus size={12} style={{ position: 'absolute', top: 8, right: 8 }} />
          </button>

          <button 
            className={styles.button}
            onClick={onToggleScrollDirection}
            aria-label="Toggle Scroll Direction"
            title={`Current: ${scrollDirection}`}
          >
            {scrollDirection === 'vertical' ? <ArrowUpDown size={20} /> : <ArrowRightLeft size={20} />}
          </button>
        </>
      )}

      <button 
        className={styles.button}
        onClick={onAdd}
        aria-label="Add Widget"
      >
        <Plus size={20} />
      </button>

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
