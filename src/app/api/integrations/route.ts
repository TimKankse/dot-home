import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encryptSensitiveFields } from '@/utils/crypto';
import { redactSensitiveFields } from '@/utils/sensitive-config';

export const dynamic = 'force-dynamic';

// GET: Fetch all integrations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const integrations = await prisma.integration.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    });

    // Parse config JSON but DO NOT decrypt sensitive fields for the client
    // We only want to send non-sensitive config like 'url' or 'externalUrl'
    const parsed = integrations.map((i: typeof integrations[number]) => {
      const safeConfig = redactSensitiveFields(JSON.parse(i.config), 'mask');

      return {
        id: i.id,
        name: i.name,
        type: i.type,
        config: safeConfig, // Return masked/safe config
      };
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// POST: Create a new integration
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins and members can create integrations
    if (session.user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Viewers cannot create integrations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, type, config } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Encrypt sensitive fields in config
    const encryptedConfig = encryptSensitiveFields(config || {});

    const integration = await prisma.integration.create({
      data: {
        id: id || undefined, // Use provided ID or let Prisma generate one
        userId: session.user.id,
        name,
        type,
        config: JSON.stringify(encryptedConfig),
      },
    });

    return NextResponse.json({
      id: integration.id,
      name: integration.name,
      type: integration.type,
      config: redactSensitiveFields(JSON.parse(integration.config), 'mask'),
    });
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

// PUT: Update an integration
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Viewers cannot update integrations' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name, type, config } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.integration.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Check for masked values ('********') and restore them from existing config
    // The GET endpoint masks sensitive values with '********'
    // If the user didn't change them, they come back as '********'
    const processedConfig = { ...config };
    const existingConfigEncrypted = JSON.parse(existing.config);

    if (processedConfig) {
      Object.keys(processedConfig).forEach((key) => {
        // If value is masked, try to restore from existing encrypted config
        if (processedConfig[key] === '********' && existingConfigEncrypted[key]) {
          processedConfig[key] = existingConfigEncrypted[key];
        }
      });
    }

    // Encrypt sensitive fields (will skip already encrypted values starting with enc:)
    const encryptedConfig = processedConfig
      ? encryptSensitiveFields(processedConfig)
      : JSON.parse(existing.config);

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        name: name || existing.name,
        type: type || existing.type,
        config: JSON.stringify(encryptedConfig),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      config: redactSensitiveFields(JSON.parse(updated.config), 'mask'),
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

// DELETE: Delete an integration
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'viewer') {
      return NextResponse.json(
        { error: 'Viewers cannot delete integrations' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await prisma.integration.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    await prisma.integration.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
