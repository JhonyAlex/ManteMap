import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock Prisma client — inline factories to avoid Vitest hoisting issues
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    status: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    itemType: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// Import production code — RED until GREEN
import {
  createStatus,
  deactivateStatus,
  getDefaultStatus,
  getStatusById,
  listStatusesByItemType,
  reorderStatuses,
  setDefaultStatus,
  updateStatus,
} from './status-repository';

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

const parentItemType = {
  id: 'type-1',
  projectId: 'project-1',
  name: 'Pump',
  slug: 'pump',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// helper: the call contains `select: { id: true }` for efficiency
const findUniqueMatcher = <T extends Record<string, unknown>>(where: T) =>
  expect.objectContaining({ where, select: { id: true } });

// ---------------------------------------------------------------------------
// listStatusesByItemType
// ---------------------------------------------------------------------------
describe('listStatusesByItemType', () => {
  it('returns statuses ordered by `order` asc, scoped through parent ItemType projectId', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      activeStatus,
      activeStatus2,
    ]);

    const result = await listStatusesByItemType('project-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.status.findMany).toHaveBeenCalledWith({
      where: { itemTypeId: 'type-1', active: true },
      orderBy: { order: 'asc' },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('status-1');
    expect(result[1].id).toBe('status-2');
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      listStatusesByItemType('project-2', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.status.findMany).not.toHaveBeenCalled();
  });

  it('returns only active statuses, excluding deactivated', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      activeStatus,
      activeStatus2,
    ]);

    const result = await listStatusesByItemType('project-1', 'type-1');

    expect(db.status.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemTypeId: 'type-1', active: true } })
    );
    expect(result).toHaveLength(2);
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = { findMany: vi.fn() };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeStatus]);

    await listStatusesByItemType('project-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.findMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getStatusById
// ---------------------------------------------------------------------------
describe('getStatusById', () => {
  it('returns a single status scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);

    const result = await getStatusById('project-1', 'status-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.status.findFirst).toHaveBeenCalledWith({
      where: { id: 'status-1', itemTypeId: 'type-1', active: true },
    });
    expect(result).toEqual(activeStatus);
  });

  it('returns null for a non-existent status', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getStatusById('project-1', 'status-999', 'type-1');

    expect(result).toBeNull();
  });

  it('returns null for a deactivated status (active=false)', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getStatusById('project-1', 'status-3', 'type-1');

    expect(result).toBeNull();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getStatusById('project-2', 'status-1', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.status.findFirst).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = { findFirst: vi.fn() };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);

    await getStatusById('project-1', 'status-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.findFirst).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createStatus
// ---------------------------------------------------------------------------
describe('createStatus', () => {
  const statusData = {
    name: 'Operativo',
    key: 'operative',
    color: '#00FF00',
    icon: null,
    description: null,
    order: 0,
    isDefault: true,
    isFinal: false,
    isBlocking: false,
    isIncident: false,
  };

  it('creates a status scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.create as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);

    const result = await createStatus('project-1', 'type-1', statusData as any);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.status.create).toHaveBeenCalledWith({
      data: { ...statusData, itemTypeId: 'type-1' },
    });
    expect(result).toEqual(activeStatus);
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      createStatus('project-2', 'type-1', statusData as any)
    ).rejects.toThrow(NotFoundError);
    expect(db.status.create).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = { create: vi.fn() };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.create as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);

    await createStatus('project-1', 'type-1', statusData as any, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------
describe('updateStatus', () => {
  const updateData = { name: 'Updated Name', order: 5 };

  it('updates a status scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'status-1' });
    (db.status.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeStatus,
      ...updateData,
    });

    const result = await updateStatus('project-1', 'status-1', 'type-1', updateData);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    // Should check the status is active before updating
    expect(db.status.findFirst).toHaveBeenCalledWith({
      where: { id: 'status-1', itemTypeId: 'type-1', active: true },
      select: { id: true },
    });
    expect(db.status.update).toHaveBeenCalledWith({
      where: { id: 'status-1', itemTypeId: 'type-1' },
      data: updateData,
    });
    expect(result.name).toBe('Updated Name');
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      updateStatus('project-2', 'status-1', 'type-1', updateData)
    ).rejects.toThrow(NotFoundError);
    expect(db.status.findFirst).not.toHaveBeenCalled();
    expect(db.status.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when status is deactivated (active=false)', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      updateStatus('project-1', 'status-deactivated', 'type-1', updateData)
    ).rejects.toThrow(NotFoundError);
    expect(db.status.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = { findFirst: vi.fn(), update: vi.fn() };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'status-1' });
    (tx.status.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeStatus,
      ...updateData,
    });

    await updateStatus('project-1', 'status-1', 'type-1', updateData, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.findFirst).toHaveBeenCalled();
    expect(tx.status.update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deactivateStatus
// ---------------------------------------------------------------------------
describe('deactivateStatus', () => {
  it('sets active=false on the status (soft delete)', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);
    (db.status.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeStatus,
      active: false,
    });

    const result = await deactivateStatus('project-1', 'status-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.status.findFirst).toHaveBeenCalledWith({
      where: { id: 'status-1', itemTypeId: 'type-1', active: true },
    });
    expect(db.status.update).toHaveBeenCalledWith({
      where: { id: 'status-1', itemTypeId: 'type-1' },
      data: { active: false },
    });
    expect(result.active).toBe(false);
  });

  it('throws NotFoundError when status does not exist', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deactivateStatus('project-1', 'status-999', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.status.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when status is already deactivated', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deactivateStatus('project-1', 'status-3', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.status.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deactivateStatus('project-2', 'status-1', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.status.findFirst).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = { findFirst: vi.fn(), update: vi.fn() };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);
    (tx.status.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeStatus,
      active: false,
    });

    await deactivateStatus('project-1', 'status-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.findFirst).toHaveBeenCalled();
    expect(tx.status.update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderStatuses
// ---------------------------------------------------------------------------
describe('reorderStatuses', () => {
  it('updates order values atomically for all statuses in the array', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...activeStatus, id: 'status-2' },
      { ...activeStatus, id: 'status-1' },
      { ...activeStatus, id: 'status-3' },
    ]);
    (db.status.update as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);
    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (promises: Promise<unknown>[]) => Promise.all(promises)
    );

    await reorderStatuses('project-1', 'type-1', ['status-2', 'status-1', 'status-3']);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.status.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['status-2', 'status-1', 'status-3'] }, itemTypeId: 'type-1', active: true },
      select: { id: true },
    });
    expect(db.status.update).toHaveBeenCalledTimes(3);
    expect(db.status.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'status-2', itemTypeId: 'type-1' },
      data: { order: 0 },
    });
    expect(db.status.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'status-1', itemTypeId: 'type-1' },
      data: { order: 1 },
    });
    expect(db.status.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'status-3', itemTypeId: 'type-1' },
      data: { order: 2 },
    });
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      reorderStatuses('project-2', 'type-1', ['status-1'])
    ).rejects.toThrow(NotFoundError);
    expect(db.status.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if any statusId does not belong to the itemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...activeStatus, id: 'status-1' },
      { ...activeStatus, id: 'status-2' },
    ]);

    await expect(
      reorderStatuses('project-1', 'type-1', ['status-1', 'status-2', 'status-999'])
    ).rejects.toThrow(NotFoundError);
    expect(db.status.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if any status is deactivated', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...activeStatus, id: 'status-1' },
      { ...activeStatus, id: 'status-2' },
    ]);

    await expect(
      reorderStatuses('project-1', 'type-1', ['status-1', 'status-2', 'status-3'])
    ).rejects.toThrow(NotFoundError);
    expect(db.status.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = { findMany: vi.fn(), update: vi.fn() };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeStatus]);
    (tx.status.update as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);
    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (promises: Promise<unknown>[]) => Promise.all(promises)
    );

    await reorderStatuses('project-1', 'type-1', ['status-1'], tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.findMany).toHaveBeenCalled();
    expect(tx.status.update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getDefaultStatus
// ---------------------------------------------------------------------------
describe('getDefaultStatus', () => {
  it('returns the status where isDefault=true and active=true', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);

    const result = await getDefaultStatus('project-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.status.findFirst).toHaveBeenCalledWith({
      where: { itemTypeId: 'type-1', isDefault: true, active: true },
    });
    expect(result).toEqual(activeStatus);
  });

  it('returns null when no default status exists', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getDefaultStatus('project-1', 'type-1');

    expect(result).toBeNull();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getDefaultStatus('project-2', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.status.findFirst).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = { findFirst: vi.fn() };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeStatus);

    await getDefaultStatus('project-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.findFirst).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// setDefaultStatus
// ---------------------------------------------------------------------------
describe('setDefaultStatus', () => {
  it('un-sets previous default and sets new default in a transaction', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    // The status to make default exists and is active (single findFirst call)
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'status-2' });
    (db.status.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (db.status.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeStatus2,
      isDefault: true,
    });
    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (ops: Promise<unknown>[]) => Promise.all(ops)
    );

    const result = await setDefaultStatus('project-1', 'status-2', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(result.isDefault).toBe(true);
  });

  it('throws NotFoundError when status is deactivated', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null); // deactivated

    await expect(
      setDefaultStatus('project-1', 'status-deactivated', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      setDefaultStatus('project-2', 'status-1', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxStatus = {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    };
    const tx = { status: mockTxStatus, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.status.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'status-2' });
    (tx.status.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });
    (tx.status.update as ReturnType<typeof vi.fn>).mockResolvedValue({ ...activeStatus2, isDefault: true });
    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (ops: Promise<unknown>[]) => Promise.all(ops)
    );

    await setDefaultStatus('project-1', 'status-2', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.status.findFirst).toHaveBeenCalled();
  });
});
