import { NextResponse } from 'next/server';

import { apiSecurityErrorResponse, ApiSecurityError } from '@/lib/api-security';
import {
  requireIntegrationConfigString,
  resolveRequestIntegration,
} from '@/lib/integration-connection';
import { fetchOutbound } from '@/lib/outbound-http';

const MAX_CHANNELS = 100;
const CHANNEL_PATTERN = /^[a-zA-Z0-9_]{1,25}$/;
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

interface TwitchStream {
  user_login: string;
  user_name: string;
  game_name: string;
  viewer_count: number;
  title: string;
  started_at: string;
}

interface TwitchUser {
  login: string;
  display_name: string;
  profile_image_url: string;
}

const parseChannels = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new ApiSecurityError('Channels must be an array', 400, 'invalid_channels');
  }
  const channels = [...new Set(value.map((channel) =>
    typeof channel === 'string' ? channel.trim().toLowerCase() : '',
  ))].filter(Boolean);
  if (channels.length > MAX_CHANNELS || channels.some((channel) => !CHANNEL_PATTERN.test(channel))) {
    throw new ApiSecurityError('Invalid Twitch channel list', 400, 'invalid_channels');
  }
  return channels;
};

async function getAccessToken(
  integrationId: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const cached = tokenCache.get(integrationId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  });
  const response = await fetchOutbound(
    'https://id.twitch.tv/oauth2/token',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    },
    { policy: 'public-internet' },
  );
  if (!response.ok) {
    throw new ApiSecurityError('Twitch authentication failed', 502, 'upstream_auth_failed');
  }
  const data = await response.json() as { access_token?: unknown; expires_in?: unknown };
  if (typeof data.access_token !== 'string') {
    throw new ApiSecurityError('Twitch authentication failed', 502, 'upstream_auth_failed');
  }
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  tokenCache.set(integrationId, {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
  });
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const integration = await resolveRequestIntegration(request, 'twitch');
    const body = await request.json() as { channels?: unknown };
    const channels = parseChannels(body.channels);
    if (channels.length === 0) return NextResponse.json({ data: [] });

    const clientId = requireIntegrationConfigString(integration, 'clientId');
    const clientSecret = requireIntegrationConfigString(integration, 'clientSecret');
    const accessToken = await getAccessToken(integration.id, clientId, clientSecret);
    const headers = {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    };
    const streamsUrl = new URL('https://api.twitch.tv/helix/streams');
    const usersUrl = new URL('https://api.twitch.tv/helix/users');
    channels.forEach((channel) => {
      streamsUrl.searchParams.append('user_login', channel);
      usersUrl.searchParams.append('login', channel);
    });

    const [streamsResponse, usersResponse] = await Promise.all([
      fetchOutbound(
        streamsUrl,
        { headers, cache: 'no-store' },
        { policy: 'public-internet' },
      ),
      fetchOutbound(
        usersUrl,
        { headers, cache: 'no-store' },
        { policy: 'public-internet' },
      ),
    ]);
    if (!streamsResponse.ok || !usersResponse.ok) {
      if ([401, 403].includes(streamsResponse.status) || [401, 403].includes(usersResponse.status)) {
        tokenCache.delete(integration.id);
      }
      throw new ApiSecurityError('Twitch request failed', 502, 'upstream_request_failed');
    }

    const streamsData = await streamsResponse.json() as { data?: TwitchStream[] };
    const usersData = await usersResponse.json() as { data?: TwitchUser[] };
    const streamMap = new Map(
      (streamsData.data || []).map((stream) => [stream.user_login.toLowerCase(), stream]),
    );
    const combined = (usersData.data || []).map((user) => ({
      user_login: user.login,
      user_name: user.display_name,
      profile_image_url: user.profile_image_url,
      is_live: streamMap.has(user.login.toLowerCase()),
      stream: streamMap.get(user.login.toLowerCase()) || null,
    }));
    return NextResponse.json({ data: combined });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch Twitch data');
  }
}
