import type { PortainerWidgetConfig } from '@/types';

export interface PortainerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
  Created: number;
  Ports: Array<{ PrivatePort: number; PublicPort?: number; Type: string }>;
  NetworkSettings?: {
    Networks: Record<string, { IPAddress: string }>;
  };
}

export interface PortainerFetchParams {
  config: PortainerWidgetConfig;
}

export async function fetchPortainerContainers(params: PortainerFetchParams): Promise<PortainerContainer[]> {
  const { config } = params;
  
  if (!config.url || !config.apiKey) {
    return [];
  }

  const res = await fetch('/api/portainer', {
    headers: {
      'x-portainer-url': config.url,
      'x-portainer-apikey': config.apiKey,
      'x-portainer-endpoint-id': config.endpointId || '1',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }

  const data = await res.json();
  
  return Array.isArray(data) ? data.sort((a: PortainerContainer, b: PortainerContainer) => {
    if (a.State === 'running' && b.State !== 'running') return -1;
    if (a.State !== 'running' && b.State === 'running') return 1;
    return a.Names[0].localeCompare(b.Names[0]);
  }) : [];
}

export async function performContainerAction(
  containerId: string, 
  action: 'start' | 'stop' | 'restart',
  config: PortainerWidgetConfig
): Promise<boolean> {
  if (!config.url || !config.apiKey) return false;
  
  const res = await fetch('/api/portainer', {
    method: 'POST',
    headers: {
      'x-portainer-url': config.url,
      'x-portainer-apikey': config.apiKey,
      'x-portainer-endpoint-id': config.endpointId || '1',
    },
    body: JSON.stringify({ id: containerId, action }),
  });

  return res.ok;
}

export function getContainerName(container: PortainerContainer): string {
  return container.Names[0].replace(/^\//, '');
}
