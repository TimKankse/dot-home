import { createHash, randomBytes } from 'crypto';
import { prisma } from './db';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

const hashResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const buildPasswordResetPath = (token: string): string =>
  `/reset-password?token=${encodeURIComponent(token)}`;

export const issuePasswordResetToken = async (userId: string) => {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return {
    token: rawToken,
    expiresAt,
  };
};

export const hasUsablePasswordResetToken = async (token: string): Promise<boolean> => {
  const passwordResetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  if (!passwordResetToken) {
    return false;
  }

  if (passwordResetToken.expiresAt <= new Date()) {
    await prisma.passwordResetToken.deleteMany({
      where: { id: passwordResetToken.id },
    });
    return false;
  }

  return true;
};

export const consumePasswordResetToken = async (
  token: string,
  passwordHash: string,
): Promise<boolean> => {
  const now = new Date();
  const tokenHash = hashResetToken(token);

  return prisma.$transaction(async (transaction) => {
    const passwordResetToken = await transaction.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!passwordResetToken || passwordResetToken.expiresAt <= now) {
      if (passwordResetToken) {
        await transaction.passwordResetToken.deleteMany({
          where: { id: passwordResetToken.id },
        });
      }
      return false;
    }

    const consumed = await transaction.passwordResetToken.deleteMany({
      where: {
        id: passwordResetToken.id,
        tokenHash,
        expiresAt: { gt: now },
      },
    });

    if (consumed.count !== 1) {
      return false;
    }

    await transaction.user.update({
      where: { id: passwordResetToken.userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    });

    await transaction.passwordResetToken.deleteMany({
      where: { userId: passwordResetToken.userId },
    });

    return true;
  });
};

export const clearPasswordResetTokensForUser = async (userId: string) => {
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });
};
