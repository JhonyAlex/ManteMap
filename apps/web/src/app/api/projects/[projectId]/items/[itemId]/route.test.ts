import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/item-service', () => ({
  getItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { DELETE, GET, PATCH } from './route';
import { getItem, updateItem, deleteItem } from '@/lib/services/item-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemId: 'item-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const item = {
  id: 'item-1',
  name: 'Industrial Pump',
  slug: 'industrial-pump',
  itemTypeId: 'type-1',
  statusId: 'status-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};
const itemWithFields = {
  ...item,
  fieldValues: [
    { id: 'fv-1', dynamicFieldId: 'field-1', value: 'Widget', dynamicField: { id: 'field-1', name: 'Name', type: 'SHORT_TEXT' } },
  ],
  status: { id: 'status-1', name: 'Active' },
  itemType: { id: 'type-1', name: 'Pump' },
};

function getRequest() {
  return new Request('http://localhost/api/projects/project-1/items/item-1');
}

function patchRequest(body: string) {
  return new Request('http://localhost/api/projects/project-1/items/item-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function deleteRequest() {
  return new Request('http://localhost/api/projects/project-1/items/item-1', {
    method: 'DELETE',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('items resource routes', () => {
  // -------------------------------------------------------------------
  // GET — Item detail
  // -------------------------------------------------------------------
  describe('GET — item detail', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(401);
    });

    it('returns item with hydrated field values', async () => {
      vi.mocked(getItem).mockResolvedValue({ item: itemWithFields } as never);
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.id).toBe('item-1');
      expect(body.data.fieldValues).toHaveLength(1);
      expect(body.data.fieldValues[0].dynamicField.name).toBe('Name');
    });

    it('calls service with correct parameters', async () => {
      vi.mocked(getItem).mockResolvedValue({ item: itemWithFields } as never);
      await GET(getRequest(), params);
      expect(getItem).toHaveBeenCalledWith('project-1', 'item-1', 'owner-1');
    });

    it('returns 404 for missing item', async () => {
      vi.mocked(getItem).mockRejectedValue(new NotFoundError('Item', 'item-1'));
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(404);
    });

    it('does not expose unexpected errors', async () => {
      vi.mocked(getItem).mockRejectedValue(new Error('Prisma internal'));
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Prisma');
    });
  });

  // -------------------------------------------------------------------
  // PATCH — Update item
  // -------------------------------------------------------------------
  describe('PATCH — update item', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await PATCH(patchRequest(JSON.stringify({ name: 'Updated' })), params);
      expect(response.status).toBe(401);
    });

    it('returns 400 for malformed JSON', async () => {
      const response = await PATCH(patchRequest('{broken'), params);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for empty update', async () => {
      const response = await PATCH(patchRequest(JSON.stringify({})), params);
      expect(response.status).toBe(400);
    });

    it('updates item and returns 200', async () => {
      vi.mocked(updateItem).mockResolvedValue({ item } as never);
      const response = await PATCH(patchRequest(JSON.stringify({ name: 'Updated Pump' })), params);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.id).toBe('item-1');
      expect(body.message).toContain('updated');
    });

    it('passes validated data to service', async () => {
      vi.mocked(updateItem).mockResolvedValue({ item } as never);
      const input = { name: 'Updated', fieldValues: [{ dynamicFieldId: 'clfield1234567890', value: 42 }] };
      await PATCH(patchRequest(JSON.stringify(input)), params);
      expect(updateItem).toHaveBeenCalledWith('project-1', 'item-1', input, 'owner-1');
    });

    it('returns 403 for non-owner', async () => {
      vi.mocked(updateItem).mockRejectedValue(new AuthorizationError());
      const response = await PATCH(patchRequest(JSON.stringify({ name: 'Updated' })), params);
      expect(response.status).toBe(403);
    });

    it('returns 404 for missing item', async () => {
      vi.mocked(updateItem).mockRejectedValue(new NotFoundError('Item', 'item-1'));
      const response = await PATCH(patchRequest(JSON.stringify({ name: 'Updated' })), params);
      expect(response.status).toBe(404);
    });

    it('does not expose unexpected errors', async () => {
      vi.mocked(updateItem).mockRejectedValue(new Error('Prisma secret'));
      const response = await PATCH(patchRequest(JSON.stringify({ name: 'Updated' })), params);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Prisma secret');
    });
  });

  // -------------------------------------------------------------------
  // DELETE — Delete item
  // -------------------------------------------------------------------
  describe('DELETE — delete item', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(401);
    });

    it('deletes item and returns 204', async () => {
      vi.mocked(deleteItem).mockResolvedValue(undefined as never);
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(204);
    });

    it('calls service with correct parameters', async () => {
      vi.mocked(deleteItem).mockResolvedValue(undefined as never);
      await DELETE(deleteRequest(), params);
      expect(deleteItem).toHaveBeenCalledWith('project-1', 'item-1', 'owner-1');
    });

    it('returns 403 for non-owner', async () => {
      vi.mocked(deleteItem).mockRejectedValue(new AuthorizationError());
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(403);
    });

    it('returns 404 for missing item', async () => {
      vi.mocked(deleteItem).mockRejectedValue(new NotFoundError('Item', 'item-1'));
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(404);
    });

    it('does not expose unexpected errors', async () => {
      vi.mocked(deleteItem).mockRejectedValue(new Error('Prisma secret'));
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Prisma secret');
    });
  });
});
