import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/repositories/item-type-repository', () => ({
  archiveItemType: vi.fn(),
  createItemType: vi.fn(),
  findItemTypeById: vi.fn(),
  findItemTypeBySlug: vi.fn(),
  findItemTypesByProject: vi.fn(),
  updateItemType: vi.fn(),
}));
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));

import {
  archiveItemType,
  createItemType,
  getItemType,
  listItemTypes,
  updateItemType,
} from './item-type-service';
import * as repository from '@/lib/repositories/item-type-repository';
import * as access from '@/lib/services/project-access-service';

const active = {
  id: 'type-1', projectId: 'project-1', name: 'Pump', slug: 'pump',
  description: null, icon: null, color: null, status: 'ACTIVE',
  createdAt: new Date(), updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(access.requireProjectOwner).mockResolvedValue(undefined);
});

describe('item type service access boundaries', () => {
  it('requires membership for reads and lists only the requested project', async () => {
    vi.mocked(repository.findItemTypesByProject).mockResolvedValue([active] as never);
    await listItemTypes('project-1', 'member-1');
    expect(access.requireProjectMember).toHaveBeenCalledWith('project-1', 'member-1');
    expect(repository.findItemTypesByProject).toHaveBeenCalledWith('project-1');
  });

  it('returns 404 for an item type from another project', async () => {
    vi.mocked(repository.findItemTypeById).mockResolvedValue(null);
    await expect(getItemType('project-1', 'type-from-project-2', 'member-1')).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.findItemTypeById).toHaveBeenCalledWith('project-1', 'type-from-project-2');
  });

  it('requires owner access for mutations, including ADMIN users', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());
    await expect(createItemType('project-1', { name: 'Pump', slug: 'pump' }, 'admin-1')).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.createItemType).not.toHaveBeenCalled();
  });
});

describe('item type service lifecycle', () => {
  it('maps a project-scoped duplicate slug to ConflictError', async () => {
    vi.mocked(repository.findItemTypeBySlug).mockResolvedValue(active as never);
    await expect(createItemType('project-1', { name: 'Pump', slug: 'pump' }, 'owner-1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('does not update an archived type', async () => {
    vi.mocked(repository.findItemTypeById).mockResolvedValue({ ...active, status: 'ARCHIVED' } as never);
    await expect(updateItemType('project-1', 'type-1', { name: 'Archived pump' }, 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
    expect(repository.updateItemType).not.toHaveBeenCalled();
  });

  it('archives instead of deleting and rejects a second archive', async () => {
    vi.mocked(repository.findItemTypeById)
      .mockResolvedValueOnce(active as never)
      .mockResolvedValueOnce({ ...active, status: 'ARCHIVED' } as never);
    vi.mocked(repository.archiveItemType).mockResolvedValue({ ...active, status: 'ARCHIVED' } as never);
    const result = await archiveItemType('project-1', 'type-1', 'owner-1');
    expect(result.itemType.status).toBe('ARCHIVED');
    await expect(archiveItemType('project-1', 'type-1', 'owner-1')).rejects.toBeInstanceOf(NotFoundError);
  });
});
