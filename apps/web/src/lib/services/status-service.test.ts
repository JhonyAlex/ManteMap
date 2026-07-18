import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock prisma — needed for $transaction in create/update with isDefault
// ---------------------------------------------------------------------------
const txClient = {
  status: {
    updateMany: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  itemType: { findUnique: vi.fn() },
};

vi.mock('@mantemap/database', () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock repository
// ---------------------------------------------------------------------------
vi.mock('@/lib/repositories/status-repository', () => ({
  createStatus: vi.fn(),
  deactivateStatus: vi.fn(),
  getDefaultStatus: vi.fn(),
  getStatusById: vi.fn(),
  listStatusesByItemType: vi.fn(),
  reorderStatuses: vi.fn(),
  setDefaultStatus: vi.fn(),
  updateStatus: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock access guards
// ---------------------------------------------------------------------------
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));

import {
  createStatus,
  deactivateStatus,
  getStatus,
  listStatuses,
  reorderStatuses,
  setDefaultStatus,
  updateStatus,
} from './status-service';
import * as repository from '@/lib/repositories/status-repository';
import * as access from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const activeStatus = {
  id: 'status-1',
  itemTypeId: 'type-1',
  name: 'Operativo',
  key: 'operative',
  color: '#00FF00',
  icon: null,
  description: null,
  order: 0,
  isDefault: true,
  active: true,
  isFinal: false,
  isBlocking: false,
  isIncident: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activeStatus2 = {
  ...activeStatus,
  id: 'status-2',
  name: 'En Mantenimiento',
  key: 'maintenance',
  color: '#FFAA00',
  order: 1,
  isDefault: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statusInput: any = {
  name: 'Operativo',
  key: 'operative',
  color: '#00FF00',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(access.requireProjectOwner).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// listStatuses
// ---------------------------------------------------------------------------
describe('listStatuses', () => {
  it('requires project membership and returns ordered statuses', async () => {
    vi.mocked(repository.listStatusesByItemType).mockResolvedValue([
      activeStatus as never,
      activeStatus2 as never,
    ]);

    const result = await listStatuses('project-1', 'type-1', 'member-1');

    expect(access.requireProjectMember).toHaveBeenCalledWith('project-1', 'member-1');
    expect(repository.listStatusesByItemType).toHaveBeenCalledWith(
      'project-1',
      'type-1'
    );
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('status-1');
    expect(result[1].id).toBe('status-2');
  });

  it('throws AuthorizationError when requireProjectMember rejects', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new AuthorizationError());

    await expect(
      listStatuses('project-1', 'type-1', 'non-member')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.listStatusesByItemType).not.toHaveBeenCalled();
  });

  it('returns empty array when ItemType has no statuses', async () => {
    vi.mocked(repository.listStatusesByItemType).mockResolvedValue([]);

    const result = await listStatuses('project-1', 'type-1', 'member-1');

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getStatus
// ---------------------------------------------------------------------------
describe('getStatus', () => {
  it('requires membership and returns a single status', async () => {
    vi.mocked(repository.getStatusById).mockResolvedValue(activeStatus as never);

    const result = await getStatus('project-1', 'status-1', 'type-1', 'member-1');

    expect(access.requireProjectMember).toHaveBeenCalledWith('project-1', 'member-1');
    expect(repository.getStatusById).toHaveBeenCalledWith(
      'project-1',
      'status-1',
      'type-1'
    );
    expect(result.id).toBe('status-1');
  });

  it('throws NotFoundError when status does not exist', async () => {
    vi.mocked(repository.getStatusById).mockResolvedValue(null);

    await expect(
      getStatus('project-1', 'status-999', 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws NotFoundError when status is deactivated', async () => {
    vi.mocked(repository.getStatusById).mockResolvedValue(null);

    await expect(
      getStatus('project-1', 'status-3', 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws AuthorizationError when requireProjectMember rejects', async () => {
    vi.mocked(access.requireProjectMember).mockRejectedValue(new AuthorizationError());

    await expect(
      getStatus('project-1', 'status-1', 'type-1', 'non-member')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.getStatusById).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createStatus
// ---------------------------------------------------------------------------
describe('createStatus', () => {
  it('requires project ownership, validates input, and creates a status', async () => {
    vi.mocked(repository.createStatus).mockResolvedValue(activeStatus as never);

    const result = await createStatus('project-1', statusInput, 'type-1', 'owner-1');

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.createStatus).toHaveBeenCalledWith(
      'project-1',
      'type-1',
      expect.objectContaining({
        name: 'Operativo',
        key: 'operative',
        color: '#00FF00',
      })
    );
    expect(result.id).toBe('status-1');
  });

  it('throws ValidationError when input fails Zod validation', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invalidInput: any = { name: '', key: 'Invalid Key!', color: 'not-a-color' };

    await expect(
      createStatus('project-1', invalidInput, 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.createStatus).not.toHaveBeenCalled();
  });

  it('throws ConflictError on duplicate key', async () => {
    const p2002Error = Object.assign(new Error('Unique constraint failed'), {
      code: 'P2002',
    });
    vi.mocked(repository.createStatus).mockRejectedValue(p2002Error);

    expect(p2002Error.code).toBe('P2002');

    await expect(
      createStatus('project-1', statusInput, 'type-1', 'owner-1')
    ).rejects.toThrow(
      'A status with this key already exists in this item type'
    );
  });

  it('throws AuthorizationError when non-owner member calls create', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      createStatus('project-1', statusInput, 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.createStatus).not.toHaveBeenCalled();
  });

  it('wraps in transaction when isDefault=true to unset previous default', async () => {
    const defaultInput = { ...statusInput, isDefault: true };

    // Mock prisma.$transaction to invoke the callback with txClient
    const prismaModule = await import('@mantemap/database');
    const prisma = prismaModule.default as any;
    vi.mocked(prisma.$transaction).mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) => fn(txClient)
    );

    // createStatusRepo should be called with the txClient
    vi.mocked(repository.createStatus).mockResolvedValue(activeStatus as never);

    const result = await createStatus('project-1', defaultInput, 'type-1', 'owner-1');

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.id).toBe('status-1');
    expect(repository.createStatus).toHaveBeenCalledWith(
      'project-1',
      'type-1',
      expect.objectContaining({
        name: 'Operativo',
        key: 'operative',
      }),
      txClient,
    );
  });
});

// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------
describe('updateStatus', () => {
  it('requires project ownership, validates input, and updates a status', async () => {
    const updateInput = { name: 'Updated Name' };
    vi.mocked(repository.updateStatus).mockResolvedValue({
      ...activeStatus,
      name: 'Updated Name',
    } as never);

    const result = await updateStatus(
      'project-1',
      'status-1',
      updateInput,
      'type-1',
      'owner-1'
    );

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.updateStatus).toHaveBeenCalledWith(
      'project-1',
      'status-1',
      'type-1',
      expect.objectContaining({ name: 'Updated Name' })
    );
    expect(result.name).toBe('Updated Name');
  });

  it('throws ValidationError when update input fails Zod validation', async () => {
    const invalidInput = { key: 'Invalid Key!' };

    await expect(
      updateStatus('project-1', 'status-1', invalidInput, 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it('throws AuthorizationError when non-owner member calls update', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      updateStatus('project-1', 'status-1', { name: 'X' }, 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deactivateStatus
// ---------------------------------------------------------------------------
describe('deactivateStatus', () => {
  it('requires project ownership and deactivates a status', async () => {
    vi.mocked(repository.deactivateStatus).mockResolvedValue({
      ...activeStatus,
      active: false,
    } as never);

    const result = await deactivateStatus(
      'project-1',
      'status-1',
      'type-1',
      'owner-1'
    );

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.deactivateStatus).toHaveBeenCalledWith(
      'project-1',
      'status-1',
      'type-1'
    );
    expect(result.active).toBe(false);
  });

  it('throws NotFoundError when status is already deactivated', async () => {
    const notFoundErr = new NotFoundError('Status', 'status-3');
    vi.mocked(repository.deactivateStatus).mockRejectedValue(notFoundErr);

    await expect(
      deactivateStatus('project-1', 'status-3', 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('throws AuthorizationError when non-owner member calls deactivate', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      deactivateStatus('project-1', 'status-1', 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.deactivateStatus).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderStatuses
// ---------------------------------------------------------------------------
describe('reorderStatuses', () => {
  it('requires project ownership, validates input, and reorders statuses', async () => {
    vi.mocked(repository.reorderStatuses).mockResolvedValue(undefined as never);

    await reorderStatuses(
      'project-1',
      ['status-2', 'status-1', 'status-3'],
      'type-1',
      'owner-1'
    );

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.reorderStatuses).toHaveBeenCalledWith(
      'project-1',
      'type-1',
      ['status-2', 'status-1', 'status-3']
    );
  });

  it('throws ValidationError when statusIds array is empty', async () => {
    await expect(
      reorderStatuses('project-1', [], 'type-1', 'owner-1')
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.reorderStatuses).not.toHaveBeenCalled();
  });

  it('throws AuthorizationError when non-owner member calls reorder', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      reorderStatuses('project-1', ['status-1'], 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.reorderStatuses).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setDefaultStatus
// ---------------------------------------------------------------------------
describe('setDefaultStatus', () => {
  it('requires project ownership and sets default via repository', async () => {
    vi.mocked(repository.setDefaultStatus).mockResolvedValue({
      ...activeStatus2,
      isDefault: true,
    } as never);

    const result = await setDefaultStatus(
      'project-1',
      'status-2',
      'type-1',
      'owner-1'
    );

    expect(access.requireProjectOwner).toHaveBeenCalledWith('project-1', 'owner-1');
    expect(repository.setDefaultStatus).toHaveBeenCalledWith(
      'project-1',
      'status-2',
      'type-1'
    );
    expect(result.isDefault).toBe(true);
  });

  it('throws AuthorizationError when non-owner member calls setDefault', async () => {
    vi.mocked(access.requireProjectOwner).mockRejectedValue(new AuthorizationError());

    await expect(
      setDefaultStatus('project-1', 'status-1', 'type-1', 'member-1')
    ).rejects.toBeInstanceOf(AuthorizationError);
    expect(repository.setDefaultStatus).not.toHaveBeenCalled();
  });
});
