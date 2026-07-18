/**
 * Tests for Location tree API route — /api/projects/[projectId]/locations/tree
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Tree endpoint" — returns full hierarchy as nested JSON
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location tree API route"
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

const { mockGetTree } = vi.hoisted(() => ({
  mockGetTree: vi.fn(),
}));

vi.mock('@/lib/services/location-service', () => ({
  getTree: mockGetTree,
}));

vi.mock('@/lib/http/api-error', () => ({
  internalError: () => new Response(JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Internal server error' }), { status: 500 }),
  notFound: (msg: string) => new Response(JSON.stringify({ error: 'NOT_FOUND', message: msg }), { status: 404 }),
}));

import { GET } from './route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

function createRequest(): Request {
  return new Request(`http://localhost/api/projects/${PROJECT_ID}/locations/tree`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/locations/tree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns nested tree structure for authenticated member', async () => {
    const tree = [
      {
        id: 'loc-1',
        name: 'Center A',
        level: 0,
        children: [
          {
            id: 'loc-2',
            name: 'Building B',
            level: 1,
            children: [
              { id: 'loc-3', name: 'Floor 1', level: 2, children: [] },
            ],
          },
        ],
      },
    ];
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockGetTree.mockResolvedValue({ tree });

    const response = await GET(createRequest(), { params: Promise.resolve({ projectId: PROJECT_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].children).toHaveLength(1);
    expect(body.data[0].children[0].children).toHaveLength(1);
    expect(mockGetTree).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('returns empty tree when no locations exist', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: USER_ID } });
    mockGetTree.mockResolvedValue({ tree: [] });

    const response = await GET(createRequest(), { params: Promise.resolve({ projectId: PROJECT_ID }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });

  it('returns 401 when not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const response = await GET(createRequest(), { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(response.status).toBe(401);
  });
});
