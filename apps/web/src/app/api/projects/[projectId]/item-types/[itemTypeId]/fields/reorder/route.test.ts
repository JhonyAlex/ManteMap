import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';

vi.mock('@/lib/services/dynamic-field-service', () => ({
  reorderFields: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { PUT } from './route';
import { reorderFields } from '@/lib/services/dynamic-field-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemTypeId: 'type-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const fields = [
  { id: 'field-2', itemTypeId: 'type-1', name: 'Field B', key: 'field-b', type: 'SHORT_TEXT', order: 0, active: true },
  { id: 'field-1', itemTypeId: 'type-1', name: 'Field A', key: 'field-a', type: 'SHORT_TEXT', order: 1, active: true },
];

function putReq(body?: string) {
  return new Request('http://localhost/api/projects/project-1/item-types/type-1/fields/reorder', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('dynamic field reorder route', () => {
  // --- Auth guarding -------------------------------------------------------
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await PUT(putReq(JSON.stringify({ fieldIds: ['field-1', 'field-2'] })), params);
    expect(response.status).toBe(401);
  });

  // --- Happy path ----------------------------------------------------------
  it('returns 200 and reordered fields for an owner', async () => {
    vi.mocked(reorderFields).mockResolvedValue(fields as never);
    const response = await PUT(putReq(JSON.stringify({ fieldIds: ['field-2', 'field-1'] })), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(fields);
    expect(reorderFields).toHaveBeenCalledWith('project-1', ['field-2', 'field-1'], 'type-1', 'owner-1');
  });

  // --- Validation errors ---------------------------------------------------
  it('returns 400 for malformed JSON', async () => {
    const malformed = await PUT(putReq('{broken'), params);
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty fieldIds array', async () => {
    const empty = await PUT(putReq(JSON.stringify({ fieldIds: [] })), params);
    expect(empty.status).toBe(400);
  });

  it('returns 400 when service throws ValidationError', async () => {
    vi.mocked(reorderFields).mockRejectedValue(new ValidationError('Invalid data'));
    const response = await PUT(putReq(JSON.stringify({ fieldIds: ['field-1'] })), params);
    expect(response.status).toBe(400);
  });

  // --- Error mapping -------------------------------------------------------
  it('returns 403 for non-owner mutations', async () => {
    vi.mocked(reorderFields).mockRejectedValue(new AuthorizationError());
    const response = await PUT(putReq(JSON.stringify({ fieldIds: ['field-1', 'field-2'] })), params);
    expect(response.status).toBe(403);
  });

  it('returns 404 when item type does not belong to project', async () => {
    vi.mocked(reorderFields).mockRejectedValue(new NotFoundError('Item type', 'type-1'));
    const notFoundRes = await PUT(putReq(JSON.stringify({ fieldIds: ['field-1'] })), params);
    expect(notFoundRes.status).toBe(404);
  });

  it('does not expose unexpected service errors', async () => {
    vi.mocked(reorderFields).mockRejectedValue(new Error('Prisma secret'));
    const response = await PUT(putReq(JSON.stringify({ fieldIds: ['field-1', 'field-2'] })), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });
});
