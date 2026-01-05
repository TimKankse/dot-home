import React, { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { ShortcutBindings } from '@/types/settings';
import { getNormalizedKey } from '@/utils/keyboardUtils';
import { Keyboard, RotateCcw } from 'lucide-react';
import styles from './SettingsDialog.module.css';

const SHORTCUT_LABELS: Record<keyof ShortcutBindings, string> = {
  toggleEdit: 'Toggle Edit Mode',
  openSettings: 'Open Settings',
  addItem: 'Add New Item',
  saveChanges: 'Save Changes',
  prevPage: 'Previous Page',
  nextPage: 'Next Page'
};

export const ShortcutsSettings: React.FC = () => {
  const { settings, updateShortcuts } = useSettingsStore();
  const [recordingKey, setRecordingKey] = useState<keyof ShortcutBindings | null>(null);

  useEffect(() => {
    if (!recordingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Detect modifiers
      const parts = [];
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

      // Normalize modifiers based on platform
      // Mac: Cmd -> Mod, Ctrl -> Ctrl
      // PC: Ctrl -> Mod, Meta -> Meta (Win key)
      if (isMac) {
        if (e.metaKey) parts.push('Mod');
        if (e.ctrlKey) parts.push('Ctrl');
      } else {
        if (e.ctrlKey) parts.push('Mod');
        if (e.metaKey) parts.push('Meta');
      }

      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      // Get key
      let key = e.key;
      
      // Normalize arrow keys
      if (key === 'ArrowLeft') key = 'ArrowLeft'; // Hook expects ArrowLeft
      if (key === 'ArrowRight') key = 'ArrowRight';
      if (key === 'ArrowUp') key = 'ArrowUp';
      if (key === 'ArrowDown') key = 'ArrowDown';
      if (key === ' ') key = 'Space';
      
      // Don't bind just modifiers
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;

      key = getNormalizedKey(e);
      parts.push(key);

      const shortcut = parts.join('+');
      
      updateShortcuts({ [recordingKey]: shortcut });
      setRecordingKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingKey, updateShortcuts]);

  const handleReset = () => {
    if (confirm('Reset all shortcuts to default?')) {
        updateShortcuts({
            toggleEdit: 'Mod+E',
            openSettings: 'Mod+,',
            addItem: 'Mod+K',
            saveChanges: 'Mod+S',
            prevPage: 'Alt+ArrowLeft',
            nextPage: 'Alt+ArrowRight'
        });
    }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className={styles.sectionTitle}>Keyboard Shortcuts</div>
        <button className={styles.iconButton} onClick={handleReset} title="Reset to Defaults">
            <RotateCcw size={16} />
        </button>
      </div>

      <div className={styles.shortcutsGrid}>
        {Object.entries(settings.shortcuts).map(([action, binding]) => (
          <div key={action} className={styles.settingItem} style={{ marginBottom: 0 }}>
            <div className={styles.settingInfo}>
              <span className={styles.settingLabel}>{SHORTCUT_LABELS[action as keyof ShortcutBindings]}</span>
            </div>
            <button 
                className={`${styles.shortcutButton} ${recordingKey === action ? styles.recording : ''}`}
                onClick={() => setRecordingKey(action as keyof ShortcutBindings)}
                style={{
                    background: recordingKey === action ? 'var(--accent-red)' : 'var(--bg-card-lighter)',
                    color: recordingKey === action ? '#fff' : 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    padding: '4px 12px',
                    minWidth: '100px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                }}
            >
                {recordingKey === action ? (
                    <span>Press keys...</span>
                ) : (
                    <>
                        <Keyboard size={14} style={{ opacity: 0.5 }} />
                        <span>{binding}</span>
                    </>
                )}
            </button>
          </div>
        ))}
      </div>
    
        <div className={styles.note} style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            <p><strong>Mod</strong> represents ⌘ Command on macOS and Ctrl on Windows/Linux.</p>
        </div>
    </div>
  );
};
