import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/item-type-service', () => ({
  createItemType: vi.fn(),
  listItemTypes: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET, POST } from './route';
import { createItemType, listItemTypes } from '@/lib/services/item-type-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };
const itemType = { id: 'type-1', projectId: 'project-1', name: 'Pump', slug: 'pump', status: 'ACTIVE' };

function request(body?: string) {
  return new Request('http://localhost/api/projects/project-1/item-types', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('item type collection routes', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    expect((await GET(request(), params)).status).toBe(401);
  });

  it('returns member-scoped data', async () => {
    vi.mocked(listItemTypes).mockResolvedValue({ itemTypes: [itemType] } as never);
    const response = await GET(request(), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].projectId).toBe('project-1');
  });

  it('returns 400 for malformed JSON and validation errors', async () => {
    const malformed = await POST(request('{broken'), params);
    expect(malformed.status).toBe(400);
    expect((await malformed.json()).error).toBe('VALIDATION_ERROR');
    const invalid = await POST(request(JSON.stringify({ name: 'x' })), params);
    expect(invalid.status).toBe(400);
  });

  it('maps access, duplicate, and unexpected failures safely', async () => {
    vi.mocked(createItemType).mockRejectedValueOnce(new NotFoundError('Project', 'project-1'));
    expect((await POST(request(JSON.stringify({ name: 'Pump', slug: 'pump' })), params)).status).toBe(404);
    vi.mocked(createItemType).mockRejectedValueOnce(new AuthorizationError());
    expect((await POST(request(JSON.stringify({ name: 'Pump', slug: 'pump' })), params)).status).toBe(403);
    vi.mocked(createItemType).mockRejectedValueOnce(new ConflictError('duplicate details')); 
    const conflict = await POST(request(JSON.stringify({ name: 'Pump', slug: 'pump' })), params);
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).message).not.toContain('duplicate details');
  });
});