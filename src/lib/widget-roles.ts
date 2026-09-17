import { prisma } from '@/lib/db';
import { ApiSecurityError, type ApiUser } from '@/lib/api-security';

export const DEFAULT_WIDGET_ROLES: Record<string, string[]> = {
  netdata: ['admin'], glances: ['admin'], portainer: ['admin'],
  jellyfin: ['admin', 'member'], jellyseerr: ['admin', 'member'],
  qbittorrent: ['admin', 'member'], sabnzbd: ['admin', 'member'],
  ...Object.fromEntries(['clock', 'weather', 'calendar', 'rss', 'search', 'shortcut', 'image', 'spacer', 'twitch']
    .map((type) => [type, ['admin', 'member', 'viewer']])),
};

export async function requireIntegrationRole(user: ApiUser, integrationType: string) {
  const widgetType = ['radarr', 'sonarr'].includes(integrationType) ? 'calendar' : integrationType;
  const stored = await prisma.widgetPermission.findUnique({ where: { widgetType } });
  let roles: unknown = DEFAULT_WIDGET_ROLES[widgetType] ?? ['admin'];
  if (stored) {
    try { roles = JSON.parse(stored.roles); } catch { roles = []; }
  }
  if (!Array.isArray(roles) || !roles.includes(user.role)) {
    throw new ApiSecurityError('Integration not found', 404, 'integration_not_found');
  }
}
