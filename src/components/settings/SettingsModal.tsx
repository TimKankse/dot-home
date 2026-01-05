"use client";

import React, { useState, useEffect } from 'react';
import { X, Settings, Palette, Users, Puzzle, Keyboard, Layout, Upload, Download } from 'lucide-react';
import { usePersistenceStore } from '@/store/usePersistenceStore';
import styles from './SettingsDialog.module.css';
import { Modal } from '../ui/Modal';
import { GeneralSettings } from './GeneralSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { UsersSettings } from './UsersSettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { ShortcutsSettings } from './ShortcutsSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'appearance' | 'users' | 'integrations' | 'shortcuts';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { fetchConfig, isLoaded } = usePersistenceStore();

  useEffect(() => {
    if (!isLoaded) {
      fetchConfig();
    }
  }, [isLoaded, fetchConfig]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false} className={styles.modal}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Settings size={24} />
          <span className={styles.sidebarTitle}>Settings</span>
        </div>
        <nav className={styles.nav}>
          <button 
            className={`${styles.navItem} ${activeTab === 'general' ? styles.active : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <Layout size={18} />
            General
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'appearance' ? styles.active : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={18} />
            Appearance
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} />
            Users
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'integrations' ? styles.active : ''}`}
            onClick={() => setActiveTab('integrations')}
          >
            <Puzzle size={18} />
            Integrations
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'shortcuts' ? styles.active : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            <Keyboard size={18} />
            Shortcuts
          </button>
        </nav>
        <div className={styles.sidebarFooter}>
          <button className={styles.configButton}>
            <Upload size={16} />
            Import Config
          </button>
          <button className={styles.configButton}>
            <Download size={16} />
            Export Config
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {activeTab === 'general' && 'General Settings'}
            {activeTab === 'appearance' && 'Appearance'}
            {activeTab === 'users' && 'Users'}
            {activeTab === 'integrations' && 'Integrations'}
            {activeTab === 'shortcuts' && 'Keyboard Shortcuts'}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.scrollArea}>
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'appearance' && <AppearanceSettings />}
          {activeTab === 'users' && <UsersSettings />}
          {activeTab === 'integrations' && <IntegrationsSettings />}
          {activeTab === 'shortcuts' && <ShortcutsSettings />}
        </div>
      </div>
    </Modal>
  );
};
