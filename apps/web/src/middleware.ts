import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

/**
 * Edge-safe middleware.
 *
 * Protects UI routes (dashboard, projects) by checking the JWT session.
 * Does NOT import Node-only modules (Prisma, bcryptjs, services).
 * Every API route and service performs its own authoritative session check.
 */
const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth (NextAuth routes)
     * - api/health (healthcheck)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - login, register (public auth pages)
     */
    '/((?!api/auth|api/health|_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt|login|register).*)',
  ],
};
