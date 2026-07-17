/**
 * Route-boundary tests for POST /api/projects/[projectId]/archive.
 *
 * These tests verify HTTP-level contracts:
 *   - 401 when no session exists
 *   - 404 for non-existent or already-archived projects
 *   - 403 for non-owner archive attempts
 *   - 200 with ApiResponse shape on success
 *
 * Uses dependency seams/mocks consistent with existing architecture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service layer
vi.mock('@/lib/services/project-service', () => ({
  archiveProject: vi.fn(),
}));

// Mock the auth session
vi.mock('@/lib/auth/session', () => ({
  getAuthUser: vi.fn(),
}));

import { archiveProject } from '@/lib/services/project-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';
import { POST } from './route';
import { NotFoundError, AuthorizationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePostRequest() {
  return new Request('http://localhost/api/projects/proj-1/archive', {
    method: 'POST',
  });
}

const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'TECHNICIAN' };

const archivedProject = {
  id: 'proj-1',
  code: 'TEST-PROJECT',
  name: 'Test Project',
  description: 'A test project',
  status: 'ARCHIVED',
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
});

// ===========================================================================
// POST /api/projects/[projectId]/archive — Authentication
// ===========================================================================
describe('POST /api/projects/[projectId]/archive — authentication', () => {
  it('returns 401 when no session exists', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      error: unauthorized(),
    });

    const response = await POST(makePostRequest(), params);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('AUTHENTICATION_ERROR');
    expect(body.message).toBeDefined();
    expect(typeof body.message).toBe('string');
  });
});

// ===========================================================================
// POST /api/projects/[projectId]/archive — Not found (404)
// ===========================================================================
describe('POST /api/projects/[projectId]/archive — not found', () => {
  it('returns 404 for non-existent project', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (archiveProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Project', 'proj-1')
    );

    const response = await POST(makePostRequest(), params);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('NOT_FOUND');
  });

  it('returns 404 for already-archived project', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (archiveProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new NotFoundError('Project', 'proj-1')
    );

    const response = await POST(makePostRequest(), params);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('NOT_FOUND');
    // Must not disclose that the project is archived
  });
});

// ===========================================================================
// POST /api/projects/[projectId]/archive — Forbidden (403)
// ===========================================================================
describe('POST /api/projects/[projectId]/archive — forbidden', () => {
  it('returns 403 when non-owner tries to archive', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (archiveProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new AuthorizationError('Only the project owner can archive the project')
    );

    const response = await POST(makePostRequest(), params);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('AUTHORIZATION_ERROR');
    expect(body.message).toBe('Insufficient permissions');
  });
});

// ===========================================================================
// POST /api/projects/[projectId]/archive — Success (200)
// ===========================================================================
describe('POST /api/projects/[projectId]/archive — success', () => {
  it('returns 200 with archived project data', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (archiveProject as ReturnType<typeof vi.fn>).mockResolvedValue({
      project: archivedProject,
    });

    const response = await POST(makePostRequest(), params);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('proj-1');
    expect(body.data.status).toBe('ARCHIVED');
    expect(body.message).toBe('Project archived successfully');
  });
});

// ===========================================================================
// POST /api/projects/[projectId]/archive — Transaction/service failure (safe error response)
// ===========================================================================
describe('POST /api/projects/[projectId]/archive — transaction failure', () => {
  it('returns 500 with safe error when archiveProject throws a generic error', async () => {
    (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: mockUser,
    });
    (archiveProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Injected commit failure')
    );

    const response = await POST(makePostRequest(), params);

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
    (archiveProject as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Injected commit failure')
    );

    const response = await POST(makePostRequest(), params);

    const body = await response.json();
    // Must not expose internal error messages, Prisma errors, or stack traces
    expect(body.message).not.toContain('Injected commit failure');
    expect(body.message).not.toContain('Prisma');
    expect(body.message).not.toContain('P20');
    expect(body.message).not.toContain('at ');
    expect(body.message).not.toContain('stack');
  });
});
