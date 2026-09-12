import type { JWT } from 'next-auth/jwt';
import { prisma } from './db';

type SessionToken = Pick<JWT, 'id' | 'sessionVersion'> & Partial<Pick<JWT, 'role'>>;

export const getSessionVersion = (token: SessionToken): number =>
  typeof token.sessionVersion === 'number' ? token.sessionVersion : 0;

export const isSessionTokenCurrent = async (token: SessionToken): Promise<boolean> => {
  if (typeof token.id !== 'string' || !token.id) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { sessionVersion: true, role: true, disabledAt: true },
  });

  return Boolean(
    user &&
    user.disabledAt === null &&
    typeof token.role === 'string' &&
    user.role === token.role &&
    user.sessionVersion === getSessionVersion(token),
  );
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
