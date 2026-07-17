import bcrypt from 'bcryptjs';
import { registerUserSchema, type RegisterUserInput } from '@mantemap/validation';
import { ConflictError } from '@mantemap/shared';
import { findUserByEmail, countUsers, createUser } from '@/lib/repositories/user-repository';
import { runSerializable, type RunSerializableOptions } from '@/lib/repositories/transaction-repository';

/** bcrypt cost factor — pinned at 12 per design decision */
export const PASSWORD_HASH_COST = 12;

/**
 * Hash a plaintext password with bcrypt at the configured cost.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_HASH_COST);
}

/**
 * Register a new user.
 *
 * - Normalizes email (lowercase, trimmed) via Zod transform.
 * - Hashes password with bcrypt cost 12.
 * - First user in an empty system atomically receives ADMIN role.
 * - Subsequent users receive the default TECHNICIAN role.
 * - P2034 serialization failures are retried up to 3 times.
 * - Duplicate emails produce a ConflictError (409).
 * - No partial user is ever exposed on failure.
 *
 * @param input   - validated registration DTO
 * @param options - optional testing seams forwarded to runSerializable (onBeforeCommit, onRetry)
 * @returns the created user (without passwordHash)
 */
export async function registerUser(
  input: RegisterUserInput,
  options?: Pick<RunSerializableOptions, 'onBeforeCommit' | 'onRetry' | 'simulateP2034'>
): Promise<{ user: { id: string; name: string | null; email: string; role: string; status: string } }> {
  // Validate and normalize
  const parsed = registerUserSchema.parse(input);

  // Check for duplicate email BEFORE the transaction
  const existing = await findUserByEmail(parsed.email);
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  // Hash outside the transaction to keep tx window minimal
  const passwordHash = await hashPassword(parsed.password);

  // Serializable transaction: count + create atomically for first-user bootstrap
  const user = await runSerializable(async (tx) => {
    const totalUsers = await countUsers(tx);
    const role = totalUsers === 0 ? 'ADMIN' : 'TECHNICIAN';

    return createUser(
      {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role,
      },
      tx
    );
  }, options);

  // Return minimal user data — never expose passwordHash
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
  };
}
