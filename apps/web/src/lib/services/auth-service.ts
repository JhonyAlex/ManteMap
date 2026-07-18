import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/repositories/user-repository';

/**
 * Dummy hash used for timing-safe comparison when the email is not found.
 * Prevents attackers from distinguishing "email not found" from "wrong password"
 * by measuring response time.
 */
const DUMMY_HASH = '$2a$12$0000000000000000000000000000000000000000000000000000';

/**
 * Minimal session claims returned on successful authentication.
 * Exposes only what the JWT/session needs — never passwordHash or internal fields.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Authenticate a user by email and password.
 *
 * - Returns minimal AuthUser claims on success.
 * - Returns null for ANY failure: wrong password, unknown email, inactive/suspended user.
 * - Uses a dummy-hash comparison for unknown emails to prevent timing attacks.
 * - Does NOT reveal whether the email exists or why authentication failed.
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser | null> {
  // Normalize email to match registration
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    console.error('[auth-service] No user found for email:', normalizedEmail);
  }

  // Always compare against a hash — real or dummy — to prevent timing leaks
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const passwordMatches = await bcrypt.compare(password, hashToCompare);

  if (!passwordMatches) {
    console.error('[auth-service] Password mismatch for:', normalizedEmail, '(user exists:', !!user, ')');
  }

  if (!user || !passwordMatches) {
    return null;
  }

  // Inactive or suspended users must not receive a session
  if (user.status !== 'ACTIVE') {
    console.error('[auth-service] User not ACTIVE:', normalizedEmail, 'status:', user.status);
    return null;
  }

  // Return only the minimal session claims
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
