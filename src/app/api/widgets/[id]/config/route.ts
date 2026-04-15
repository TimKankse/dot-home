/**
 * Widget User Config API
 *
 * GET /api/widgets/[id]/config - Get current user's config for a widget
 * PUT /api/widgets/[id]/config - Save current user's personal config
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseWidgetUserConfigRequest } from '@/lib/request-parsers';
import { ValidationError, tryParseJsonString } from '@/lib/validation';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get current user's config for a widget
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: widgetId } = await params;

    const userConfig = await prisma.widgetUserConfig.findUnique({
      where: {
        userId_widgetId: {
          userId: session.user.id,
          widgetId,
        },
      },
    });

    if (!userConfig) {
      // No personal config exists, return null (widget will use shared config)
      return NextResponse.json({ config: null });
    }

    return NextResponse.json({
      config: tryParseJsonString(userConfig.config, null),
    });
  } catch (error) {
    console.error('Error fetching widget user config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch config' },
      { status: 500 }
    );
  }
}

// PUT - Save current user's personal config
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: widgetId } = await params;
    const { config } = parseWidgetUserConfigRequest(await request.json());

    // Upsert the user's config
    const userConfig = await prisma.widgetUserConfig.upsert({
      where: {
        userId_widgetId: {
          userId: session.user.id,
          widgetId,
        },
      },
      update: {
        config: JSON.stringify(config),
      },
      create: {
        userId: session.user.id,
        widgetId,
        config: JSON.stringify(config),
      },
    });

    return NextResponse.json({
      config: tryParseJsonString(userConfig.config, null),
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error saving widget user config:', error);
    return NextResponse.json(
      { error: 'Failed to save config' },
      { status: 500 }
    );
  }
}

// DELETE - Remove user's personal config (revert to shared config)
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: widgetId } = await params;

    await prisma.widgetUserConfig.delete({
      where: {
        userId_widgetId: {
          userId: session.user.id,
          widgetId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // If config doesn't exist, that's fine
    console.error('Error deleting widget user config:', error);
    return NextResponse.json({ success: true });
  }
}
