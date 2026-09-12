import { NextResponse } from 'next/server';

import {
  ApiSecurityError,
  apiSecurityErrorResponse,
  requireApiUser,
  type ApiUser,
} from '@/lib/api-security';
import { prisma } from '@/lib/db';
import { resolveOwnedIntegration } from '@/lib/integration-access';
import {
  INTEGRATION_TYPES,
  parseCreateIntegrationRequest,
  parseIntegrationId,
  parseUpdateIntegrationRequest,
} from '@/lib/integration-validation';
import { isRecord, type JsonRecord } from '@/lib/validation';
import type { IntegrationType } from '@/types/integration';
import { encryptSensitiveFields } from '@/utils/crypto';
import { redactSensitiveFields } from '@/utils/sensitive-config';

export const dynamic = 'force-dynamic';

const requireIntegrationManager = (user: ApiUser): void => {
  if (user.role === 'viewer') {
    throw new ApiSecurityError(
      'Viewers cannot manage integrations',
      403,
      'insufficient_permission',
    );
  }
};

const parseStoredConfig = (value: string): JsonRecord => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (isRecord(parsed)) return parsed;
  } catch {
    // Return the same non-secret error for malformed stored data.
  }

  throw new ApiSecurityError(
    'Integration configuration is invalid',
    500,
    'invalid_integration_config',
  );
};

const integrationResponse = (integration: {
  id: string;
  name: string;
  type: string;
  config: string | JsonRecord;
}) => {
  const config = typeof integration.config === 'string'
    ? parseStoredConfig(integration.config)
    : integration.config;

  return {
    id: integration.id,
    name: integration.name,
    type: integration.type,
    config: redactSensitiveFields(config, 'mask'),
  };
};

export async function GET() {
  try {
    const user = await requireApiUser();
    const integrations = await prisma.integration.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(integrations.map(integrationResponse));
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to fetch integrations');
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser(request);
    requireIntegrationManager(user);
    const body = parseCreateIntegrationRequest(await request.json());
    const integration = await prisma.integration.create({
      data: {
        userId: user.id,
        name: body.name,
        type: body.type,
        config: JSON.stringify(encryptSensitiveFields(body.config)),
      },
    });

    return NextResponse.json(integrationResponse(integration), { status: 201 });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to create integration');
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireApiUser(request);
    requireIntegrationManager(user);
    const rawBody = await request.json() as unknown;
    const rawRecord = isRecord(rawBody) ? rawBody : {};
    const id = parseIntegrationId(rawRecord.id);
    const existing = await resolveOwnedIntegration({
      integrationId: id,
      user,
      expectedTypes: INTEGRATION_TYPES,
    });
    const body = parseUpdateIntegrationRequest(
      rawBody,
      existing.type as IntegrationType,
      existing.config,
    );
    const updated = await prisma.integration.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        config: JSON.stringify(encryptSensitiveFields(body.config)),
      },
    });

    return NextResponse.json(integrationResponse(updated));
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to update integration');
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser(request);
    requireIntegrationManager(user);
    const id = parseIntegrationId(new URL(request.url).searchParams.get('id'));
    const existing = await resolveOwnedIntegration({
      integrationId: id,
      user,
      expectedTypes: INTEGRATION_TYPES,
    });

    await prisma.$transaction(async (transaction) => {
      await transaction.objectPermission.deleteMany({
        where: { objectType: 'integration', objectId: existing.id },
      });
      await transaction.integration.delete({ where: { id: existing.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiSecurityErrorResponse(error, 'Failed to delete integration');
  }
}
