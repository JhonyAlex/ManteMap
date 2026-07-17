import { auth } from '@/auth';
import { unauthorized } from '@/lib/http/api-error';

/**
 * Get the current authenticated session or return null.
 * Use in Server Components and API routes.
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Require an authenticated session.
 * Returns the user or throws a 401 response.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw unauthorized();
  }
  return user;
}

/**
 * Guard an API route handler — returns the user or a 401 response.
 * Use at the top of protected API route handlers.
 */
export async function getAuthUser(): Promise<
  { user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> } | { error: ReturnType<typeof unauthorized> }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: unauthorized() };
  }
  return { user };
}
