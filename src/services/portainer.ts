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
  integrationId?: string;
  config?: PortainerWidgetConfig;
}

export async function fetchPortainerContainers(params: PortainerFetchParams): Promise<PortainerContainer[]> {
  const { config, integrationId } = params;
  if (!integrationId) {
    return [];
  }

  const query = new URLSearchParams({ integrationId });
  if (config?.endpointId) query.set('endpointId', config.endpointId);
  const res = await fetch(`/api/portainer?${query.toString()}`);

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
  params: PortainerFetchParams,
): Promise<boolean> {
  if (!params.integrationId) return false;
  const query = new URLSearchParams({ integrationId: params.integrationId });
  if (params.config?.endpointId) query.set('endpointId', params.config.endpointId);
  const res = await fetch(`/api/portainer?${query.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: containerId, action }),
  });

  return res.ok;
}

export function getContainerName(container: PortainerContainer): string {
  return container.Names[0].replace(/^\//, '');
}
