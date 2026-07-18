import type { NextAuthConfig } from 'next-auth';

/**
 * Edge-safe NextAuth configuration.
 *
 * This config is imported by middleware and must NOT contain
 * Node-only modules (Prisma, bcryptjs, etc.).
 *
 * Credentials provider and callbacks are added in auth.ts (Node runtime).
 */

const isSecureEnv =
  process.env.AUTH_URL?.startsWith('https://') ||
  process.env.NODE_ENV === 'production';

export const authConfig = {
  trustHost: true,
  debug: !isSecureEnv,
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      options: {
        secure: isSecureEnv,
        sameSite: 'lax',
      },
    },
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      const isOnProjects = nextUrl.pathname.startsWith('/projects');

      if (isOnDashboard || isOnProjects) {
        if (isLoggedIn) return true;
        console.log(
          '[middleware] BLOCKED — no session. AUTH_URL=',
          process.env.AUTH_URL,
          'NODE_ENV=',
          process.env.NODE_ENV,
          'secure cookies=',
          isSecureEnv,
          'path=',
          nextUrl.pathname
        );
        return false; // Redirect unauthenticated users to login
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        console.log('[auth] JWT callback — creating token for:', user.email);
        // Design: JWT contains only sub, email, name, and role.
        // Auth.js sets token.sub from user.id automatically.
        token.email = user.email as string;
        token.name = user.name as string | null;
        token.role = user.role as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        // Map token.sub (Auth.js identity claim) to session.user.id
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
