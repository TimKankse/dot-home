import React, { useEffect, useState } from 'react';
import { FieldRenderProps } from '@/components/item-editor/forms/config-form-builder/types';
import { JellyfinWidgetConfig } from '@/types';
import { Checkbox } from '@/components/primitives/checkbox';
import { LibraryStats } from '../types';

export const LibrarySelector: React.FC<FieldRenderProps<JellyfinWidgetConfig>> = ({
  config,
  onChange,
  styles
}) => {
  const [availableLibraries, setAvailableLibraries] = useState<LibraryStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLibraries = async () => {
      // Only fetch if we have enough config to make a connection
      if ((!config.url || !config.apiKey) && !config.integrationId) {
        setAvailableLibraries([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Use mode=list via fetchJellyfinData by modifying the service or calling API directly
        // The service fetchJellyfinData calls /api/jellyfin/libraries but we want mode=list.
        // Let's call the API directly here for specificity or update the service.
        // For now, calling API directly is cleaner for this specific config component's needs
        // unless we want to pollute the service with "list mode".
        
        // Actually, let's reuse the service logic for auth headers but modify the call?
        // Let's just reproduce the fetch logic simply here.
        
        const headers: Record<string, string> = {};
        if (config.integrationId) headers['x-integration-id'] = config.integrationId;
        if (config.url) headers['x-jellyfin-url'] = config.url;
        if (config.apiKey) headers['x-jellyfin-apikey'] = config.apiKey;
        if (config.userId) headers['x-jellyfin-userid'] = config.userId;

        const res = await fetch('/api/jellyfin/libraries?mode=list', { headers });
        if (!res.ok) throw new Error('Failed to fetch libraries');
        
        const data: LibraryStats[] = await res.json();
        setAvailableLibraries(data);
      } catch (err) {
        console.error('Failed to load libraries', err);
        setError('Failed to load libraries');
      } finally {
        setLoading(false);
      }
    };

    loadLibraries();
  }, [config.url, config.apiKey, config.userId, config.integrationId]);

  if ((!config.url || !config.apiKey) && !config.integrationId) {
    return null;
  }

  const selectedIds = config.selectedLibraries || [];

  const handleToggle = (id: string, checked: boolean) => {
    let newSelected = [...selectedIds];
    if (checked) {
       if (!newSelected.includes(id)) newSelected.push(id);
    } else {
       newSelected = newSelected.filter(libId => libId !== id);
    }
    onChange('selectedLibraries', newSelected);
  };

  return (
    <div className={styles.formGroup}>
      <label className={styles.label}>Visible Libraries</label>
      {loading && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading libraries...</div>}
      {error && <div style={{ fontSize: '0.9rem', color: 'var(--red)' }}>{error}</div>}
      
      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          {availableLibraries.length === 0 ? (
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No libraries found</div>
          ) : (
            availableLibraries.map(lib => (
              <Checkbox
                key={lib.Id}
                label={lib.Name}
                checked={selectedIds.includes(lib.Id)}
                onCheckedChange={(checked) => handleToggle(lib.Id, checked)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};
