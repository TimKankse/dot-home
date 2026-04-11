import { useState, type ReactNode } from 'react';
import { getIcon } from '@/utils/getIcon';

interface UseShortcutIconOptions {
  name: string;
  url?: string;
  iconUrl?: string;
}

interface UseShortcutIconResult {
  imageUrl: string | null;
  fallbackIcon: ReactNode | null;
  fallbackLetter: string;
  handleImageError: () => void;
}

export function useShortcutIcon({
  name,
  url,
  iconUrl,
}: UseShortcutIconOptions): UseShortcutIconResult {
  const sourceKey = `${name}::${url || ''}::${iconUrl || ''}`;
  const [sourceState, setSourceState] = useState({
    sourceKey,
    sourceIndex: 0,
  });

  const cdnUrl = `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${name
    .toLowerCase()
    .replace(/\s+/g, '-')}.png`;

  let faviconUrl: string | null = null;
  try {
    if (url) {
      const domain = new URL(url).hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
  } catch {
    faviconUrl = null;
  }

  const sources = [iconUrl, cdnUrl, faviconUrl].filter(
    (src): src is string => Boolean(src)
  );
  const sourceIndex =
    sourceState.sourceKey === sourceKey ? sourceState.sourceIndex : 0;
  const imageUrl = sources[sourceIndex] ?? null;

  const handleImageError = () => {
    setSourceState((current) => ({
      sourceKey,
      sourceIndex: Math.min(
        (current.sourceKey === sourceKey ? current.sourceIndex : 0) + 1,
        sources.length
      ),
    }));
  };

  return {
    imageUrl,
    fallbackIcon: getIcon(name),
    fallbackLetter: name.charAt(0).toUpperCase(),
    handleImageError,
  };
}
