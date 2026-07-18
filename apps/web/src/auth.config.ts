import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe NextAuth configuration.
 *
 * This config is imported by middleware and must NOT contain
 * Node-only modules (Prisma, bcryptjs, etc.).
 *
 * Credentials provider and callbacks are added in auth.ts (Node runtime).
 *
 * Cookie security is handled automatically by NextAuth v5 based on AUTH_URL:
 * - https:// → Secure, __Secure- prefixed cookies
 * - http://  → plain cookies (dev only)
 */
export const authConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnProjects = nextUrl.pathname.startsWith('/projects');

      if (isOnDashboard || isOnProjects) {
        if (isLoggedIn) return true;
        console.log(
          '[middleware] BLOCKED — no session for:',
          nextUrl.pathname,
          '| AUTH_URL=',
          process.env.AUTH_URL,
          '| NODE_ENV=',
          process.env.NODE_ENV
        );
        return false;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        console.log('[auth] JWT callback — creating token for:', user.email);
        token.email = user.email as string;
        token.name = user.name as string | null;
        token.role = user.role as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string | null;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt' as const,
  },
  providers: [], // Providers are added in auth.ts
} satisfies NextAuthConfig;
