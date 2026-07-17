import prisma from '@mantemap/database';
import type { User, PrismaClient } from '@mantemap/database';

/**
 * Find a user by normalized email.
 * Returns null when no user matches.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Count all users in the system.
 * Used to determine first-user ADMIN bootstrap eligibility.
 * Accepts an optional transaction client for serializable isolation.
 */
export async function countUsers(tx?: PrismaClient): Promise<number> {
  const client = tx ?? prisma;
  return client.user.count();
}

/**
 * Create a user inside a transaction context.
 * Accepts an optional transaction client; falls back to the global prisma client.
 */
export async function createUser(
  data: {
    name: string;
    email: string;
    passwordHash: string;
    role: 'ADMIN' | 'PROJECT_MANAGER' | 'TECHNICIAN' | 'VIEWER';
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  },
  tx?: PrismaClient
): Promise<User> {
  const client = tx ?? prisma;
  return client.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      status: data.status ?? 'ACTIVE',
    },
  });
}
