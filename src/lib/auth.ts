import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { loginSchema } from './validations';
import type { Role } from '@prisma/client';

const attempts = new Map<string, { count: number; ts: number }>();

function isRateLimited(email: string) {
  const now = Date.now();
  const hit = attempts.get(email);
  if (!hit) return false;
  if (now - hit.ts > 10 * 60 * 1000) {
    attempts.delete(email);
    return false;
  }
  return hit.count >= 5;
}

function trackFail(email: string) {
  const prev = attempts.get(email);
  attempts.set(email, { count: (prev?.count || 0) + 1, ts: Date.now() });
}

const DEFAULT_ROLE: Role = 'EMPLOYEE';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        if (isRateLimited(parsed.data.email)) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: { id: true, email: true, name: true, role: true, passwordHash: true, organizationId: true, isActive: true }
        });

        if (!user || !user.isActive) {
          trackFail(parsed.data.email);
          return null;
        }

        const match = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!match) {
          trackFail(parsed.data.email);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          isActive: user.isActive
        };
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true, organizationId: true, isActive: true }
        });

        token.role = dbUser?.role ?? DEFAULT_ROLE;
        token.organizationId = dbUser?.organizationId;
        token.isActive = dbUser?.isActive ?? false;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? '';
        session.user.role = token.role ?? DEFAULT_ROLE;
        session.user.organizationId = token.organizationId ?? '';
        session.user.isActive = token.isActive ?? false;
      }
      return session;
    }
  }
};
