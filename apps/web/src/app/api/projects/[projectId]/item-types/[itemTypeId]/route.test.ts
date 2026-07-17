import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/item-type-service', () => ({
  archiveItemType: vi.fn(),
  getItemType: vi.fn(),
  updateItemType: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { DELETE, GET, PATCH } from './route';
import { archiveItemType, getItemType, updateItemType } from '@/lib/services/item-type-service';
import { getAuthUser } from '@/lib/auth/session';

const params = { params: Promise.resolve({ projectId: 'project-1', itemTypeId: 'type-1' }) };
const user = { id: 'owner-1', email: 'owner@example.com', name: 'Owner', role: 'ADMIN' };
const itemType = { id: 'type-1', projectId: 'project-1', name: 'Pump', slug: 'pump', status: 'ACTIVE' };

function patch(body: string) {
  return new Request('http://localhost/api/projects/project-1/item-types/type-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('item type resource routes', () => {
  it('returns 404 for wrong-project or missing resources', async () => {
    vi.mocked(getItemType).mockRejectedValue(new NotFoundError('Item type', 'type-1'));
    expect((await GET(new Request('http://localhost'), params)).status).toBe(404);
  });

  it('returns 400 for malformed JSON and validation failures', async () => {
    expect((await PATCH(patch('{broken'), params)).status).toBe(400);
    expect((await PATCH(patch(JSON.stringify({})), params)).status).toBe(400);
  });

  it('returns 403 for non-owner mutation and archives on DELETE', async () => {
    vi.mocked(updateItemType).mockRejectedValue(new AuthorizationError());
    expect((await PATCH(patch(JSON.stringify({ name: 'New pump' })), params)).status).toBe(403);
    vi.mocked(archiveItemType).mockResolvedValue({ itemType: { ...itemType, status: 'ARCHIVED' } } as never);
    const response = await DELETE(new Request('http://localhost'), params);
    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe('ARCHIVED');
    expect(archiveItemType).toHaveBeenCalledWith('project-1', 'type-1', 'owner-1');
  });

  it('does not expose unexpected service errors', async () => {
    vi.mocked(updateItemType).mockRejectedValue(new Error('Prisma secret')); 
    const response = await PATCH(patch(JSON.stringify({ name: 'New pump' })), params);
    expect(response.status).toBe(500);
    expect((await response.json()).message).not.toContain('Prisma secret');
  });
});
