import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';

vi.mock('@/lib/services/dynamic-field-service', () => ({
  createField: vi.fn(),
  listFields: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET, POST } from './route';
import { createField, listFields } from '@/lib/services/dynamic-field-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemTypeId: 'type-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const field = {
  id: 'field-1', itemTypeId: 'type-1', name: 'Serial Number', key: 'serial-number',
  type: 'SHORT_TEXT', description: null, required: false, defaultValue: null,
  order: 0, visible: true, active: true, options: null, unit: null,
  validation: null, showInList: false, showInSearch: false, helpText: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function postReq(body?: string) {
  return new Request('http://localhost/api/projects/project-1/item-types/type-1/fields', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('dynamic field collection routes', () => {
  // --- Auth guarding -------------------------------------------------------
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    expect((await GET(new Request('http://localhost'), params)).status).toBe(401);
  });

  it('returns 401 on POST without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await POST(postReq(JSON.stringify({ name: 'Field', key: 'field', type: 'SHORT_TEXT' })), params);
    expect(response.status).toBe(401);
  });

  // --- GET: happy path -----------------------------------------------------
  it('returns ordered field list for a member', async () => {
    vi.mocked(listFields).mockResolvedValue([field] as never);
    const response = await GET(new Request('http://localhost'), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data).toHaveLength(1);
    expect(listFields).toHaveBeenCalledWith('project-1', 'type-1', 'owner-1');
  });

  // --- GET: error mapping --------------------------------------------------
  it('returns 404 when project or item type is not found', async () => {
    vi.mocked(listFields).mockRejectedValue(new NotFoundError('Item type', 'type-1'));
    expect((await GET(new Request('http://localhost'), params)).status).toBe(404);
  });

  // --- POST: happy path ----------------------------------------------------
  it('returns 201 when owner creates a field', async () => {
    vi.mocked(createField).mockResolvedValue(field as never);
    const response = await POST(postReq(JSON.stringify({ name: 'Serial Number', key: 'serial-number', type: 'SHORT_TEXT' })), params);
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.data.key).toBe('serial-number');
    expect(createField).toHaveBeenCalledWith('project-1', expect.objectContaining({ key: 'serial-number' }), 'type-1', 'owner-1');
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
    vi.mocked(createField).mockRejectedValue(new ValidationError('Invalid data'));
    const response = await POST(postReq(JSON.stringify({ name: 'Field', key: 'field', type: 'INVALID_TYPE' })), params);
    expect(response.status).toBe(400);
  });

  // --- POST: error mapping -------------------------------------------------
  it('returns 403 for non-owner mutations', async () => {
    vi.mocked(createField).mockRejectedValue(new AuthorizationError());
    const response = await POST(postReq(JSON.stringify({ name: 'Field', key: 'field', type: 'SHORT_TEXT' })), params);
    expect(response.status).toBe(403);
  });

  it('returns 409 for duplicate field key', async () => {
    vi.mocked(createField).mockRejectedValue(new ConflictError('duplicate key'));
    const conflictRes = await POST(postReq(JSON.stringify({ name: 'Field', key: 'field', type: 'SHORT_TEXT' })), params);
    expect(conflictRes.status).toBe(409);
    expect((await conflictRes.json()).error).toBe('CONFLICT');
  });

  it('returns 404 when item type does not belong to project', async () => {
    vi.mocked(createField).mockRejectedValue(new NotFoundError('Item type', 'type-1'));
    const notFoundRes = await POST(postReq(JSON.stringify({ name: 'Field', key: 'field', type: 'SHORT_TEXT' })), params);
    expect(notFoundRes.status).toBe(404);
  });

  it('does not expose unexpected service errors', async () => {
    vi.mocked(createField).mockRejectedValue(new Error('Prisma secret'));
    const response = await POST(postReq(JSON.stringify({ name: 'Field', key: 'field', type: 'SHORT_TEXT' })), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe('Internal server error');
  });
});