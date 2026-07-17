import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import from production code that does NOT yet exist — guarantees RED failure.
import { authenticateUser } from './auth-service';

// Mock the repository layer
vi.mock('@/lib/repositories/user-repository', () => ({
  findUserByEmail: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// authenticateUser
// ---------------------------------------------------------------------------
describe('authenticateUser', () => {

  it('returns user for valid active credentials', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: '$2a$12$realhash',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
    };
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await authenticateUser('john@example.com', 'StrongP4ss!');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('user-1');
    expect(result!.email).toBe('john@example.com');
    expect(result!.role).toBe('TECHNICIAN');
  });

  it('returns null for invalid password (generic failure)', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: '$2a$12$realhash',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
    };
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await authenticateUser('john@example.com', 'WrongPassword1!');

    expect(result).toBeNull();
  });

  it('returns null for unknown email with dummy-hash comparison (timing-safe)', async () => {
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await authenticateUser('nobody@example.com', 'StrongP4ss!');

    expect(result).toBeNull();
    // Must still call bcrypt.compare to prevent timing attacks
    expect(bcrypt.compare).toHaveBeenCalledWith('StrongP4ss!', expect.any(String));
  });

  it('returns null for inactive user (generic failure, no status leak)', async () => {
    const inactiveUser = {
      id: 'user-2',
      email: 'inactive@example.com',
      name: 'Inactive User',
      passwordHash: '$2a$12$realhash',
      role: 'TECHNICIAN',
      status: 'INACTIVE',
    };
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(inactiveUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await authenticateUser('inactive@example.com', 'StrongP4ss!');

    // Inactive users must not receive a session — generic null
    expect(result).toBeNull();
  });

  it('returns null for suspended user (generic failure)', async () => {
    const suspendedUser = {
      id: 'user-3',
      email: 'suspended@example.com',
      name: 'Suspended User',
      passwordHash: '$2a$12$realhash',
      role: 'TECHNICIAN',
      status: 'SUSPENDED',
    };
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(suspendedUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await authenticateUser('suspended@example.com', 'StrongP4ss!');

    expect(result).toBeNull();
  });

  it('does not expose whether email exists in generic failure', async () => {
    // Both paths return null — the caller cannot distinguish
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const unknownResult = await authenticateUser('nobody@example.com', 'StrongP4ss!');

    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      passwordHash: '$2a$12$hash',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
    });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const wrongPwResult = await authenticateUser('john@example.com', 'WrongPassword1!');

    // Both are null — no information leak
    expect(unknownResult).toBeNull();
    expect(wrongPwResult).toBeNull();
  });

  it('returns minimal claims: id, email, name, role only', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      passwordHash: '$2a$12$realhash',
      role: 'ADMIN',
      status: 'ACTIVE',
      image: 'https://example.com/photo.jpg',
      createdAt: new Date(),
    };
    (userRepo.findUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await authenticateUser('john@example.com', 'StrongP4ss!');

    expect(result).not.toBeNull();
    // Must NOT expose passwordHash, image, createdAt, or other internal fields
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('image');
    expect(result).not.toHaveProperty('createdAt');
    // Must expose only the minimal session claims
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('email');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('role');
  });
});
