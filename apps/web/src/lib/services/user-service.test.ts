import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  registerUser,
  hashPassword,
  PASSWORD_HASH_COST,
} from './user-service';

// Mock the repository layer
vi.mock('@/lib/repositories/user-repository', () => ({
  createUser: vi.fn(),
  countUsers: vi.fn(),
  findUserByEmail: vi.fn(),
}));

vi.mock('@/lib/repositories/transaction-repository', () => ({
  runSerializable: vi.fn(),
}));

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
  hash: vi.fn(),
  compare: vi.fn(),
}));

import bcrypt from 'bcryptjs';
import * as userRepo from '@/lib/repositories/user-repository';
import * as txRepo from '@/lib/repositories/transaction-repository';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// hashPassword
// ---------------------------------------------------------------------------
describe('hashPassword', () => {
  it('hashes with bcrypt cost 12', async () => {
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2a$12$hash');

    const result = await hashPassword('StrongP4ss!');

    expect(bcrypt.hash).toHaveBeenCalledWith('StrongP4ss!', 12);
    expect(result).toBe('$2a$12$hash');
  });

  it('exports PASSWORD_HASH_COST as 12', () => {
    expect(PASSWORD_HASH_COST).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------
describe('registerUser', () => {
  const validInput = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'StrongP4ss!',
  };

  const mockCreatedUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'ADMIN',
    status: 'ACTIVE',
  };

  function setupMocks(options: { userCount?: number; existingUser?: unknown; createUserError?: Error } = {}) {
    const { userCount = 0, existingUser = null, createUserError } = options;

    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2a$12$hash');
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(existingUser);
    (userRepo.countUsers as ReturnType<typeof vi.fn>).mockResolvedValue(userCount);

    if (createUserError) {
      (txRepo.runSerializable as ReturnType<typeof vi.fn>).mockRejectedValue(createUserError);
    } else {
      (txRepo.runSerializable as ReturnType<typeof vi.fn>).mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) => fn({})
      );
      (userRepo.createUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreatedUser);
    }
  }

  it('creates a user with normalized email and hashed password', async () => {
    setupMocks();

    const result = await registerUser(validInput);

    expect(result.user.email).toBe('john@example.com');
    expect(result.user.role).toBe('ADMIN');
    expect(result.user.status).toBe('ACTIVE');
    expect(bcrypt.hash).toHaveBeenCalledWith('StrongP4ss!', 12);
  });

  it('assigns ADMIN role to the first registered user', async () => {
    setupMocks({ userCount: 0 });
    (userRepo.createUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockCreatedUser,
      role: 'ADMIN',
    });

    const result = await registerUser(validInput);

    expect(result.user.role).toBe('ADMIN');
    expect(userRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'ADMIN' }),
      expect.anything()
    );
  });

  it('assigns TECHNICIAN role to subsequent users', async () => {
    setupMocks({ userCount: 5 });
    (userRepo.createUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockCreatedUser,
      id: 'user-2',
      role: 'TECHNICIAN',
    });

    const result = await registerUser({
      name: 'Second User',
      email: 'second@example.com',
      password: 'StrongP4ss!',
    });

    expect(result.user.role).toBe('TECHNICIAN');
    expect(userRepo.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'TECHNICIAN' }),
      expect.anything()
    );
  });

  it('throws ConflictError for duplicate email (409)', async () => {
    setupMocks({ existingUser: { id: 'existing', email: 'john@example.com' } });

    await expect(registerUser(validInput)).rejects.toThrow(/already exists|conflict/i);
  });

  it('propagates P2034 exhaustion from runSerializable as a throw', async () => {
    const p2034Error = Object.assign(new Error('Serialization failure'), { code: 'P2034' });
    setupMocks({ createUserError: p2034Error });

    await expect(registerUser(validInput)).rejects.toThrow('Serialization failure');
  });

  it('handles concurrent first-user registration to produce exactly one ADMIN', async () => {
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2a$12$hash');
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    let userCount = 0;
    (userRepo.countUsers as ReturnType<typeof vi.fn>).mockImplementation(async () => userCount);

    (userRepo.createUser as ReturnType<typeof vi.fn>).mockImplementation(
      async (data: { name?: string; email?: string; role: string }) => {
        userCount++;
        return {
          id: `user-${userCount}`,
          name: data.name ?? `User ${userCount}`,
          email: data.email ?? `user${userCount}@example.com`,
          role: data.role,
          status: 'ACTIVE',
        };
      }
    );

    (txRepo.runSerializable as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({})
    );

    const result1 = await registerUser({
      name: 'User 1',
      email: 'user1@example.com',
      password: 'StrongP4ss!',
    });
    const result2 = await registerUser({
      name: 'User 2',
      email: 'user2@example.com',
      password: 'StrongP4ss!',
    });

    const roles = [result1.user.role, result2.user.role];
    const adminCount = roles.filter((r) => r === 'ADMIN').length;
    expect(adminCount).toBe(1);
  });

  it('does not expose partial user data on transaction failure', async () => {
    setupMocks({ createUserError: new Error('Database connection lost') });

    await expect(registerUser(validInput)).rejects.toThrow();
  });

  it('never exposes passwordHash in the response', async () => {
    setupMocks();

    const result = await registerUser(validInput);

    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).toHaveProperty('id');
    expect(result.user).toHaveProperty('email');
    expect(result.user).toHaveProperty('role');
  });
});
