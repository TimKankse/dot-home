import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { channels, clientId, clientSecret } = await request.json();

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return NextResponse.json({ data: [] });
  }

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Twitch credentials not configured' }, { status: 500 });
  }

  try {
    // 1. Get App Access Token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    });

    const tokenRes = await fetch(`https://id.twitch.tv/oauth2/token?${tokenParams.toString()}`, {
      method: 'POST',
    });

    if (!tokenRes.ok) {
      throw new Error('Failed to get Twitch access token');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Get Streams
    // Construct query string: user_login=user1&user_login=user2...
    const queryParams = new URLSearchParams();
    channels.forEach((channel: string) => queryParams.append('user_login', channel));

    const streamsRes = await fetch(`https://api.twitch.tv/helix/streams?${queryParams.toString()}`, {
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!streamsRes.ok) {
      throw new Error('Failed to fetch streams');
    }

    const streamsData = await streamsRes.json();

    // 3. Get User Info (for profile pictures)
    const userQueryParams = new URLSearchParams();
    channels.forEach((channel: string) => userQueryParams.append('login', channel));

    const usersRes = await fetch(`https://api.twitch.tv/helix/users?${userQueryParams.toString()}`, {
        headers: {
            'Client-ID': clientId,
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    // Merge data - We want to return ALL users, with their stream info if live
    const streamMap: Record<string, any> = {};
    streamsData.data.forEach((stream: any) => {
        streamMap[stream.user_login] = stream;
    });

    const combinedData = [];
    if (usersRes.ok) {
        const usersData = await usersRes.json();
        combinedData.push(...usersData.data.map((user: any) => ({
            user_login: user.login,
            user_name: user.display_name,
            profile_image_url: user.profile_image_url,
            is_live: !!streamMap[user.login],
            stream: streamMap[user.login] || null
        })));
    }

    return NextResponse.json({ data: combinedData });

  } catch (error) {
    console.error('Twitch API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch Twitch data' }, { status: 500 });
  }
}
