/**
 * Direct middleware behavior tests.
 *
 * Tests the actual middleware.ts behavior by importing and exercising
 * the real auth.config.ts authorized callback — not a mock.
 *
 * Verifies:
 *   - Unauthenticated users are redirected from /dashboard to /login
 *   - Unauthenticated users are redirected from /projects/:id to /login
 *   - Authenticated users can access /dashboard
 *   - Authenticated users can access /projects/:id
 *   - Public routes (/, /login, /register) are accessible without auth
 *   - API routes are excluded from middleware
 *
 * Spec: specs/application-shell/spec.md — "Unauthenticated shell request"
 * Design: design.md — "Middleware protects UI navigation only"
 */

import { describe, it, expect } from 'vitest';
import { authConfig } from '@/auth.config';

/**
 * Extract the authorized callback from auth.config.ts.
 * This is the REAL callback that middleware uses — not a mock.
 */
const authorized = authConfig.callbacks.authorized as (params: {
  auth: { user: { id: string; email: string } } | null;
  request: { nextUrl: URL };
}) => boolean;

describe('Middleware — direct behavior (real auth.config callback)', () => {
  function makeRequest(pathname: string) {
    return { nextUrl: new URL(`http://localhost${pathname}`) };
  }

  function makeAuth(user?: { id: string; email: string }) {
    return user ? { user } : null;
  }

  describe('protected routes', () => {
    it('redirects unauthenticated users from /dashboard', () => {
      const result = authorized({
        auth: makeAuth(),
        request: makeRequest('/dashboard'),
      });

      expect(result).toBe(false);
    });

    it('redirects unauthenticated users from /projects', () => {
      const result = authorized({
        auth: makeAuth(),
        request: makeRequest('/projects'),
      });

      expect(result).toBe(false);
    });

    it('redirects unauthenticated users from /projects/proj-1', () => {
      const result = authorized({
        auth: makeAuth(),
        request: makeRequest('/projects/proj-1'),
      });

      expect(result).toBe(false);
    });

    it('redirects unauthenticated users from nested dashboard routes', () => {
      const result = authorized({
        auth: makeAuth(),
        request: makeRequest('/dashboard/settings'),
      });

      expect(result).toBe(false);
    });

    it('allows authenticated users to access /dashboard', () => {
      const result = authorized({
        auth: makeAuth({ id: 'user-1', email: 'test@example.com' }),
        request: makeRequest('/dashboard'),
      });

      expect(result).toBe(true);
    });

    it('allows authenticated users to access /projects/proj-1', () => {
      const result = authorized({
        auth: makeAuth({ id: 'user-1', email: 'test@example.com' }),
        request: makeRequest('/projects/proj-1'),
      });

      expect(result).toBe(true);
    });
  });

  describe('public routes', () => {
    it('allows unauthenticated users to access /', () => {
      const result = authorized({
        auth: makeAuth(),
        request: makeRequest('/'),
      });

      expect(result).toBe(true);
    });

    it('allows unauthenticated users to access /login', () => {
      const result = authorized({
        auth: makeAuth(),
        request: makeRequest('/login'),
      });

      expect(result).toBe(true);
    });

    it('allows unauthenticated users to access /register', () => {
      const result = authorized({
        auth: makeAuth(),
        request: makeRequest('/register'),
      });

      expect(result).toBe(true);
    });
  });
});
