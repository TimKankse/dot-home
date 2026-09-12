import type { Prisma } from '@prisma/client';

import { getBootstrapSecret } from '@/lib/bootstrap-security';
import { prisma } from '@/lib/db';

const APP_STATE_ID = 'singleton';

export async function getSetupState(): Promise<{ needsSetup: boolean }> {
  const state = await prisma.$transaction(async (transaction) => {
    const userCount = await transaction.user.count();
    const state = await transaction.appState.upsert({
      where: { id: APP_STATE_ID },
      create: {
        id: APP_STATE_ID,
        bootstrapClaimedAt: userCount > 0 ? new Date() : null,
      },
      update: {},
    });

    if (userCount > 0 && state.bootstrapClaimedAt === null) {
      await transaction.appState.update({
        where: { id: APP_STATE_ID },
        data: { bootstrapClaimedAt: new Date() },
      });
    }

    return {
      needsSetup: userCount === 0 && state.bootstrapClaimedAt === null,
    };
  });

  // Ensure a fresh deployment has a retrievable credential before rendering
  // the setup form. The value itself is never returned over HTTP or logged.
  if (state.needsSetup) getBootstrapSecret();
  return state;
}

export async function createInitialAdmin(input: {
  email: string;
  displayName: string | null;
  passwordHash: string;
  dashboardLayout: string;
}) {
  return prisma.$transaction(async (transaction) => {
    const userCount = await transaction.user.count();
    const state = await transaction.appState.upsert({
      where: { id: APP_STATE_ID },
      create: {
        id: APP_STATE_ID,
        bootstrapClaimedAt: userCount > 0 ? new Date() : null,
      },
      update: {},
    });

    if (userCount > 0) {
      if (state.bootstrapClaimedAt === null) {
        await transaction.appState.update({
          where: { id: APP_STATE_ID },
          data: { bootstrapClaimedAt: new Date() },
        });
      }
      return null;
    }

    const claim = await transaction.appState.updateMany({
      where: { id: APP_STATE_ID, bootstrapClaimedAt: null },
      data: { bootstrapClaimedAt: new Date() },
    });
    if (claim.count !== 1) return null;

    const user = await transaction.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        passwordHash: input.passwordHash,
        role: 'admin',
      },
    });

    await transaction.dashboard.create({
      data: {
        userId: user.id,
        name: 'Main',
        layout: input.dashboardLayout,
        isDefault: true,
      },
    });

    return user;
  }, {
    isolationLevel: 'Serializable' as Prisma.TransactionIsolationLevel,
  });
}
