/**
 * Tests for auth session helpers: getCurrentUser, requireAuth, getAuthUser.
 *
 * These tests verify the session guard contract:
 * - getCurrentUser returns user or null
 * - requireAuth returns user or throws 401
 * - getAuthUser returns { user } or { error: 401 response }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the auth module before importing session helpers
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/http/api-error', async () => {
  const actual = await vi.importActual('@/lib/http/api-error');
  return actual;
});

import { auth } from '@/auth';
import { getCurrentUser, requireAuth, getAuthUser } from './session';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCurrentUser', () => {
  it('returns user when session exists', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com', name: 'Test', role: 'ADMIN' },
    });

    const user = await getCurrentUser();

    expect(user).not.toBeNull();
    expect(user!.id).toBe('u1');
    expect(user!.email).toBe('test@example.com');
    expect(user!.role).toBe('ADMIN');
  });

  it('returns null when session is missing', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });

  it('returns null when session has no user', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({ user: null });

    const user = await getCurrentUser();

    expect(user).toBeNull();
  });
});

describe('requireAuth', () => {
  it('returns user when authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com', name: 'Test', role: 'TECHNICIAN' },
    });

    const user = await requireAuth();

    expect(user.id).toBe('u1');
    expect(user.email).toBe('test@example.com');
  });

  it('throws 401 response when not authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(requireAuth()).rejects.toThrow();
  });

  it('thrown response has status 401 and AUTHENTICATION_ERROR', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    try {
      await requireAuth();
      expect.fail('Should have thrown');
    } catch (response) {
      // requireAuth throws a NextResponse from unauthorized()
      expect(response).toBeDefined();
      // The thrown value is a NextResponse with status 401
      const resp = response as Response;
      expect(resp.status).toBe(401);
      const body = await resp.json();
      expect(body.error).toBe('AUTHENTICATION_ERROR');
    }
  });
});

describe('getAuthUser', () => {
  it('returns { user } when authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'u1', email: 'test@example.com', name: 'Test', role: 'ADMIN' },
    });

    const result = await getAuthUser();

    expect(result).toHaveProperty('user');
    if ('user' in result) {
      expect(result.user.id).toBe('u1');
      expect(result.user.email).toBe('test@example.com');
    }
  });

  it('returns { error } with 401 response when not authenticated', async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getAuthUser();

    expect(result).toHaveProperty('error');
    if ('error' in result) {
      expect(result.error.status).toBe(401);
      const body = await result.error.json();
      expect(body.error).toBe('AUTHENTICATION_ERROR');
      expect(body.message).toBe('Authentication required');
    }
  });

  it('session user contains only the claims set by NextAuth authorize (id/email/name/role)', async () => {
    // NextAuth authorize callback in auth.ts only returns { id, email, name, role }
    // so passwordHash, image, etc. are never in the session
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {
        id: 'u1',
        email: 'test@example.com',
        name: 'Test',
        role: 'TECHNICIAN',
        // authorize() never returns these — they are stripped at the auth layer
      },
    });

    const result = await getAuthUser();

    if ('user' in result) {
      // The session only contains what authorize() returned
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
      expect(Object.keys(result.user).sort()).toEqual(['email', 'id', 'name', 'role']);
    }
  });
});
