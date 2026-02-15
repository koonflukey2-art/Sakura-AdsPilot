import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
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

const DEFAULT_ROLE: Role = 'VIEWER';

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
          select: { id: true, email: true, name: true, role: true, passwordHash: true }
        });

        if (!user) {
          trackFail(parsed.data.email);
          return null;
        }

        const match = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!match) {
          trackFail(parsed.data.email);
          return null;
        }

        // ✅ คืน role ได้ตอน credentials login (ดี)
        return { id: user.id, email: user.email, name: user.name, role: user.role } as any;
      }
    }),

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
          })
        ]
      : [])
  ],

  callbacks: {
    async jwt({ token, user }) {
      // ตอน sign-in จะมี user เข้ามา (credentials หรือ oauth)
      if (user?.id) {
        token.id = user.id as string;

        // ❗ อย่าดึง role จาก user โดยตรง เพราะ AdapterUser (Google) ไม่มี role
        // ✅ ดึงจาก DB เป็น source of truth
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true }
        });

        token.role = (dbUser?.role ?? DEFAULT_ROLE) as Role;
      } else {
        // กรณี refresh token/session: ถ้า token มี id แต่ role หาย ให้เติมจาก DB
        if (token?.id && !token.role) {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true }
          });
          token.role = (dbUser?.role ?? DEFAULT_ROLE) as Role;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id ?? '') as string;
        session.user.role = (token.role ?? DEFAULT_ROLE) as Role;
      }
      return session;
    }
  }
};
