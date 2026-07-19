import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/status-service', () => ({
  deactivateStatus: vi.fn(),
  getStatus: vi.fn(),
  updateStatus: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { DELETE, GET, PATCH } from './route';
import { deactivateStatus, getStatus, updateStatus } from '@/lib/services/status-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemTypeId: 'type-1', statusId: 'status-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const status = {
  id: 'status-1', itemTypeId: 'type-1', name: 'Operativo', key: 'operative',
  color: '#00FF00', icon: null, description: null, order: 0, isDefault: true,
  active: true, isFinal: false, isBlocking: false, isIncident: false,
  createdAt: new Date(), updatedAt: new Date(),
};

function patchReq(body: string) {
  return new Request('http://localhost/api/projects/project-1/item-types/type-1/statuses/status-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('status resource routes', () => {
  // --- Auth guarding -------------------------------------------------------
  it('returns 401 without a session for GET', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    expect((await GET(new Request('http://localhost'), params)).status).toBe(401);
  });

  // --- GET: happy path -----------------------------------------------------
  it('returns a single status for a member', async () => {
    vi.mocked(getStatus).mockResolvedValue(status as never);
    const response = await GET(new Request('http://localhost'), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.key).toBe('operative');
    expect(getStatus).toHaveBeenCalledWith('project-1', 'status-1', 'type-1', 'owner-1');
  });

  // --- GET: error mapping --------------------------------------------------
  it('returns 404 for missing or deactivated status', async () => {
    vi.mocked(getStatus).mockRejectedValue(new NotFoundError('Status', 'status-1'));
    expect((await GET(new Request('http://localhost'), params)).status).toBe(404);
  });

  // --- PATCH: validation errors --------------------------------------------
  it('returns 400 for malformed JSON', async () => {
    const malformed = await PATCH(patchReq('{broken'), params);
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for PATCH with empty body', async () => {
    const empty = await PATCH(patchReq(JSON.stringify({})), params);
    expect(empty.status).toBe(400);
  });

  // --- PATCH: happy path ---------------------------------------------------
  it('returns 200 when owner updates a status', async () => {
    vi.mocked(updateStatus).mockResolvedValue({ ...status, name: 'Updated Name' } as never);
    const response = await PATCH(patchReq(JSON.stringify({ name: 'Updated Name' })), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.name).toBe('Updated Name');
    expect(updateStatus).toHaveBeenCalledWith('project-1', 'status-1', expect.objectContaining({ name: 'Updated Name' }), 'type-1', 'owner-1');
  });

  // --- PATCH: error mapping ------------------------------------------------
  it('returns 403 for non-owner mutations on PATCH', async () => {
    vi.mocked(updateStatus).mockRejectedValue(new AuthorizationError());
    const response = await PATCH(patchReq(JSON.stringify({ name: 'New Name' })), params);
    expect(response.status).toBe(403);
  });

  // --- DELETE: happy path --------------------------------------------------
  it('returns 200 when owner deactivates (soft-deletes) a status', async () => {
    vi.mocked(deactivateStatus).mockResolvedValue({ ...status, active: false } as never);
    const response = await DELETE(new Request('http://localhost'), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.active).toBe(false);
    expect(deactivateStatus).toHaveBeenCalledWith('project-1', 'status-1', 'type-1', 'owner-1');
  });

  // --- DELETE: error mapping -----------------------------------------------
  it('returns 403 for non-owner mutations on DELETE', async () => {
    vi.mocked(deactivateStatus).mockRejectedValue(new AuthorizationError());
    expect((await DELETE(new Request('http://localhost'), params)).status).toBe(403);
  });

  // --- General error safety ------------------------------------------------
  it('does not expose unexpected service errors on GET', async () => {
    vi.mocked(getStatus).mockRejectedValue(new Error('Prisma secret'));
    const response = await GET(new Request('http://localhost'), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });

  it('does not expose unexpected service errors on PATCH', async () => {
    vi.mocked(updateStatus).mockRejectedValue(new Error('Prisma secret'));
    const response = await PATCH(patchReq(JSON.stringify({ name: 'x' })), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });
});