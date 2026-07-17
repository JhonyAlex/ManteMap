/**
 * Tests for the actual exported middleware wrapper.
 *
 * Unlike middleware.test.ts (which tests the auth.config callback directly)
 * and middleware.shell.test.ts (which uses fully mocked callbacks), this file
 * tests the EXPORTED `middleware` function from middleware.ts — proving the
 * real NextAuth wrapper is wired correctly.
 *
 * Approach: Mock next-auth to return a controllable spy for `auth()`.
 * Import middleware.ts (which calls NextAuth(authConfig).auth) and invoke
 * the exported function with NextRequest/NextResponse-shaped inputs.
 * This proves:
 *   - The module imports and executes without error
 *   - The exported function is the one returned by NextAuth().auth
 *   - The function accepts (request, context) and delegates to the auth wrapper
 *
 * Spec: specs/application-shell/spec.md — "Unauthenticated shell request"
 * Design: design.md — "Middleware protects UI navigation only"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures the spy is available before mock factories run
const { authSpy } = vi.hoisted(() => ({
  authSpy: vi.fn(),
}));

// Minimal NextRequest-shaped object for middleware invocation
interface MockRequest {
  nextUrl: URL;
  headers: Headers;
  url?: string;
}

interface MockContext {
  params: Record<string, string>;
}

function makeRequest(pathname: string): MockRequest {
  return {
    nextUrl: new URL(`http://localhost${pathname}`),
    headers: new Headers(),
    url: `http://localhost${pathname}`,
  };
}

// Mock next-auth to return our controllable spy
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    auth: authSpy,
  })),
}));

// Mock auth.config to prevent real config from running
vi.mock('@/auth.config', () => ({
  authConfig: {
    pages: { signIn: '/login' },
    callbacks: { authorized: vi.fn() },
    session: { strategy: 'jwt' },
    providers: [],
  },
}));

// Import AFTER mocks — this triggers NextAuth(authConfig).auth
// and assigns the result to the exported `middleware`
import middleware from './middleware';

describe('Middleware — exported wrapper (real module import)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the function returned by NextAuth().auth', () => {
    // middleware should be the authSpy assigned by the mocked NextAuth
    expect(middleware).toBe(authSpy);
  });

  it('is a callable function', () => {
    expect(typeof middleware).toBe('function');
  });

  it('invokes the underlying auth wrapper when called', async () => {
    const mockAuth = { user: { id: 'user-1', email: 'test@example.com' } };
    authSpy.mockResolvedValue(mockAuth);

    const invokeMiddleware = middleware as (req: MockRequest, ctx: MockContext | undefined) => Promise<unknown>;
    const result = await invokeMiddleware(makeRequest('/dashboard'), undefined as unknown as MockContext);

    expect(authSpy).toHaveBeenCalledOnce();
    expect(result).toBe(mockAuth);
  });

  it('passes request to the auth wrapper unchanged', async () => {
    const request = makeRequest('/projects/proj-1');
    authSpy.mockResolvedValue(null);

    const invokeMiddleware = middleware as (req: MockRequest, ctx: MockContext | undefined) => Promise<unknown>;
    await invokeMiddleware(request, undefined as unknown as MockContext);

    expect(authSpy).toHaveBeenCalledWith(request, undefined);
  });

  it('delegates auth context to the wrapper', async () => {
    const request = makeRequest('/dashboard');
    const context: MockContext = { params: {} };
    authSpy.mockResolvedValue(true);

    const invokeMiddleware = middleware as (req: MockRequest, ctx: MockContext) => Promise<unknown>;
    await invokeMiddleware(request, context);

    expect(authSpy).toHaveBeenCalledWith(request, context);
  });
});
