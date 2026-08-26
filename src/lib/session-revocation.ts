import type { JWT } from 'next-auth/jwt';
import { prisma } from './db';

type SessionToken = Pick<JWT, 'id' | 'sessionVersion'>;

export const getSessionVersion = (token: SessionToken): number =>
  typeof token.sessionVersion === 'number' ? token.sessionVersion : 0;

export const isSessionTokenCurrent = async (token: SessionToken): Promise<boolean> => {
  if (typeof token.id !== 'string' || !token.id) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { sessionVersion: true },
  });

  return Boolean(user && user.sessionVersion === getSessionVersion(token));
};

export const updatePasswordAndRevokeSessions = async (
  userId: string,
  passwordHash: string,
): Promise<void> => {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId },
    }),
  ]);
};
