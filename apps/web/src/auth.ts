import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from '@/auth.config';
import { credentialsProviderConfig } from '@/auth.providers';

/**
 * Full NextAuth configuration (Node runtime).
 *
 * Adds the Credentials provider and Prisma-backed service calls.
 * This file must NOT be imported from middleware or edge routes.
 *
 * The authorize callback is extracted to `lib/auth/authorize.ts` so it
 * can be tested directly in vitest without importing next/server.
 *
 * The provider configuration is exported from `auth.providers.ts` so
 * integration tests can verify the exact same object/function that
 * production uses, without importing NextAuth (which pulls in next/server).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials(credentialsProviderConfig),
  ],
});
