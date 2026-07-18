import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';

vi.mock('@/lib/services/status-service', () => ({
  createStatus: vi.fn(),
  listStatuses: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { GET, POST } from './route';
import { createStatus, listStatuses } from '@/lib/services/status-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemTypeId: 'type-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const status = {
  id: 'status-1', itemTypeId: 'type-1', name: 'Operativo', key: 'operative',
  color: '#00FF00', icon: null, description: null, order: 0, isDefault: true,
  active: true, isFinal: false, isBlocking: false, isIncident: false,
  createdAt: new Date(), updatedAt: new Date(),
};

function postReq(body?: string) {
  return new Request('http://localhost/api/projects/project-1/item-types/type-1/statuses', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('status collection routes', () => {
  // --- Auth guarding -------------------------------------------------------
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    expect((await GET(new Request('http://localhost'), params)).status).toBe(401);
  });

  it('returns 401 on POST without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await POST(postReq(JSON.stringify({ name: 'Operativo', key: 'operative', color: '#00FF00' })), params);
    expect(response.status).toBe(401);
  });

  // --- GET: happy path -----------------------------------------------------
  it('returns ordered status list for a member', async () => {
    vi.mocked(listStatuses).mockResolvedValue([status] as never);
    const response = await GET(new Request('http://localhost'), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toHaveLength(1);
    expect(listStatuses).toHaveBeenCalledWith('project-1', 'type-1', 'owner-1');
  });

  // --- GET: error mapping --------------------------------------------------
  it('returns 404 when project or item type is not found', async () => {
    vi.mocked(listStatuses).mockRejectedValue(new NotFoundError('Item type', 'type-1'));
    expect((await GET(new Request('http://localhost'), params)).status).toBe(404);
  });

  // --- POST: happy path ----------------------------------------------------
  it('returns 201 when owner creates a status', async () => {
    vi.mocked(createStatus).mockResolvedValue(status as never);
    const response = await POST(postReq(JSON.stringify({ name: 'Operativo', key: 'operative', color: '#00FF00' })), params);
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.data.key).toBe('operative');
    expect(createStatus).toHaveBeenCalledWith('project-1', expect.objectContaining({ key: 'operative' }), 'type-1', 'owner-1');
  });

  // --- POST: validation errors ---------------------------------------------
  it('returns 400 for malformed JSON', async () => {
    const malformed = await POST(postReq('{broken'), params);
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for Zod validation failure (missing required fields)', async () => {
    const invalid = await POST(postReq(JSON.stringify({ name: 'x' })), params);
    expect(invalid.status).toBe(400);
  });

  it('returns 400 when service throws ValidationError', async () => {
    vi.mocked(createStatus).mockRejectedValue(new ValidationError('Invalid data'));
    const response = await POST(postReq(JSON.stringify({ name: 'Test', key: 'test', color: 'not-a-color' })), params);
    expect(response.status).toBe(400);
  });

  // --- POST: error mapping -------------------------------------------------
  it('returns 403 for non-owner mutations', async () => {
    vi.mocked(createStatus).mockRejectedValue(new AuthorizationError());
    const response = await POST(postReq(JSON.stringify({ name: 'Test', key: 'test', color: '#00FF00' })), params);
    expect(response.status).toBe(403);
  });

  it('returns 409 for duplicate status key', async () => {
    vi.mocked(createStatus).mockRejectedValue(new ConflictError('duplicate key'));
    const conflictRes = await POST(postReq(JSON.stringify({ name: 'Test', key: 'duplicate', color: '#00FF00' })), params);
    expect(conflictRes.status).toBe(409);
    expect((await conflictRes.json()).error).toBe('CONFLICT');
  });

  it('returns 404 when item type does not belong to project', async () => {
    vi.mocked(createStatus).mockRejectedValue(new NotFoundError('Item type', 'type-1'));
    const notFoundRes = await POST(postReq(JSON.stringify({ name: 'Test', key: 'test', color: '#00FF00' })), params);
    expect(notFoundRes.status).toBe(404);
  });

  it('does not expose unexpected service errors', async () => {
    vi.mocked(createStatus).mockRejectedValue(new Error('Prisma secret'));
    const response = await POST(postReq(JSON.stringify({ name: 'Test', key: 'test', color: '#00FF00' })), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });
});
