/**
 * Tests for edge-safe auth.config.ts authorized callback.
 *
 * Verifies protected route behavior:
 * - Dashboard and projects routes require authentication
 * - Public routes are accessible without auth
 * - Unauthenticated users are redirected (returns false)
 */
import { describe, it, expect } from 'vitest';
import { authConfig } from '@/auth.config';

// Extract the authorized callback for direct testing
const authorized = authConfig.callbacks!.authorized as (params: {
  auth: { user?: { id: string; email: string; name: string | null; role: string } } | null;
  request: { nextUrl: URL };
}) => boolean;

describe('auth.config authorized callback', () => {
  function makeAuth(user: { id: string; email: string; name: string | null; role: string } | null) {
    return { auth: user ? { user } : null };
  }

  function makeRequest(path: string) {
    return { request: { nextUrl: new URL(`http://localhost:3000${path}`) } };
  }

  // --- Protected routes ---

  it('allows authenticated user on /dashboard', () => {
    const params = {
      ...makeAuth({ id: 'u1', email: 'a@b.com', name: 'A', role: 'ADMIN' }),
      ...makeRequest('/dashboard'),
    };
    expect(authorized(params)).toBe(true);
  });

  it('blocks unauthenticated user on /dashboard', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/dashboard'),
    };
    expect(authorized(params)).toBe(false);
  });

  it('allows authenticated user on /dashboard/settings', () => {
    const params = {
      ...makeAuth({ id: 'u1', email: 'a@b.com', name: 'A', role: 'TECHNICIAN' }),
      ...makeRequest('/dashboard/settings'),
    };
    expect(authorized(params)).toBe(true);
  });

  it('blocks unauthenticated user on /dashboard/settings', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/dashboard/settings'),
    };
    expect(authorized(params)).toBe(false);
  });

  it('allows authenticated user on /projects', () => {
    const params = {
      ...makeAuth({ id: 'u1', email: 'a@b.com', name: 'A', role: 'ADMIN' }),
      ...makeRequest('/projects'),
    };
    expect(authorized(params)).toBe(true);
  });

  it('blocks unauthenticated user on /projects', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/projects'),
    };
    expect(authorized(params)).toBe(false);
  });

  it('blocks unauthenticated user on /projects/123', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/projects/123'),
    };
    expect(authorized(params)).toBe(false);
  });

  // --- Public routes ---

  it('allows unauthenticated user on / (public landing)', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/'),
    };
    expect(authorized(params)).toBe(true);
  });

  it('allows unauthenticated user on /login', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/login'),
    };
    expect(authorized(params)).toBe(true);
  });

  it('allows unauthenticated user on /register', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/register'),
    };
    expect(authorized(params)).toBe(true);
  });

  it('allows unauthenticated user on arbitrary non-protected route', () => {
    const params = {
      ...makeAuth(null),
      ...makeRequest('/about'),
    };
    expect(authorized(params)).toBe(true);
  });

  // --- Session strategy ---

  it('uses JWT strategy (not database sessions)', () => {
    expect(authConfig.session?.strategy).toBe('jwt');
  });

  // --- Sign-in page redirect ---

  it('redirects to /login on unauthorized', () => {
    expect(authConfig.pages?.signIn).toBe('/login');
  });
});
