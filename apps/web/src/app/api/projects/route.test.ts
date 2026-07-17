/**
 * Route-boundary tests for POST /api/projects and GET /api/projects.
 *
 * These tests verify HTTP-level contracts:
 *   - 401 when no session exists
 *   - 400 for malformed JSON
 *   - 400 for validation errors
 *   - 409 for duplicate code
 *   - 201 with ApiResponse shape on success
 *   - 200 with ApiResponse shape on list success
 *
 * Uses dependency seams/mocks consistent with existing architecture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service layer
vi.mock('@/lib/services/project-service', () => ({
  createProject: vi.fn(),
  listProjects: vi.fn(),
}));

// Mock the auth session
vi.mock('@/lib/auth/session', () => ({
  getAuthUser: vi.fn(),
}));

import { createProject, listProjects } from '@/lib/services/project-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';
import { POST, GET } from './route';
import { ConflictError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Note: GET /api/projects takes no request argument (just reads session)

const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'TECHNICIAN' };

const mockProject = {
  id: 'proj-1',
  code: 'TEST-PROJECT',
  name: 'Test Project',
  description: 'A test project',
  status: 'ACTIVE',
  ownerId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// POST /api/projects — Authentication
// ===========================================================================
describe('POST /api/projects — authentication', () => {
  it('returns 401 when no session exists', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: unauthorized(),
    });

    const response = await POST(
      makePostRequest({ code: 'TEST', name: 'Test Project' })
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('AUTHENTICATION_ERROR');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });
});

// ===========================================================================
// POST /api/projects — Malformed JSON
// ===========================================================================
describe('POST /api/projects — malformed JSON', () => {
  it('returns 400 with VALIDATION_ERROR for malformed JSON body', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });

    // Create a request with invalid JSON
    const request = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json',
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });

  it('never exposes internal error details for malformed JSON', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });

    const request = new Request('http://localhost/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ broken',
    });

    const response = await POST(request);
    const body = await response.json();

    // Must not expose stack traces or internal error codes
    expect(body.message).not.toContain('SyntaxError');
    expect(body.message).not.toContain('Unexpected token');
    expect(body.message).not.toContain('at ');
  });
});

// ===========================================================================
// POST /api/projects — Validation errors
// ===========================================================================
describe('POST /api/projects — validation', () => {
  it('returns 400 for missing required fields', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });

    const response = await POST(
      makePostRequest({ code: 'TEST' }) // missing name
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for code too short', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });

    const response = await POST(
      makePostRequest({ code: 'A', name: 'Test Project' })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });
});

// ===========================================================================
// POST /api/projects — Conflict (409)
// ===========================================================================
describe('POST /api/projects — conflict', () => {
  it('returns 409 with CONFLICT error for duplicate code', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (createProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ConflictError('A project with this code already exists')
    );

    const response = await POST(
      makePostRequest({ code: 'EXISTING', name: 'Duplicate Project' })
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe('CONFLICT');
    expect(body.message).toMatch(/already exists/i);
  });
});

// ===========================================================================
// POST /api/projects — Success (201)
// ===========================================================================
describe('POST /api/projects — success', () => {
  it('returns 201 with data and message on successful creation', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({
      project: mockProject,
    });

    const response = await POST(
      makePostRequest({ code: 'new-project', name: 'New Project', description: 'A new project' })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('proj-1');
    expect(body.data.code).toBe('TEST-PROJECT');
    expect(body.data.name).toBe('Test Project');
    expect(body.message).toBe('Project created successfully');
  });

  it('never exposes internal fields in response', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({
      project: mockProject,
    });

    const response = await POST(
      makePostRequest({ code: 'TEST', name: 'Test Project' })
    );

    const body = await response.json();
    expect(body.data).not.toHaveProperty('passwordHash');
    expect(body.data).not.toHaveProperty('password');
  });
});

// ===========================================================================
// GET /api/projects — Authentication
// ===========================================================================
describe('GET /api/projects — authentication', () => {
  it('returns 401 when no session exists', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: unauthorized(),
    });

    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('AUTHENTICATION_ERROR');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });
});

// ===========================================================================
// GET /api/projects — Success (200)
// ===========================================================================
describe('GET /api/projects — success', () => {
  it('returns 200 with data array on successful list', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [mockProject],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('proj-1');
  });

  it('returns empty array when user has no projects', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
  });
});

// ===========================================================================
// POST /api/projects — Transaction failure (safe error response)
// ===========================================================================
describe('POST /api/projects — transaction failure', () => {
  it('returns 500 with safe error when createProject throws a generic error', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (createProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Injected commit failure')
    );

    const response = await POST(
      makePostRequest({ code: 'FAIL-PROJ', name: 'Will Fail' })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });

  it('never exposes database details on transaction failure', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (createProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Injected commit failure')
    );

    const response = await POST(
      makePostRequest({ code: 'FAIL-PROJ', name: 'Will Fail' })
    );

    const body = await response.json();
    // Must not expose internal error messages, Prisma errors, or stack traces
    expect(body.message).not.toContain('Injected commit failure');
    expect(body.message).not.toContain('Prisma');
    expect(body.message).not.toContain('P20');
    expect(body.message).not.toContain('at ');
    expect(body.message).not.toContain('stack');
  });
});
