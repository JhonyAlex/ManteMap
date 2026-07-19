/**
 * Integration tests for POST /api/projects/[projectId]/inspections
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/mobile-inspections/spec.md
 *   MI-004 Inspection audit log
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetCurrentUser = vi.fn();
const mockLogInspection = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/lib/services/inspection-service', () => ({
  logInspection: (...args: unknown[]) => mockLogInspection(...args),
}));

// RED — route handler does not exist yet
vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { POST } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const ITEM_ID = 'clitemxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxx';

function mockAuth(user: Record<string, unknown> | null) {
  mockGetCurrentUser.mockResolvedValue(user);
}

function mockInspectionResult(overrides = {}) {
  return {
    inspection: {
      id: 'clinsp1xxxxxxxxxxxxxxxx',
      itemId: ITEM_ID,
      userId: USER_ID,
      statusId: null,
      notes: null,
      photoPath: null,
      createdAt: new Date('2026-07-18T10:00:00Z'),
      ...overrides,
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildJsonReq(body: unknown): any {
  return {
    json: () => Promise.resolve(body),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/projects/[projectId]/inspections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    mockAuth(null);

    const req = buildJsonReq({ itemId: ITEM_ID });
    const res = await POST(req, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error).toBeDefined();
  });

  it('should create inspection and return 201 with inspection data', async () => {
    mockAuth({ id: USER_ID, email: 'tech@example.com', name: 'Tech', role: 'TECHNICIAN' });
    mockLogInspection.mockResolvedValue(mockInspectionResult());

    const req = buildJsonReq({ itemId: ITEM_ID });
    const res = await POST(req, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.data.inspection).toBeDefined();
    expect(data.data.inspection.id).toBe('clinsp1xxxxxxxxxxxxxxxx');
    expect(mockLogInspection).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ itemId: ITEM_ID, userId: USER_ID }),
    );
  });

  it('should return 400 when itemId is missing', async () => {
    mockAuth({ id: USER_ID, email: 'tech@example.com', name: 'Tech', role: 'TECHNICIAN' });

    const req = buildJsonReq({});
    const res = await POST(req, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(res.status).toBe(400);
  });

  it('should create inspection with notes', async () => {
    mockAuth({ id: USER_ID, email: 'tech@example.com', name: 'Tech', role: 'TECHNICIAN' });
    mockLogInspection.mockResolvedValue(
      mockInspectionResult({ notes: 'All good', statusId: 'clstatusx' }),
    );

    const req = buildJsonReq({
      itemId: ITEM_ID,
      notes: 'All good',
      statusId: 'clstatusx',
    });
    const res = await POST(req, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(res.status).toBe(201);
    expect(mockLogInspection).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ notes: 'All good', statusId: 'clstatusx' }),
    );
  });

  it('should return 500 when service throws', async () => {
    mockAuth({ id: USER_ID, email: 'tech@example.com', name: 'Tech', role: 'TECHNICIAN' });
    mockLogInspection.mockRejectedValue(new Error('DB error'));

    const req = buildJsonReq({ itemId: ITEM_ID });
    const res = await POST(req, { params: Promise.resolve({ projectId: PROJECT_ID }) });

    expect(res.status).toBe(500);
  });
});