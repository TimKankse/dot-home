import { createHash, randomBytes } from 'crypto';
import { prisma } from './db';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const PASSWORD_RESET_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_RESET_EMAIL_LIMIT = 3;
const PASSWORD_RESET_IP_LIMIT = 10;

interface PasswordResetUser {
  id: string;
  email: string;
  displayName: string | null;
}

interface PasswordResetNotificationPayload {
  initiatedBy: 'admin' | 'self-service';
  user: PasswordResetUser;
  resetUrl: string;
  expiresAt: Date;
}

const hashResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const getConfiguredAppOrigin = (): string | null => {
  const value = process.env.NEXTAUTH_URL?.trim();
  if (!value) {
    return null;
  }

  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('NEXTAUTH_URL must use http or https');
  }

  return url.origin;
};

export const getAdminContactEmail = (): string | null => {
  const value = process.env.ADMIN_CONTACT_EMAIL?.trim();
  return value || null;
};

export const hasAutomatedPasswordResetDelivery = (): boolean =>
  Boolean(process.env.PASSWORD_RESET_WEBHOOK_URL?.trim());

export const getAppOrigin = (request?: Request): string => {
  const configuredOrigin = getConfiguredAppOrigin();
  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_URL is required to create password reset links in production');
  }

  return request ? new URL(request.url).origin : 'http://localhost:3000';
};

export const buildPasswordResetUrl = (
  token: string,
  request?: Request,
): string => `${getAppOrigin(request)}/reset-password?token=${encodeURIComponent(token)}`;

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

const getClientIp = (request: Request): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('x-real-ip')?.trim() || null;
};

export interface PasswordResetRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export const checkPasswordResetRateLimit = async (
  request: Request,
  email: string,
  now = new Date(),
): Promise<PasswordResetRateLimitResult> => {
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_RATE_LIMIT_WINDOW_MS);
  const clientIp = getClientIp(request);
  const limits = [
    {
      keyHash: hashResetToken(`email:${email}`),
      limit: PASSWORD_RESET_EMAIL_LIMIT,
    },
    ...(clientIp
      ? [{
          keyHash: hashResetToken(`ip:${clientIp}`),
          limit: PASSWORD_RESET_IP_LIMIT,
        }]
      : []),
  ];

  return prisma.$transaction(async (transaction) => {
    await transaction.passwordResetRateLimit.deleteMany({
      where: { expiresAt: { lte: now } },
    });

    const consumedLimits = [];
    for (const { keyHash } of limits) {
      consumedLimits.push(await transaction.passwordResetRateLimit.upsert({
        where: { keyHash },
        create: {
          keyHash,
          requestCount: 1,
          expiresAt,
        },
        update: { requestCount: { increment: 1 } },
      }));
    }

    const blockedLimit = consumedLimits.find(
      (consumed, index) => consumed.requestCount > limits[index].limit,
    );

    if (blockedLimit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((blockedLimit.expiresAt.getTime() - now.getTime()) / 1000),
        ),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  });
};

export const clearPasswordResetTokensForUser = async (userId: string) => {
  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });
};

export const sendPasswordResetNotification = async ({
  initiatedBy,
  user,
  resetUrl,
  expiresAt,
}: PasswordResetNotificationPayload): Promise<boolean> => {
  const webhookUrl = process.env.PASSWORD_RESET_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return false;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const webhookSecret = process.env.PASSWORD_RESET_WEBHOOK_SECRET?.trim();
  if (webhookSecret) {
    headers.Authorization = `Bearer ${webhookSecret}`;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      type: 'password_reset',
      initiatedBy,
      user,
      resetUrl,
      expiresAt: expiresAt.toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Password reset delivery failed with status ${response.status}`);
  }

  return true;
};
