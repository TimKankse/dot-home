"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Palette, Users, Puzzle, Keyboard, Layout, LogOut, LayoutGrid, Info } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { usePersistenceStore } from '@/store/usePersistenceStore';
import styles from './SettingsDialog.module.css';
import { Modal, ModalSidebar, ModalSidebarItem, ModalContent, ModalHeader, ModalBody } from '../primitives/modal';
import { FormErrorBoundary } from '../item-editor/FormErrorBoundary';
import { GeneralSettings } from './GeneralSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { UsersSettings } from './UsersSettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { ShortcutsSettings } from './ShortcutsSettings';
import { BoardsSettings } from './BoardsSettings';
import { AboutSettings } from './AboutSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'general' | 'appearance' | 'boards' | 'users' | 'integrations' | 'shortcuts' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const { fetchConfig, isLoaded, saveConfig } = usePersistenceStore();
  const { data: session } = useSession();

  const handleClose = () => {
    saveConfig();
    onClose();
  };

  useEffect(() => {
    if (!isLoaded) {
      fetchConfig();
    }
  }, [isLoaded, fetchConfig]);

  const handleSignOut = () => {
    onClose();
    signOut({ callbackUrl: '/login' });
  };

  const formatRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" className={styles.modalWithSidebar}>
      <ModalSidebar
        title="Settings"
        icon={<Settings size={20} />}
        footer={
          <div className={styles.sidebarFooterContent}>
            <div className={styles.accountInfo}>
              <span className={styles.displayName}>
                {session?.user?.name || session?.user?.email || 'User'}
              </span>
              <span className={styles.roleBadge}>
                {formatRole(session?.user?.role || 'member')}
              </span>
            </div>
            <button className={styles.logoutButton} onClick={handleSignOut}>
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        }
      >
        <ModalSidebarItem 
          active={activeTab === 'general'} 
          onClick={() => setActiveTab('general')}
          icon={<Layout size={18} />}
        >
          General
        </ModalSidebarItem>
        <ModalSidebarItem 
          active={activeTab === 'appearance'} 
          onClick={() => setActiveTab('appearance')}
          icon={<Palette size={18} />}
        >
          Appearance
        </ModalSidebarItem>
        <ModalSidebarItem 
          active={activeTab === 'users'} 
          onClick={() => setActiveTab('users')}
          icon={<Users size={18} />}
        >
          Users
        </ModalSidebarItem>
        <ModalSidebarItem 
          active={activeTab === 'integrations'} 
          onClick={() => setActiveTab('integrations')}
          icon={<Puzzle size={18} />}
        >
          Integrations
        </ModalSidebarItem>
        <ModalSidebarItem 
          active={activeTab === 'boards'} 
          onClick={() => setActiveTab('boards')}
          icon={<LayoutGrid size={18} />}
        >
          Boards
        </ModalSidebarItem>
        <ModalSidebarItem 
          active={activeTab === 'shortcuts'} 
          onClick={() => setActiveTab('shortcuts')}
          icon={<Keyboard size={18} />}
        >
          Shortcuts
        </ModalSidebarItem>
        <ModalSidebarItem 
          active={activeTab === 'about'} 
          onClick={() => setActiveTab('about')}
          icon={<Info size={18} />}
        >
          About
        </ModalSidebarItem>
      </ModalSidebar>

      <ModalContent>
        <ModalHeader title={
          activeTab === 'general' ? 'General Settings' :
          activeTab === 'appearance' ? 'Appearance' :
          activeTab === 'boards' ? 'Boards' :
          activeTab === 'users' ? 'Users' :
          activeTab === 'integrations' ? 'Integrations' :
          activeTab === 'shortcuts' ? 'Keyboard Shortcuts' :
          'About'
        } onClose={handleClose} />
        
        <ModalBody>
          {activeTab === 'general' && <FormErrorBoundary sectionName="General Settings"><GeneralSettings /></FormErrorBoundary>}
          {activeTab === 'appearance' && <FormErrorBoundary sectionName="Appearance Settings"><AppearanceSettings /></FormErrorBoundary>}
          {activeTab === 'boards' && <FormErrorBoundary sectionName="Boards Settings"><BoardsSettings /></FormErrorBoundary>}
          {activeTab === 'users' && <FormErrorBoundary sectionName="Users Settings"><UsersSettings /></FormErrorBoundary>}
          {activeTab === 'integrations' && <FormErrorBoundary sectionName="Integrations Settings"><IntegrationsSettings /></FormErrorBoundary>}
          {activeTab === 'shortcuts' && <FormErrorBoundary sectionName="Shortcuts Settings"><ShortcutsSettings /></FormErrorBoundary>}
          {activeTab === 'about' && <FormErrorBoundary sectionName="About Settings"><AboutSettings /></FormErrorBoundary>}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
