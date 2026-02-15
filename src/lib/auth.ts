import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import { loginSchema } from './validations';

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
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user) { trackFail(parsed.data.email); return null; }

        const match = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!match) { trackFail(parsed.data.email); return null; }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
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
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role as 'ADMIN' | 'MARKETER' | 'VIEWER';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  }
};
