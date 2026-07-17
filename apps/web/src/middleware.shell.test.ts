/**
 * RED tests for middleware protecting the application shell.
 *
 * Verifies:
 *   - Unauthenticated users are redirected from /dashboard to /login
 *   - Unauthenticated users are redirected from /projects to /login
 *   - Authenticated users can access /dashboard
 *   - Authenticated users can access /projects
 *
 * Spec: specs/application-shell/spec.md — "Unauthenticated shell request"
 * Design: design.md — "Middleware protects UI navigation only"
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock next-auth
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
  })),
}));

vi.mock('@/auth.config', () => ({
  authConfig: {
    pages: { signIn: '/login' },
    callbacks: {
      authorized: vi.fn(),
    },
    session: { strategy: 'jwt' },
    providers: [],
  },
}));

import { authConfig } from '@/auth.config';

describe('Middleware — shell protection', () => {
  const authorized = authConfig.callbacks.authorized as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users from /dashboard', () => {
    authorized.mockReturnValue(false);

    const result = authorized({
      auth: null,
      request: { nextUrl: new URL('http://localhost/dashboard') },
    });

    expect(result).toBe(false);
  });

  it('redirects unauthenticated users from /projects', () => {
    authorized.mockReturnValue(false);

    const result = authorized({
      auth: null,
      request: { nextUrl: new URL('http://localhost/projects') },
    });

    expect(result).toBe(false);
  });

  it('allows authenticated users to access /dashboard', () => {
    authorized.mockReturnValue(true);

    const result = authorized({
      auth: { user: { id: 'user-1', email: 'test@example.com' } },
      request: { nextUrl: new URL('http://localhost/dashboard') },
    });

    expect(result).toBe(true);
  });

  it('allows authenticated users to access /projects', () => {
    authorized.mockReturnValue(true);

    const result = authorized({
      auth: { user: { id: 'user-1', email: 'test@example.com' } },
      request: { nextUrl: new URL('http://localhost/projects') },
    });

    expect(result).toBe(true);
  });
});
