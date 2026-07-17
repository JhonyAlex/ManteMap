import { authorizeCredentials } from '@/lib/auth/authorize';

/**
 * The EXACT provider configuration that auth.ts passes to Credentials().
 *
 * Exported as a narrow testable named export so integration tests can
 * verify the actual authorize callback without importing NextAuth
 * (which pulls in next/server and breaks vitest).
 *
 * auth.ts wraps this in Credentials() — the authorize function here
 * is functionally identical to the one configured in auth.ts.
 *
 * Security properties enforced by this config:
 *   - Zod schema validation (loginUserSchema) before DB access
 *   - bcrypt constant-time comparison (timing-attack safe)
 *   - Dummy-hash comparison for unknown emails (timing-attack safe)
 *   - ACTIVE status check (inactive/suspended users rejected)
 *   - Returns minimal claims only: id, email, name, role
 */
export const credentialsProviderConfig = {
  name: 'credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  authorize: authorizeCredentials,
};

/**
 * Returns the authorize callback configured on the Credentials provider.
 *
 * This is the exact function that NextAuth invokes when a user submits
 * credentials via the login form. Testing this function tests the real
 * authorize path — schema validation, bcrypt comparison, user lookup,
 * status check — against the real database seam.
 */
export function getProviderAuthorize() {
  return credentialsProviderConfig.authorize;
}
