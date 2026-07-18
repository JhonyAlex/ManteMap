/**
 * Tests for Location resource API route — /api/projects/[projectId]/locations/[locationId]
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Project-scoped CRUD access" — get, update, delete with project scoping
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location CRUD API routes"
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

const { mockGetLocation, mockUpdateLocation, mockDeleteLocation } = vi.hoisted(() => ({
  mockGetLocation: vi.fn(),
  mockUpdateLocation: vi.fn(),
  mockDeleteLocation: vi.fn(),
}));

vi.mock('@/lib/services/location-service', () => ({
  getLocation: mockGetLocation,
  updateLocation: mockUpdateLocation,
  deleteLocation: mockDeleteLocation,
}));

vi.mock('@/lib/http/api-error', () => ({
  badRequest: (msg: string) => new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: msg }), { status: 400 }),
  notFound: (msg: string) => new Response(JSON.stringify({ error: 'NOT_FOUND', message: msg }), { status: 404 }),
  forbidden: (msg?: string) => new Response(JSON.stringify({ error: 'AUTHORIZATION_ERROR', message: msg ?? 'Insufficient permissions' }), { status: 403 }),
  internalError: () => new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Internal server error' }), { status: 500 }),
}));

import { GET, PATCH, DELETE } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const LOCATION_ID = 'clloc1xxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

const params = Promise.resolve({ projectId: PROJECT_ID, locationId: LOCATION_ID });

function createGetRequest(): Request {
  return new Request(`http://localhost/api/projects/${PROJECT_ID}/locations/${LOCATION_ID}`);
}

function createPatchRequest(body: unknown): Request {
  return new Request(`http://localhost/api/projects/${PROJECT_ID}/locations/${LOCATION_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests — GET (single location)
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/locations/[locationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a location by ID for an authenticated member', async () => {
    const location = { id: LOCATION_ID, name: 'Room 101', level: 3, parentId: 'parent-1', order: 0, active: true };
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockGetLocation.mockResolvedValue({ location });

    const response = await GET(createGetRequest(), { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Room 101');
    expect(mockGetLocation).toHaveBeenCalledWith(PROJECT_ID, LOCATION_ID, USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await GET(createGetRequest(), { params });

    expect(response.status).toBe(401);
  });

  it('returns 500 when service throws', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockGetLocation.mockRejectedValue(new Error('Location not found'));

    const response = await GET(createGetRequest(), { params });

    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH (update location)
// ---------------------------------------------------------------------------

describe('PATCH /api/projects/[projectId]/locations/[locationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a location name', async () => {
    const updated = { id: LOCATION_ID, name: 'Updated Room', level: 3, parentId: 'parent-1', order: 0, active: true };
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockUpdateLocation.mockResolvedValue({ location: updated });

    const response = await PATCH(createPatchRequest({ name: 'Updated Room' }), { params });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.name).toBe('Updated Room');
    expect(body.message).toBe('Location updated successfully');
  });

  it('returns 400 with empty update body', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const response = await PATCH(createPatchRequest({}), { params });

    expect(response.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await PATCH(createPatchRequest({ name: 'Test' }), { params });

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Tests — DELETE (delete location)
// ---------------------------------------------------------------------------

describe('DELETE /api/projects/[projectId]/locations/[locationId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a location and returns 204', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockDeleteLocation.mockResolvedValue(undefined);

    const response = await DELETE(createGetRequest(), { params });

    expect(response.status).toBe(204);
    expect(mockDeleteLocation).toHaveBeenCalledWith(PROJECT_ID, LOCATION_ID, USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await DELETE(createGetRequest(), { params });

    expect(response.status).toBe(401);
  });
});
