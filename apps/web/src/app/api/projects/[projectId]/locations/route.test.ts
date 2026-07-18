/**
 * Tests for Location API routes — /api/projects/[projectId]/locations
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Project-scoped CRUD access" — list, create with project scoping
 *   "Location model with adjacency-list hierarchy" — create root/child
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location CRUD + tree API routes"
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

const { mockCreateLocation, mockListLocations } = vi.hoisted(() => ({
  mockCreateLocation: vi.fn(),
  mockListLocations: vi.fn(),
}));

vi.mock('@/lib/services/location-service', () => ({
  createLocation: mockCreateLocation,
  listLocations: mockListLocations,
  getTree: vi.fn(),
  updateLocation: vi.fn(),
  reorderLocations: vi.fn(),
  deleteLocation: vi.fn(),
}));

vi.mock('@/lib/http/api-error', () => ({
  badRequest: (msg: string) => new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: msg }), { status: 400 }),
  notFound: (msg: string) => new Response(JSON.stringify({ error: 'NOT_FOUND', message: msg }), { status: 404 }),
  forbidden: (msg?: string) => new Response(JSON.stringify({ error: 'AUTHORIZATION_ERROR', message: msg ?? 'Insufficient permissions' }), { status: 403 }),
  internalError: () => new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Internal server error' }), { status: 500 }),
}));

import { GET, POST } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

function createRequest(url = `http://localhost/api/projects/${PROJECT_ID}/locations`): Request {
  return new Request(url);
}

function createPostRequest(body: unknown, url = `http://localhost/api/projects/${PROJECT_ID}/locations`): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests — GET (list locations)
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns locations for an authenticated project member', async () => {
    const locations = [
      { id: 'loc-1', name: 'Center A', level: 0, parentId: null, order: 0, active: true },
      { id: 'loc-2', name: 'Building B', level: 1, parentId: 'loc-1', order: 0, active: true },
    ];
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockListLocations.mockResolvedValue({ locations });

    const response = await GET(createRequest(), { params: Promise.resolve({ projectId: PROJECT_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].name).toBe('Center A');
    expect(mockListLocations).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await GET(createRequest(), { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(response.status).toBe(401);
  });

  it('returns 500 when service throws', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockListLocations.mockRejectedValue(new Error('Project not found'));

    const response = await GET(createRequest(), { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(response.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Tests — POST (create location)
// ---------------------------------------------------------------------------

describe('POST /api/projects/[projectId]/locations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a root location with valid data', async () => {
    const newLocation = { id: 'loc-new', name: 'New Center', level: 0, parentId: null, order: 0, active: true };
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockCreateLocation.mockResolvedValue({ location: newLocation });

    const request = createPostRequest({ name: 'New Center', level: 0 });
    const response = await POST(request, { params: Promise.resolve({ projectId: PROJECT_ID }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.name).toBe('New Center');
    expect(body.message).toBe('Location created successfully');
    expect(mockCreateLocation).toHaveBeenCalledWith(PROJECT_ID, { name: 'New Center', level: 0 }, USER_ID);
  });

  it('returns 400 with invalid data', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const request = createPostRequest({ name: '', level: 0 });
    const response = await POST(request, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(response.status).toBe(400);
  });

  it('returns 400 with invalid JSON body', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const request = new Request(`http://localhost/api/projects/${PROJECT_ID}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const response = await POST(request, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(response.status).toBe(400);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const request = createPostRequest({ name: 'Test', level: 0 });
    const response = await POST(request, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(response.status).toBe(401);
  });
});
