import { useEffect, useRef } from 'react';
import { usePersistenceStore } from '@/store/usePersistenceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWidgetStore } from '@/store/useWidgetStore';
import { usePageStore } from '@/store/usePageStore';
import { useIntegrationStore } from '@/store/useIntegrationStore';

export const useAutoSave = () => {
  const { saveConfig, isLoaded } = usePersistenceStore();
  const settings = useSettingsStore((state) => state.settings);
  const widgets = useWidgetStore((state) => state.widgets);
  const pages = usePageStore((state) => state.pages);
  const integrations = useIntegrationStore((state) => state.integrations);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveConfig();
    }, 1000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    isLoaded, 
    settings, 
    widgets, 
    pages, 
    integrations,
    saveConfig
  ]);
};
