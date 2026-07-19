/**
 * Route-boundary tests for GET /api/projects/[projectId] and PATCH /api/projects/[projectId].
 *
 * These tests verify HTTP-level contracts:
 *   - 401 when no session exists
 *   - 400 for malformed JSON (PATCH only)
 *   - 400 for validation errors (PATCH only)
 *   - 404 for non-existent or non-member projects
 *   - 403 for non-owner mutation attempts
 *   - 200 with ApiResponse shape on success
 *
 * Uses dependency seams/mocks consistent with existing architecture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service layer
vi.mock('@/lib/services/project-service', () => ({
  getProjectById: vi.fn(),
  updateProject: vi.fn(),
  resolveProjectId: vi.fn(),
}));

// Mock the auth session
vi.mock('@/lib/auth/session', () => ({
  getAuthUser: vi.fn(),
}));

import { getProjectById, updateProject, resolveProjectId } from '@/lib/services/project-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';
import { GET, PATCH } from './route';
import { NotFoundError, AuthorizationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest() {
  return new Request('http://localhost/api/projects/proj-1', {
    method: 'GET',
  });
}

function makePatchRequest(body: unknown) {
  return new Request('http://localhost/api/projects/proj-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

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

const params = { params: Promise.resolve({ projectId: 'proj-1' }) };

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  (resolveProjectId as ReturnType<typeof vi.fn>).mockResolvedValue('resolved-proj-1');
});

// ===========================================================================
// GET /api/projects/[projectId] — Authentication
// ===========================================================================
describe('GET /api/projects/[projectId] — authentication', () => {
  it('returns 401 when no session exists', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: unauthorized(),
    });

    const response = await GET(makeGetRequest(), params);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('AUTHENTICATION_ERROR');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });
});

// ===========================================================================
// GET /api/projects/[projectId] — Not found (404)
// ===========================================================================
describe('GET /api/projects/[projectId] — not found', () => {
  it('returns 404 for non-existent project', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (getProjectById as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Project', 'proj-1')
    );

    const response = await GET(makeGetRequest(), params);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 404 for non-member access (hides project existence)', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (getProjectById as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Project', 'proj-1')
    );

    const response = await GET(makeGetRequest(), params);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('NOT_FOUND');
    // Must not disclose that the project exists
  });
});

// ===========================================================================
// GET /api/projects/[projectId] — Success (200)
// ===========================================================================
describe('GET /api/projects/[projectId] — success', () => {
  it('returns 200 with project data for member access', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (getProjectById as ReturnType<typeof vi.fn>).mockResolvedValue({
      project: mockProject,
    });

    const response = await GET(makeGetRequest(), params);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('proj-1');
    expect(body.data.code).toBe('TEST-PROJECT');
    expect(body.data.name).toBe('Test Project');
    expect(resolveProjectId).toHaveBeenCalledWith('proj-1');
    expect(getProjectById).toHaveBeenCalledWith('resolved-proj-1', 'user-1');
  });
});

// ===========================================================================
// PATCH /api/projects/[projectId] — Authentication
// ===========================================================================
describe('PATCH /api/projects/[projectId] — authentication', () => {
  it('returns 401 when no session exists', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: unauthorized(),
    });

    const response = await PATCH(
      makePatchRequest({ name: 'Updated' }),
      params
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('AUTHENTICATION_ERROR');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });
});

// ===========================================================================
// PATCH /api/projects/[projectId] — Malformed JSON
// ===========================================================================
describe('PATCH /api/projects/[projectId] — malformed JSON', () => {
  it('returns 400 with VALIDATION_ERROR for malformed JSON body', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });

    const request = new Request('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json',
    });

    const response = await PATCH(request, params);

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

    const request = new Request('http://localhost/api/projects/proj-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{ broken',
    });

    const response = await PATCH(request, params);
    const body = await response.json();

    // Must not expose stack traces or internal error codes
    expect(body.message).not.toContain('SyntaxError');
    expect(body.message).not.toContain('Unexpected token');
    expect(body.message).not.toContain('at ');
  });
});

// ===========================================================================
// PATCH /api/projects/[projectId] — Validation errors
// ===========================================================================
describe('PATCH /api/projects/[projectId] — validation', () => {
  it('returns 400 for empty update body', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });

    const response = await PATCH(
      makePatchRequest({}),
      params
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });
});

// ===========================================================================
// PATCH /api/projects/[projectId] — Not found (404)
// ===========================================================================
describe('PATCH /api/projects/[projectId] — not found', () => {
  it('returns 404 for non-existent project', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (updateProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Project', 'proj-1')
    );

    const response = await PATCH(
      makePatchRequest({ name: 'Updated' }),
      params
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('NOT_FOUND');
  });
});

// ===========================================================================
// PATCH /api/projects/[projectId] — Forbidden (403)
// ===========================================================================
describe('PATCH /api/projects/[projectId] — forbidden', () => {
  it('returns 403 when non-owner tries to update', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (updateProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new AuthorizationError('Only the project owner can update the project')
    );

    const response = await PATCH(
      makePatchRequest({ name: 'Hacked' }),
      params
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('AUTHORIZATION_ERROR');
    expect(body.message).toBe('Insufficient permissions');
  });
});

// ===========================================================================
// PATCH /api/projects/[projectId] — Success (200)
// ===========================================================================
describe('PATCH /api/projects/[projectId] — success', () => {
  it('returns 200 with updated project data', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (updateProject as ReturnType<typeof vi.fn>).mockResolvedValue({
      project: { ...mockProject, name: 'Updated Name' },
    });

    const response = await PATCH(
      makePatchRequest({ name: 'Updated Name' }),
      params
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe('Updated Name');
    expect(body.message).toBe('Project updated successfully');
    expect(resolveProjectId).toHaveBeenCalledWith('proj-1');
    expect(updateProject).toHaveBeenCalledWith(
      'resolved-proj-1',
      { name: 'Updated Name' },
      'user-1'
    );
  });
});

// ===========================================================================
// PATCH /api/projects/[projectId] — Transaction/service failure (safe error response)
// ===========================================================================
describe('PATCH /api/projects/[projectId] — transaction failure', () => {
  it('returns 500 with safe error when updateProject throws a generic error', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (updateProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Injected commit failure')
    );

    const response = await PATCH(
      makePatchRequest({ name: 'Updated Name' }),
      params
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
    (updateProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Injected commit failure')
    );

    const response = await PATCH(
      makePatchRequest({ name: 'Updated Name' }),
      params
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
