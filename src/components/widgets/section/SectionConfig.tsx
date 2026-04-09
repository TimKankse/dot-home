'use client';

import React from 'react';

interface SectionConfigProps {
  config: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (key: string, value: any) => void;
}

export const SectionConfig: React.FC<SectionConfigProps> = ({ config, onChange }) => {
  const variant = (config.variant as string) || 'default';
  const title = (config.title as string) || '';
  const shortcutIds = (config.shortcutIds as string[]) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', opacity: 0.7 }}>
          Variant
        </label>
        <select
          value={variant}
          onChange={(e) => onChange('variant', e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: 'inherit',
            fontSize: '0.9rem'
          }}
        >
          <option value="default">Section (open)</option>
          <option value="folder">Folder</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', opacity: 0.7 }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onChange('title', e.target.value)}
          placeholder={variant === 'folder' ? 'Folder' : 'Section'}
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(255,255,255,0.05)',
            color: 'inherit',
            fontSize: '0.9rem'
          }}
        />
      </div>

      <div style={{ fontSize: '0.8rem', opacity: 0.5, paddingTop: '4px' }}>
        {shortcutIds.length > 0
          ? `${shortcutIds.length} shortcut${shortcutIds.length !== 1 ? 's' : ''} — drag shortcuts onto this widget to add more`
          : 'Drag shortcuts onto this widget to add them'
        }
      </div>
    </div>
  );
};
