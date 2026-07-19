import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/dynamic-field-service', () => ({
  deactivateField: vi.fn(),
  getField: vi.fn(),
  updateField: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { DELETE, GET, PATCH } from './route';
import { deactivateField, getField, updateField } from '@/lib/services/dynamic-field-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemTypeId: 'type-1', fieldId: 'field-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const field = {
  id: 'field-1', itemTypeId: 'type-1', name: 'Serial Number', key: 'serial-number',
  type: 'SHORT_TEXT', description: null, required: false, defaultValue: null,
  order: 0, visible: true, active: true, options: null, unit: null,
  validation: null, showInList: false, showInSearch: false, helpText: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function patchReq(body: string) {
  return new Request('http://localhost/api/projects/project-1/item-types/type-1/fields/field-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('dynamic field resource routes', () => {
  // --- Auth guarding -------------------------------------------------------
  it('returns 401 without a session for GET', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    expect((await GET(new Request('http://localhost'), params)).status).toBe(401);
  });

  // --- GET: happy path -----------------------------------------------------
  it('returns a single field for a member', async () => {
    vi.mocked(getField).mockResolvedValue(field as never);
    const response = await GET(new Request('http://localhost'), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.key).toBe('serial-number');
    expect(getField).toHaveBeenCalledWith('project-1', 'field-1', 'type-1', 'owner-1');
  });

  // --- GET: error mapping --------------------------------------------------
  it('returns 404 for missing or deactivated field', async () => {
    vi.mocked(getField).mockRejectedValue(new NotFoundError('Dynamic field', 'field-1'));
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
  it('returns 200 when owner updates a field', async () => {
    vi.mocked(updateField).mockResolvedValue({ ...field, name: 'Updated Name' } as never);
    const response = await PATCH(patchReq(JSON.stringify({ name: 'Updated Name' })), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.name).toBe('Updated Name');
    expect(updateField).toHaveBeenCalledWith('project-1', 'field-1', expect.objectContaining({ name: 'Updated Name' }), 'type-1', 'owner-1');
  });

  // --- PATCH: error mapping ------------------------------------------------
  it('returns 403 for non-owner mutations on PATCH', async () => {
    vi.mocked(updateField).mockRejectedValue(new AuthorizationError());
    const response = await PATCH(patchReq(JSON.stringify({ name: 'New Name' })), params);
    expect(response.status).toBe(403);
  });

  // --- DELETE: happy path --------------------------------------------------
  it('returns 200 when owner deactivates (soft-deletes) a field', async () => {
    vi.mocked(deactivateField).mockResolvedValue({ ...field, active: false } as never);
    const response = await DELETE(new Request('http://localhost'), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.active).toBe(false);
    expect(deactivateField).toHaveBeenCalledWith('project-1', 'field-1', 'type-1', 'owner-1');
  });

  // --- DELETE: error mapping -----------------------------------------------
  it('returns 403 for non-owner mutations on DELETE', async () => {
    vi.mocked(deactivateField).mockRejectedValue(new AuthorizationError());
    expect((await DELETE(new Request('http://localhost'), params)).status).toBe(403);
  });

  // --- General error safety ------------------------------------------------
  it('does not expose unexpected service errors on GET', async () => {
    vi.mocked(getField).mockRejectedValue(new Error('Prisma secret'));
    const response = await GET(new Request('http://localhost'), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });

  it('does not expose unexpected service errors on PATCH', async () => {
    vi.mocked(updateField).mockRejectedValue(new Error('Prisma secret'));
    const response = await PATCH(patchReq(JSON.stringify({ name: 'x' })), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });
});