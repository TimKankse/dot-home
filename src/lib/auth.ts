import { createHash } from 'node:crypto';
import { loginAccountLimit, loginGlobalLimit, loginConcurrency } from './request-limits';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import { normalizeEmail, verifyPassword } from './passwords';
import { isSessionTokenCurrent } from './session-revocation';
import { recordValidatedSession } from './validated-session';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (typeof credentials?.email !== 'string' || typeof credentials?.password !== 'string' ||
          !credentials.email || !credentials.password || credentials.email.length > 320 || credentials.password.length > 1024) {
          return null;
        }

        const account = createHash('sha256').update(normalizeEmail(credentials.email)).digest('hex');
        if (!loginGlobalLimit.allow('login') || !loginAccountLimit.allow(account)) return null;
        const release = loginConcurrency.acquire(account);
        if (!release) return null;
        try {
          const user = await prisma.user.findUnique({
            where: { email: normalizeEmail(credentials.email) },
          });

          if (!user || user.disabledAt) {
            return null;
          }

          const isValid = await verifyPassword(credentials.password, user.passwordHash);

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.displayName || user.email,
            role: user.role,
            sessionVersion: user.sessionVersion,
          };
        } finally { release(); }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.email = user.email;
        token.name = user.name;
        token.sessionVersion = user.sessionVersion;
        token.sessionInvalidated = false;
      } else if (token.id) {
        token.sessionInvalidated = !(await isSessionTokenCurrent(token));
      }

      if (trigger === 'update' && !token.sessionInvalidated) {
        if (typeof session?.email === 'string') {
          token.email = session.email;
        }

        if (typeof session?.name === 'string') {
          token.name = session.name;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.sessionInvalidated) {
        return null as never;
      }

      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = (token.name as string) || session.user.email;
        if (token.sessionInvalidated === false && typeof token.id === 'string' && typeof token.role === 'string') {
          recordValidatedSession(session, { id: token.id, role: token.role });
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
