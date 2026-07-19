/**
 * Tests for Location reorder API route — /api/projects/[projectId]/locations/reorder
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Location ordering" — reorder endpoint accepts ordered ID array
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location reorder API route"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted to avoid hoisting issues
// ---------------------------------------------------------------------------

const { mockGetAuthUser } = vi.hoisted(() => ({
  mockGetAuthUser: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  getAuthUser: mockGetAuthUser,
}));

const { mockReorderLocations } = vi.hoisted(() => ({
  mockReorderLocations: vi.fn(),
}));

vi.mock('@/lib/services/location-service', () => ({
  reorderLocations: mockReorderLocations,
}));

vi.mock('@/lib/http/api-error', () => ({
  badRequest: (msg: string) => new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: msg }), { status: 400 }),
  internalError: () => new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Internal server error' }), { status: 500 }),
}));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { PUT } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

function createPutRequest(body: unknown): Request {
  return new Request(`http://localhost/api/projects/${PROJECT_ID}/locations/reorder`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PUT /api/projects/[projectId]/locations/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reorders locations with valid ID array', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockReorderLocations.mockResolvedValue(undefined);

    const locationIds = ['clloc1xxxxxxxxxxxxxxxxxx', 'clloc2xxxxxxxxxxxxxxxxxx', 'clloc3xxxxxxxxxxxxxxxxxx'];
    const response = await PUT(
      createPutRequest({ locationIds }),
      { params: Promise.resolve({ projectId: PROJECT_ID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Locations reordered successfully');
    expect(mockReorderLocations).toHaveBeenCalledWith(
      PROJECT_ID,
      { locationIds },
      USER_ID
    );
  });

  it('returns 400 with empty array', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const response = await PUT(
      createPutRequest({ locationIds: [] }),
      { params: Promise.resolve({ projectId: PROJECT_ID }) }
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 with invalid JSON body', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const request = new Request(`http://localhost/api/projects/${PROJECT_ID}/locations/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const response = await PUT(request, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(response.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await PUT(
      createPutRequest({ locationIds: ['loc-a'] }),
      { params: Promise.resolve({ projectId: PROJECT_ID }) }
    );

    expect(response.status).toBe(401);
  });
});