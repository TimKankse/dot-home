
export interface WidgetDefinition {
  minW: number;
  minH: number;
  variantKey?: string;
  variations?: Record<string, { minW?: number; minH?: number }>;
}

export const WIDGET_DEFINITIONS: Record<string, WidgetDefinition> = {
  clock: {
    minW: 2,
    minH: 2,
    variantKey: 'variant',
    variations: {
      digital: { minW: 2, minH: 1 },
      analog: { minW: 2, minH: 2 }
    }
  },
  weather: {
    minW: 2,
    minH: 2
  },
  calendar: {
    minW: 2,
    minH: 3
  },
  rss: {
    minW: 2,
    minH: 2
  },
  netdata: {
    minW: 2,
    minH: 2
  },
  portainer: {
    minW: 2,
    minH: 2
  },
  jellyfin: {
    minW: 2,
    minH: 2
  },
  jellyseerr: {
    minW: 2,
    minH: 2
  },
  qbittorrent: {
    minW: 2,
    minH: 2
  },
  sabnzbd: {
    minW: 2,
    minH: 2
  },
  twitch: {
    minW: 2,
    minH: 2
  },
  image: {
    minW: 2,
    minH: 2
  },

  search: {
    minW: 2,
    minH: 1
  }
};

export const getMinDimensions = (type: string, config: Record<string, any> = {}) => {
  const def = WIDGET_DEFINITIONS[type];
  if (!def) return { w: 1, h: 1 };

  // Simplified as requested: Ignore variant logic for now and enforce base constraints
  return { w: def.minW || 1, h: def.minH || 1 };
};
