"use client";

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import styles from './AddItemDialog.module.css';
import { ShortcutForm } from './forms/ShortcutForm';
import { WidgetForm } from './forms/WidgetForm';
import { NewItem } from './types';
import { X, Settings, Palette } from 'lucide-react';

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: NewItem) => void;
  onEdit?: (id: string, item: Partial<NewItem>) => void;
  onDelete?: (id: string) => void;
  initialItem?: NewItem;
  mode?: 'add' | 'edit';
}

const WIDGET_TYPES = [
  { value: 'clock', label: 'Clock' },
  { value: 'weather', label: 'Weather' },
  { value: 'search', label: 'Search' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'rss', label: 'RSS Feed' },
  { value: 'netdata', label: 'Netdata' },
  { value: 'glances', label: 'Glances' },
  { value: 'portainer', label: 'Portainer' },
  { value: 'jellyfin', label: 'Jellyfin' },
  { value: 'jellyseerr', label: 'Jellyseerr' },
  { value: 'qbittorrent', label: 'qBittorrent' },
  { value: 'sabnzbd', label: 'SABnzbd' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'image', label: 'Image' },

];

// Helper to compute initial type from props
function getInitialType(mode: 'add' | 'edit', initialItem?: NewItem): string {
  if (mode === 'edit' && initialItem) {
    if (initialItem.type === 'shortcut') {
      return 'shortcut';
    }
    return initialItem.widgetType || 'clock';
  }
  return 'clock';
}

export const AddItemDialog: React.FC<AddItemDialogProps> = ({
  isOpen,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  initialItem,
  mode = 'add'
}) => {
  // Initialize state based on current props - parent should use key prop to reset
  const [activeTab, setActiveTab] = useState<'configuration' | 'appearance' | 'yaml'>('configuration');
  const [selectedType, setSelectedType] = useState<string>(() => getInitialType(mode, initialItem));

  // Type/definition-related state for submitting
  const handleFormSubmit = (data: NewItem) => {
    const itemType: 'widget' | 'shortcut' = selectedType === 'shortcut' ? 'shortcut' : 'widget';
    const finalData: Partial<NewItem> = {
      ...data,
      type: itemType,
      widgetType: selectedType === 'shortcut' ? undefined : selectedType
    };

    if (mode === 'edit' && initialItem && onEdit) {
      onEdit(initialItem.id, finalData);
    } else {
      const newItem: NewItem = {
        id: crypto.randomUUID(),
        type: itemType,
        w: data.w || 1,
        h: data.h || 1,
        ...finalData
      };
      onAdd(newItem);
    }
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleDelete = () => {
    if (initialItem && onDelete) {
      onDelete(initialItem.id);
      handleClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} showCloseButton={false} className={styles.modal}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
           <label className={styles.label} style={{ marginBottom: 0 }}>Item Type</label>
           <select 
             className={styles.select}
             value={selectedType}
             onChange={(e) => setSelectedType(e.target.value)}
             disabled={mode === 'edit'} // Lock type in edit mode? Usually safer.
           >
             <option value="shortcut">Shortcut</option>
             <optgroup label="Widgets">
               {WIDGET_TYPES.map(type => (
                 <option key={type.value} value={type.value}>{type.label}</option>
               ))}
             </optgroup>
           </select>
        </div>
        
        <nav className={styles.nav}>
          <button 
            className={`${styles.navItem} ${activeTab === 'configuration' ? styles.active : ''}`}
            onClick={() => setActiveTab('configuration')}
          >
            <Settings size={18} />
            Configuration
          </button>
          <button 
            className={`${styles.navItem} ${activeTab === 'appearance' ? styles.active : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={18} />
            Appearance
          </button>
          {selectedType !== 'shortcut' && (
             <button 
               className={`${styles.navItem} ${activeTab === 'yaml' ? styles.active : ''}`}
               onClick={() => setActiveTab('yaml')}
             >
               <div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{'{}'}</div>
               YAML
             </button>
          )}
        </nav>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            {activeTab === 'configuration' ? 'Configuration' : activeTab === 'appearance' ? 'Appearance' : 'Advanced (YAML)'}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.contentWrapper}>
          {selectedType === 'shortcut' ? (
             <ShortcutForm 
                initialData={initialItem} 
                onSubmit={handleFormSubmit} 
                onCancel={handleClose}
                onDelete={mode === 'edit' ? handleDelete : undefined}
                isEditing={mode === 'edit'}
                activeTab={activeTab}
             />
          ) : (
             <WidgetForm 
                key={selectedType} // Re-mount when type changes to reset form state if needed
                initialData={mode === 'edit' ? initialItem : { widgetType: selectedType }} // Pre-fill widgetType for new items
                onSubmit={handleFormSubmit} 
                onCancel={handleClose} 
                onDelete={mode === 'edit' ? handleDelete : undefined}
                isEditing={mode === 'edit'}
                activeTab={activeTab}
                selectedType={selectedType} // Pass selected type to form
             />
          )}
        </div>
      </div>
    </Modal>
  );
};
