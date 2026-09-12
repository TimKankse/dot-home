import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { normalizeEmail } from '@/lib/passwords';

export class UserAdministrationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'UserAdministrationError';
  }
}

type ManagedUserUpdate = {
  email?: string;
  displayName?: string;
  role?: 'admin' | 'member' | 'viewer';
  disabled?: boolean;
};

export async function updateManagedUser(
  actor: { id: string; role: string },
  userId: string,
  input: ManagedUserUpdate,
) {
  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        disabledAt: true,
      },
    });
    if (!target) throw new UserAdministrationError('User not found', 404);

    const isSelf = actor.id === userId;
    const isAdmin = actor.role === 'admin';
    if (!isAdmin && !isSelf) {
      throw new UserAdministrationError('Forbidden', 403);
    }
    if (!isAdmin && (input.email !== undefined || input.role !== undefined || input.disabled !== undefined)) {
      throw new UserAdministrationError('Only admins can change account access', 403);
    }
    if (isSelf && input.disabled === true) {
      throw new UserAdministrationError('Cannot disable your own account', 400);
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.displayName !== undefined) data.displayName = input.displayName || null;

    let emailChanged = false;
    if (input.email !== undefined) {
      const email = normalizeEmail(input.email);
      if (!email) throw new UserAdministrationError('Email is required', 400);
      emailChanged = email !== target.email;
      if (emailChanged) {
        const existingUser = await transaction.user.findFirst({
          where: { email, id: { not: userId } },
          select: { id: true },
        });
        if (existingUser) throw new UserAdministrationError('Email already in use', 400);
        data.email = email;
      }
    }

    const roleChanged = input.role !== undefined && input.role !== target.role;
    if (input.role !== undefined) data.role = input.role;

    const currentlyDisabled = target.disabledAt !== null;
    const disabledChanged = input.disabled !== undefined && input.disabled !== currentlyDisabled;
    if (input.disabled !== undefined) data.disabledAt = input.disabled ? new Date() : null;

    const removesActiveAdmin = (
      target.role === 'admin' &&
      !currentlyDisabled &&
      ((input.role !== undefined && input.role !== 'admin') || input.disabled === true)
    );
    if (removesActiveAdmin) {
      const activeAdminCount = await transaction.user.count({
        where: { role: 'admin', disabledAt: null },
      });
      if (activeAdminCount <= 1) {
        throw new UserAdministrationError('Cannot remove the last active admin', 400);
      }
    }

    if (Object.keys(data).length === 0) {
      throw new UserAdministrationError('No valid fields to update', 400);
    }

    if (emailChanged || roleChanged || disabledChanged) {
      data.sessionVersion = { increment: 1 };
    }

    const user = await transaction.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        disabledAt: true,
        updatedAt: true,
      },
    });

    if (emailChanged) {
      await transaction.passwordResetToken.deleteMany({ where: { userId } });
    }

    return { ...user, disabled: user.disabledAt !== null };
  }, {
    isolationLevel: 'Serializable' as Prisma.TransactionIsolationLevel,
  });
}
