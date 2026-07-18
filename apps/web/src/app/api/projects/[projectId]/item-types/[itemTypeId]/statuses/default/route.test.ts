import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/status-service', () => ({
  setDefaultStatus: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { PUT } from './route';
import { setDefaultStatus } from '@/lib/services/status-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemTypeId: 'type-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const status = {
  id: 'status-2', itemTypeId: 'type-1', name: 'En Mantenimiento', key: 'maintenance',
  color: '#FFAA00', icon: null, description: null, order: 1, isDefault: true,
  active: true, isFinal: false, isBlocking: false, isIncident: false,
  createdAt: new Date(), updatedAt: new Date(),
};

function putReq(body?: string) {
  return new Request('http://localhost/api/projects/project-1/item-types/type-1/statuses/default', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('status set default route', () => {
  // --- Auth guarding -------------------------------------------------------
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await PUT(putReq(JSON.stringify({ statusId: 'status-2' })), params);
    expect(response.status).toBe(401);
  });

  // --- Happy path ----------------------------------------------------------
  it('returns 200 when owner sets a new default status', async () => {
    vi.mocked(setDefaultStatus).mockResolvedValue(status as never);
    const response = await PUT(putReq(JSON.stringify({ statusId: 'status-2' })), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.isDefault).toBe(true);
    expect(setDefaultStatus).toHaveBeenCalledWith('project-1', 'status-2', 'type-1', 'owner-1');
  });

  // --- Validation errors ---------------------------------------------------
  it('returns 400 for malformed JSON', async () => {
    const malformed = await PUT(putReq('{broken'), params);
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing statusId', async () => {
    const empty = await PUT(putReq(JSON.stringify({})), params);
    expect(empty.status).toBe(400);
  });

  // --- Error mapping -------------------------------------------------------
  it('returns 403 for non-owner mutations', async () => {
    vi.mocked(setDefaultStatus).mockRejectedValue(new AuthorizationError());
    const response = await PUT(putReq(JSON.stringify({ statusId: 'status-1' })), params);
    expect(response.status).toBe(403);
  });

  it('returns 404 when status does not exist', async () => {
    vi.mocked(setDefaultStatus).mockRejectedValue(new NotFoundError('Status', 'status-1'));
    const notFoundRes = await PUT(putReq(JSON.stringify({ statusId: 'status-1' })), params);
    expect(notFoundRes.status).toBe(404);
  });

  it('does not expose unexpected service errors', async () => {
    vi.mocked(setDefaultStatus).mockRejectedValue(new Error('Prisma secret'));
    const response = await PUT(putReq(JSON.stringify({ statusId: 'status-1' })), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });
});
