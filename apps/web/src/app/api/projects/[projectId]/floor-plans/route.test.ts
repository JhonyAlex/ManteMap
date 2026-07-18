/**
 * Tests for FloorPlan API routes — /api/projects/[projectId]/floor-plans
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "Floor plan CRUD access" — list, create, get, delete
 *   "Marker CRUD scoped to floor plan" — marker list, create, update, delete
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Upload, CRUD, marker API routes"
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

const { mockUploadFloorPlan, mockListFloorPlans, mockGetFloorPlan, mockRemoveFloorPlan,
  mockAddMarker, mockListMarkers, mockGetMarker, mockEditMarker, mockRemoveMarker } = vi.hoisted(() => ({
  mockUploadFloorPlan: vi.fn(),
  mockListFloorPlans: vi.fn(),
  mockGetFloorPlan: vi.fn(),
  mockRemoveFloorPlan: vi.fn(),
  mockAddMarker: vi.fn(),
  mockListMarkers: vi.fn(),
  mockGetMarker: vi.fn(),
  mockEditMarker: vi.fn(),
  mockRemoveMarker: vi.fn(),
}));

vi.mock('@/lib/services/floor-plan-service', () => ({
  uploadFloorPlan: mockUploadFloorPlan,
  listFloorPlans: mockListFloorPlans,
  getFloorPlan: mockGetFloorPlan,
  removeFloorPlan: mockRemoveFloorPlan,
  addMarker: mockAddMarker,
  listMarkers: mockListMarkers,
  getMarker: mockGetMarker,
  editMarker: mockEditMarker,
  removeMarker: mockRemoveMarker,
  validateFileExtension: vi.fn(),
  validateFileSize: vi.fn(),
  validateCoordinates: vi.fn(),
}));

vi.mock('@/lib/http/api-error', () => ({
  badRequest: (msg: string) => new Response(JSON.stringify({ error: 'VALIDATION_ERROR', message: msg }), { status: 400 }),
  notFound: (msg: string) => new Response(JSON.stringify({ error: 'NOT_FOUND', message: msg }), { status: 404 }),
  forbidden: (msg?: string) => new Response(JSON.stringify({ error: 'AUTHORIZATION_ERROR', message: msg ?? 'Insufficient permissions' }), { status: 403 }),
  internalError: () => new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Internal server error' }), { status: 500 }),
  payloadTooLarge: (msg: string) => new Response(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE', message: msg }), { status: 413 }),
  unsupportedMediaType: (msg: string) => new Response(JSON.stringify({ error: 'UNSUPPORTED_MEDIA_TYPE', message: msg }), { status: 415 }),
}));

import { GET, POST } from './route';
import { GET as GET_ONE, DELETE } from './[floorPlanId]/route';
import { GET as GET_MARKERS, POST as POST_MARKER } from './[floorPlanId]/markers/route';
import { PATCH as PATCH_MARKER, DELETE as DELETE_MARKER } from './[floorPlanId]/markers/[markerId]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const LOCATION_ID = 'clloc1xxxxxxxxxxxxxxxxxx';
const FLOOR_PLAN_ID = 'clfp1xxxxxxxxxxxxxxxxxxx';
const MARKER_ID = 'clmk1xxxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

function makeParams(overrides: Record<string, string> = {}) {
  return {
    projectId: PROJECT_ID,
    locationId: LOCATION_ID,
    floorPlanId: FLOOR_PLAN_ID,
    markerId: MARKER_ID,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests — GET /api/projects/[projectId]/floor-plans (list)
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/floor-plans', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns floor plans for an authenticated member', async () => {
    const floorPlans = [{ id: FLOOR_PLAN_ID, name: 'Ground Floor' }];
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockListFloorPlans.mockResolvedValue({ floorPlans });

    const req = new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans?locationId=${LOCATION_ID}`);
    const response = await GET(req, { params: Promise.resolve(makeParams()) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const req = new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans?locationId=${LOCATION_ID}`);
    const response = await GET(req, { params: Promise.resolve(makeParams()) });

    expect(response.status).toBe(401);
  });

  it('returns 400 when locationId is missing', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const req = new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans`);
    const response = await GET(req, { params: Promise.resolve(makeParams()) });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Tests — POST /api/projects/[projectId]/floor-plans (upload)
// ---------------------------------------------------------------------------

describe('POST /api/projects/[projectId]/floor-plans', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const req = new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans`, { method: 'POST' });
    const response = await POST(req, { params: Promise.resolve(makeParams()) });

    expect(response.status).toBe(401);
  });

  it('returns 400 when locationId is missing', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const formData = new FormData();
    formData.append('name', 'Plan');
    formData.append('width', '1920');
    formData.append('height', '1080');

    const req = new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans`, {
      method: 'POST',
      body: formData,
    });
    const response = await POST(req, { params: Promise.resolve(makeParams({ locationId: '' })) });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /api/projects/[projectId]/floor-plans/[floorPlanId]
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/floor-plans/[floorPlanId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a floor plan by ID', async () => {
    const floorPlan = { id: FLOOR_PLAN_ID, name: 'Ground Floor' };
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockGetFloorPlan.mockResolvedValue({ floorPlan });

    const response = await GET_ONE(
      new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}`),
      { params: Promise.resolve(makeParams()) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(FLOOR_PLAN_ID);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await GET_ONE(
      new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}`),
      { params: Promise.resolve(makeParams()) }
    );

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Tests — DELETE /api/projects/[projectId]/floor-plans/[floorPlanId]
// ---------------------------------------------------------------------------

describe('DELETE /api/projects/[projectId]/floor-plans/[floorPlanId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a floor plan', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockRemoveFloorPlan.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}`, { method: 'DELETE' }),
      { params: Promise.resolve(makeParams()) }
    );

    expect(response.status).toBe(204);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await DELETE(
      new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}`, { method: 'DELETE' }),
      { params: Promise.resolve(makeParams()) }
    );

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Tests — GET markers
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/floor-plans/[floorPlanId]/markers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns markers for a floor plan', async () => {
    const markers = [{ id: MARKER_ID, x: 0.5, y: 0.3, label: 'Rack' }];
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockListMarkers.mockResolvedValue({ markers });

    const response = await GET_MARKERS(
      new Request(`http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers`),
      { params: Promise.resolve(makeParams()) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Tests — POST markers (create)
// ---------------------------------------------------------------------------

describe('POST /api/projects/[projectId]/floor-plans/[floorPlanId]/markers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a marker with valid data', async () => {
    const marker = { id: MARKER_ID, x: 0.5, y: 0.3, label: 'Rack' };
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockAddMarker.mockResolvedValue({ marker });

    const req = new Request(
      `http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: 0.5, y: 0.3, label: 'Rack' }),
      }
    );
    const response = await POST_MARKER(req, { params: Promise.resolve(makeParams()) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.x).toBe(0.5);
  });

  it('returns 400 with invalid coordinates', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const req = new Request(
      `http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: 1.5, y: 0.3 }),
      }
    );
    const response = await POST_MARKER(req, { params: Promise.resolve(makeParams()) });

    expect(response.status).toBe(400);
  });

  it('returns 400 with empty label', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });

    const req = new Request(
      `http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: 0.5, y: 0.3, label: '' }),
      }
    );
    const response = await POST_MARKER(req, { params: Promise.resolve(makeParams()) });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Tests — PATCH markers (update)
// ---------------------------------------------------------------------------

describe('PATCH /api/projects/[projectId]/floor-plans/[floorPlanId]/markers/[markerId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates a marker', async () => {
    const marker = { id: MARKER_ID, x: 0.7, y: 0.8 };
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockEditMarker.mockResolvedValue({ marker });

    const req = new Request(
      `http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers/${MARKER_ID}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x: 0.7, y: 0.8 }),
      }
    );
    const response = await PATCH_MARKER(req, { params: Promise.resolve(makeParams()) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.x).toBe(0.7);
  });
});

// ---------------------------------------------------------------------------
// Tests — DELETE markers
// ---------------------------------------------------------------------------

describe('DELETE /api/projects/[projectId]/floor-plans/[floorPlanId]/markers/[markerId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes a marker', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockRemoveMarker.mockResolvedValue(undefined);

    const response = await DELETE_MARKER(
      new Request(
        `http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers/${MARKER_ID}`,
        { method: 'DELETE' }
      ),
      { params: Promise.resolve(makeParams()) }
    );

    expect(response.status).toBe(204);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await DELETE_MARKER(
      new Request(
        `http://localhost/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers/${MARKER_ID}`,
        { method: 'DELETE' }
      ),
      { params: Promise.resolve(makeParams()) }
    );

    expect(response.status).toBe(401);
  });
});
