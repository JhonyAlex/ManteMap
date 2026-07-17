import { loginUserSchema } from '@mantemap/validation';
import { authenticateUser, type AuthUser } from '@/lib/services/auth-service';

/**
 * Authorize callback extracted for testability.
 *
 * This is the EXACT logic used by the Credentials provider in auth.ts.
 * Extracted here so integration tests can invoke the real authorize path
 * without importing NextAuth (which pulls in next/server and breaks vitest).
 *
 * Steps:
 * 1. Validate credentials with loginUserSchema (Zod)
 * 2. Authenticate via authenticateUser (bcrypt + Prisma)
 * 3. Return minimal NextAuth User shape or null
 */
export async function authorizeCredentials(
  credentials: unknown
): Promise<{ id: string; email: string; name: string | null; role: string } | null> {
  const parsed = loginUserSchema.safeParse(credentials);
  if (!parsed.success) {
    return null;
  }

  const { email, password } = parsed.data;
  const user: AuthUser | null = await authenticateUser(email, password);

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
