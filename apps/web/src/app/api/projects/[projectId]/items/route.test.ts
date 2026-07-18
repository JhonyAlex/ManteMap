import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/item-service', () => ({
  createItem: vi.fn(),
  listItems: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { GET, POST } from './route';
import { createItem, listItems } from '@/lib/services/item-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };
const validItemTypeId = 'clxyz1234567890abcdef';
const validStatusId = 'clxyz9876543210fedcba';
const item = {
  id: 'item-1',
  name: 'Industrial Pump',
  slug: 'industrial-pump',
  itemTypeId: validItemTypeId,
  statusId: validStatusId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function listRequest(queryParams?: Record<string, string>) {
  const url = new URL('http://localhost/api/projects/project-1/items');
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new Request(url.toString());
}

function createRequest(body?: string) {
  return new Request('http://localhost/api/projects/project-1/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('items collection routes', () => {
  // -------------------------------------------------------------------
  // GET — List items
  // -------------------------------------------------------------------
  describe('GET — list items', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await GET(listRequest(), params);
      expect(response.status).toBe(401);
    });

    it('returns items for an authenticated member', async () => {
      vi.mocked(listItems).mockResolvedValue({ items: [item] } as never);
      const response = await GET(listRequest({ itemTypeId: validItemTypeId }), params);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe('item-1');
    });

    it('passes filters to service', async () => {
      vi.mocked(listItems).mockResolvedValue({ items: [] } as never);
      await GET(listRequest({ itemTypeId: validItemTypeId, statusId: validStatusId, search: 'pump', page: '2', pageSize: '10' }), params);
      expect(listItems).toHaveBeenCalledWith(
        'project-1',
        { itemTypeId: validItemTypeId, statusId: validStatusId, search: 'pump', page: 2, pageSize: 10 },
        'user-1'
      );
    });

    it('returns 404 when project not found', async () => {
      vi.mocked(listItems).mockRejectedValue(new NotFoundError('Project', 'project-1'));
      const response = await GET(listRequest({ itemTypeId: validItemTypeId }), params);
      expect(response.status).toBe(404);
    });

    it('does not expose unexpected errors', async () => {
      vi.mocked(listItems).mockRejectedValue(new Error('Prisma secret'));
      const response = await GET(listRequest({ itemTypeId: validItemTypeId }), params);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Prisma secret');
    });
  });

  // -------------------------------------------------------------------
  // POST — Create item
  // -------------------------------------------------------------------
  describe('POST — create item', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await POST(createRequest(JSON.stringify({ name: 'Pump', itemTypeId: validItemTypeId })), params);
      expect(response.status).toBe(401);
    });

    it('returns 400 for malformed JSON', async () => {
      const response = await POST(createRequest('{broken'), params);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing required fields', async () => {
      const response = await POST(createRequest(JSON.stringify({ name: '' })), params);
      expect(response.status).toBe(400);
    });

    it('creates an item and returns 201', async () => {
      vi.mocked(createItem).mockResolvedValue({ item } as never);
      const response = await POST(createRequest(JSON.stringify({ name: 'Industrial Pump', itemTypeId: validItemTypeId })), params);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.id).toBe('item-1');
      expect(body.message).toContain('created');
    });

    it('passes validated data to service', async () => {
      vi.mocked(createItem).mockResolvedValue({ item } as never);
      const input = { name: 'Industrial Pump', itemTypeId: validItemTypeId, fieldValues: [{ dynamicFieldId: 'clfield1234567890', value: 'test' }] };
      await POST(createRequest(JSON.stringify(input)), params);
      expect(createItem).toHaveBeenCalledWith('project-1', input, 'user-1');
    });

    it('returns 404 for non-existent project or item type', async () => {
      vi.mocked(createItem).mockRejectedValue(new NotFoundError('Item type', validItemTypeId));
      const response = await POST(createRequest(JSON.stringify({ name: 'Pump', itemTypeId: validItemTypeId })), params);
      expect(response.status).toBe(404);
    });

    it('returns 403 for non-owner', async () => {
      vi.mocked(createItem).mockRejectedValue(new AuthorizationError());
      const response = await POST(createRequest(JSON.stringify({ name: 'Pump', itemTypeId: validItemTypeId })), params);
      expect(response.status).toBe(403);
    });

    it('does not expose unexpected errors', async () => {
      vi.mocked(createItem).mockRejectedValue(new Error('Database connection failed'));
      const response = await POST(createRequest(JSON.stringify({ name: 'Pump', itemTypeId: validItemTypeId })), params);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Database connection');
    });
  });
});
