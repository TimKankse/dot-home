import { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getNormalizedKey } from '@/utils/keyboardUtils';

interface UseKeyboardShortcutsProps {
  onToggleEdit?: () => void;
  onOpenSettings?: () => void;
  onAddItem?: () => void;
  onSaveChanges?: () => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onPageNavigate?: (index: number) => void;
  isModalOpen?: boolean;
}

export const useKeyboardShortcuts = ({
  onToggleEdit,
  onOpenSettings,
  onAddItem,
  onSaveChanges,
  onPrevPage,
  onNextPage,
  onPageNavigate,
  isModalOpen = false,
}: UseKeyboardShortcutsProps) => {
  const { settings } = useSettingsStore();
  const { shortcuts } = settings;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;

      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      const match = (binding: string) => {
        if (!binding) return false;
        const parts = binding.split('+');
        const key = parts[parts.length - 1].toLowerCase();
        const modifiers = parts.slice(0, -1);

        const eventKey = e.key.toLowerCase();
        
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        
        let requiredCtrl = modifiers.includes('Ctrl');
        let requiredMeta = modifiers.includes('Cmd');
        const requiredAlt = modifiers.includes('Alt');
        const requiredShift = modifiers.includes('Shift');
        
        if (modifiers.includes('Mod')) {
          if (isMac) requiredMeta = true;
          else requiredCtrl = true;
        }

        if (e.ctrlKey !== requiredCtrl) return false;
        if (e.metaKey !== requiredMeta) return false;
        if (e.altKey !== requiredAlt) return false;
        if (e.shiftKey !== requiredShift) return false;

        const normalizedEventKey = getNormalizedKey(e).toLowerCase();
        
        if (key === 'arrowleft') return normalizedEventKey === 'arrowleft';
        if (key === 'arrowright') return normalizedEventKey === 'arrowright';
        if (key === 'arrowup') return normalizedEventKey === 'arrowup';
        if (key === 'arrowdown') return normalizedEventKey === 'arrowdown';
         
        if (normalizedEventKey === key) return true;

        return eventKey === key;
      };

      if (match(shortcuts.toggleEdit) && onToggleEdit) {
        e.preventDefault();
        onToggleEdit();
      } else if (match(shortcuts.openSettings) && onOpenSettings) {
        e.preventDefault();
        onOpenSettings();
      } else if (match(shortcuts.addItem) && onAddItem) {
        e.preventDefault();
        onAddItem();
      } else if (match(shortcuts.saveChanges) && onSaveChanges) {
        e.preventDefault();
        onSaveChanges();
      } else if (match(shortcuts.prevPage) && onPrevPage) {
        e.preventDefault();
        onPrevPage();
      } else if (match(shortcuts.nextPage) && onNextPage) {
        e.preventDefault();
        onNextPage();
      } else if (onPageNavigate) {
         if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
            if (e.code.startsWith('Digit')) {
               const num = parseInt(e.code.replace('Digit', ''));
               if (!isNaN(num) && num >= 1 && num <= 9) {
                  e.preventDefault();
                  onPageNavigate(num - 1);
               }
            }
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, isModalOpen, onToggleEdit, onOpenSettings, onAddItem, onSaveChanges, onPrevPage, onNextPage, onPageNavigate]);
};
