"use client";

import React, { useState } from 'react';
import { Modal, ModalSidebar, ModalSidebarItem, ModalContent, ModalBody, ModalFooter } from '../primitives/modal';
import { Select } from '../primitives/select';
import { Button } from '../primitives/button';
import { IconButton } from '../primitives/icon-button';
import styles from './ItemEditorDialog.module.css';
import { ShortcutForm } from './forms/ShortcutForm';
import { WidgetForm } from './forms/WidgetForm';
import { NewItem } from './types';
import { Settings, Palette, X } from 'lucide-react';

interface ItemEditorDialogProps {
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
  { value: 'portainer', label: 'Portainer' },
  { value: 'jellyfin', label: 'Jellyfin' },
  { value: 'jellyseerr', label: 'Jellyseerr' },
  { value: 'qbittorrent', label: 'qBittorrent' },
  { value: 'sabnzbd', label: 'SABnzbd' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'image', label: 'Image' },
  { value: 'section', label: 'Section' },
  { value: 'stock', label: 'Stock' },
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

export const ItemEditorDialog: React.FC<ItemEditorDialogProps> = ({
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
  const [isFormValid, setIsFormValid] = useState(true);
  const formId = "add-item-form";

  // Type/definition-related state for submitting
  const handleFormSubmit = (data: NewItem) => {
    const itemType: 'widget' | 'shortcut' = selectedType === 'shortcut' ? 'shortcut' : 'widget';
    const finalData: Partial<NewItem> = {
      ...data,
      type: itemType,
      widgetType: selectedType === 'shortcut' ? undefined : selectedType
    };

    if (mode === 'edit' && initialItem && initialItem.id && onEdit) {
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
    if (initialItem && initialItem.id && onDelete) {
      onDelete(initialItem.id);
      handleClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" className={styles.modalWithSidebar}>
      <ModalSidebar
        title={
          <div className={styles.sidebarHeader}>
             <IconButton
               type="button"
               variant="solid"
               size="md"
               icon={<X size={18} />}
               className={styles.sidebarCloseButton}
               onClick={handleClose}
               aria-label="Close item editor"
             />
             <label className={`${styles.label} ${styles.sidebarLabel}`}>Item Type</label>
             <Select 
               options={[
                 { value: 'shortcut', label: 'Shortcut' },
                 ...WIDGET_TYPES
               ]}
               value={selectedType}
               onChange={(val) => setSelectedType(val)}
               disabled={mode === 'edit'}
               className={styles.fullWidthSelect}
             />
          </div>
        }
      >
        <ModalSidebarItem 
          active={activeTab === 'configuration'} 
          onClick={() => setActiveTab('configuration')}
          icon={<Settings size={18} />}
        >
          Configuration
        </ModalSidebarItem>
        <ModalSidebarItem 
          active={activeTab === 'appearance'} 
          onClick={() => setActiveTab('appearance')}
          icon={<Palette size={18} />}
        >
          Appearance
        </ModalSidebarItem>
        {selectedType !== 'shortcut' && (
          <ModalSidebarItem 
            active={activeTab === 'yaml'} 
            onClick={() => setActiveTab('yaml')}
            icon={<div style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{'{}'}</div>}
          >
            YAML
          </ModalSidebarItem>
        )}
      </ModalSidebar>

      <ModalContent>
        <ModalBody className={styles.formContent}>
          {selectedType === 'shortcut' ? (
             <ShortcutForm 
                initialData={initialItem} 
                onSubmit={handleFormSubmit} 
                onCancel={handleClose}
                onDelete={mode === 'edit' ? handleDelete : undefined}
                isEditing={mode === 'edit'}
                activeTab={activeTab}
                formId={formId}
                onValidityChange={setIsFormValid}
             />
          ) : (
             <WidgetForm 
                key={selectedType}
                initialData={mode === 'edit' ? initialItem : { widgetType: selectedType }}
                onSubmit={handleFormSubmit} 
                onCancel={handleClose} 
                onDelete={mode === 'edit' ? handleDelete : undefined}
                isEditing={mode === 'edit'}
                activeTab={activeTab}
                selectedType={selectedType}
                formId={formId}
                onValidityChange={setIsFormValid}
             />
          )}
        </ModalBody>
        <ModalFooter>
           {mode === 'edit' && onDelete && (
             <Button
               type="button"
               variant="danger"
               className={styles.buttonDanger}
               onClick={handleDelete}
             >
               Delete
             </Button>
           )}
           <Button
             type="button"
             variant="ghost"
             onClick={handleClose}
           >
             Cancel
           </Button>
           <Button
             type="submit"
             form={formId}
             variant="primary"
             disabled={!isFormValid}
           >
             {mode === 'edit' ? 'Save Changes' : (selectedType === 'shortcut' ? 'Add Shortcut' : 'Add Widget')}
           </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
