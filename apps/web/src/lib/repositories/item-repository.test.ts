import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock Prisma client — inline factories to avoid Vitest hoisting issues
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    item: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    itemFieldValue: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
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
  createItem,
  findItemById,
  findItemsByProject,
  updateItem,
  deleteItem,
  createItemFieldValues,
  deleteItemFieldValues,
  findFieldValuesByItemId,
} from './item-repository';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const parentItemType = {
  id: 'type-1',
  projectId: 'project-1',
  name: 'Pump',
  slug: 'pump',
};

const activeItem = {
  id: 'item-1',
  name: 'Industrial Pump A',
  slug: 'industrial-pump-a',
  itemTypeId: 'type-1',
  statusId: 'status-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activeItem2 = {
  ...activeItem,
  id: 'item-2',
  name: 'Industrial Pump B',
  slug: 'industrial-pump-b',
};

const fieldValue = {
  id: 'fv-1',
  itemId: 'item-1',
  dynamicFieldId: 'field-1',
  value: 'Widget',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fieldValue2 = {
  ...fieldValue,
  id: 'fv-2',
  dynamicFieldId: 'field-2',
  value: 42,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// helper: the call contains `select: { id: true }` for efficiency
const findUniqueMatcher = <T extends Record<string, unknown>>(where: T) =>
  expect.objectContaining({ where, select: { id: true } });

// ---------------------------------------------------------------------------
// createItem
// ---------------------------------------------------------------------------
describe('createItem', () => {
  const itemData = {
    name: 'Industrial Pump A',
    slug: 'industrial-pump-a',
    itemTypeId: 'type-1',
    statusId: 'status-1',
  };

  it('creates an item scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.create as ReturnType<typeof vi.fn>).mockResolvedValue(activeItem);

    const result = await createItem('project-1', itemData as any);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.item.create).toHaveBeenCalledWith({
      data: {
        name: 'Industrial Pump A',
        slug: 'industrial-pump-a',
        itemTypeId: 'type-1',
        statusId: 'status-1',
        locationId: null,
      },
    });
    expect(result).toEqual(activeItem);
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      createItem('project-2', itemData as any)
    ).rejects.toThrow(NotFoundError);
    expect(db.item.create).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxItem = { create: vi.fn() };
    const tx = { item: mockTxItem, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.item.create as ReturnType<typeof vi.fn>).mockResolvedValue(activeItem);

    await createItem('project-1', itemData as any, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.item.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// findItemById
// ---------------------------------------------------------------------------
describe('findItemById', () => {
  it('returns a single item scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeItem);

    const result = await findItemById('project-1', 'item-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.item.findFirst).toHaveBeenCalledWith({
      where: { id: 'item-1', itemTypeId: 'type-1' },
      include: undefined,
    });
    expect(result).toEqual(activeItem);
  });

  it('returns null for a non-existent item', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await findItemById('project-1', 'item-999', 'type-1');

    expect(result).toBeNull();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      findItemById('project-2', 'item-1', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.item.findFirst).not.toHaveBeenCalled();
  });

  it('accepts optional include parameter', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeItem,
      fieldValues: [fieldValue],
      status: { id: 'status-1', name: 'Active' },
    });

    const include = {
      fieldValues: true,
      status: true,
    };
    const result = await findItemById('project-1', 'item-1', 'type-1', include);

    expect(db.item.findFirst).toHaveBeenCalledWith({
      where: { id: 'item-1', itemTypeId: 'type-1' },
      include,
    });
    expect(result!.fieldValues).toHaveLength(1);
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxItem = { findFirst: vi.fn() };
    const tx = { item: mockTxItem, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeItem);

    await findItemById('project-1', 'item-1', 'type-1', undefined, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.item.findFirst).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// findItemsByProject
// ---------------------------------------------------------------------------
describe('findItemsByProject', () => {
  it('returns items filtered by itemTypeId', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeItem, activeItem2]);

    const result = await findItemsByProject('project-1', { itemTypeId: 'type-1' });

    expect(db.item.findMany).toHaveBeenCalledWith({
      where: { itemTypeId: 'type-1' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
      include: { location: { select: { id: true, name: true, level: true } } },
    });
    expect(result).toHaveLength(2);
  });

  it('supports pagination parameters', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeItem2]);

    const result = await findItemsByProject('project-1', {
      itemTypeId: 'type-1',
      page: 2,
      pageSize: 1,
    });

    expect(db.item.findMany).toHaveBeenCalledWith({
      where: { itemTypeId: 'type-1' },
      orderBy: { createdAt: 'desc' },
      skip: 1,
      take: 1,
      include: { location: { select: { id: true, name: true, level: true } } },
    });
    expect(result).toHaveLength(1);
  });

  it('supports statusId filter', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeItem]);

    const result = await findItemsByProject('project-1', {
      itemTypeId: 'type-1',
      statusId: 'status-1',
    });

    expect(db.item.findMany).toHaveBeenCalledWith({
      where: { itemTypeId: 'type-1', statusId: 'status-1' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
      include: { location: { select: { id: true, name: true, level: true } } },
    });
    expect(result).toHaveLength(1);
  });

  it('supports search filter (name contains)', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeItem]);

    const result = await findItemsByProject('project-1', {
      itemTypeId: 'type-1',
      search: 'pump',
    });

    expect(db.item.findMany).toHaveBeenCalledWith({
      where: {
        itemTypeId: 'type-1',
        name: { contains: 'pump', mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
      include: { location: { select: { id: true, name: true, level: true } } },
    });
    expect(result).toHaveLength(1);
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      findItemsByProject('project-2', { itemTypeId: 'type-1' })
    ).rejects.toThrow(NotFoundError);
    expect(db.item.findMany).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxItem = { findMany: vi.fn() };
    const tx = { item: mockTxItem, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.item.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeItem]);

    await findItemsByProject('project-1', { itemTypeId: 'type-1' }, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.item.findMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------
describe('updateItem', () => {
  const updateData = { name: 'Updated Pump' };

  it('updates an item scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'item-1' });
    (db.item.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeItem,
      ...updateData,
    });

    const result = await updateItem('project-1', 'item-1', 'type-1', updateData);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.item.findFirst).toHaveBeenCalledWith({
      where: { id: 'item-1', itemTypeId: 'type-1' },
      select: { id: true },
    });
    expect(db.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1', itemTypeId: 'type-1' },
      data: updateData,
    });
    expect(result.name).toBe('Updated Pump');
  });

  it('throws NotFoundError when item does not exist', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      updateItem('project-1', 'item-999', 'type-1', updateData)
    ).rejects.toThrow(NotFoundError);
    expect(db.item.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      updateItem('project-2', 'item-1', 'type-1', updateData)
    ).rejects.toThrow(NotFoundError);
    expect(db.item.findFirst).not.toHaveBeenCalled();
    expect(db.item.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxItem = { findFirst: vi.fn(), update: vi.fn() };
    const tx = { item: mockTxItem, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'item-1' });
    (tx.item.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeItem,
      ...updateData,
    });

    await updateItem('project-1', 'item-1', 'type-1', updateData, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.item.findFirst).toHaveBeenCalled();
    expect(tx.item.update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteItem
// ---------------------------------------------------------------------------
describe('deleteItem', () => {
  it('deletes an item scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'item-1' });
    (db.item.delete as ReturnType<typeof vi.fn>).mockResolvedValue(activeItem);

    await deleteItem('project-1', 'item-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.item.findFirst).toHaveBeenCalledWith({
      where: { id: 'item-1', itemTypeId: 'type-1' },
      select: { id: true },
    });
    expect(db.item.delete).toHaveBeenCalledWith({
      where: { id: 'item-1', itemTypeId: 'type-1' },
    });
  });

  it('throws NotFoundError when item does not exist', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deleteItem('project-1', 'item-999', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.item.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deleteItem('project-2', 'item-1', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.item.findFirst).not.toHaveBeenCalled();
    expect(db.item.delete).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxItem = { findFirst: vi.fn(), delete: vi.fn() };
    const tx = { item: mockTxItem, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.item.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'item-1' });
    (tx.item.delete as ReturnType<typeof vi.fn>).mockResolvedValue(activeItem);

    await deleteItem('project-1', 'item-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.item.findFirst).toHaveBeenCalled();
    expect(tx.item.delete).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createItemFieldValues
// ---------------------------------------------------------------------------
describe('createItemFieldValues', () => {
  const values = [
    { dynamicFieldId: 'field-1', value: 'Widget' },
    { dynamicFieldId: 'field-2', value: 42 },
  ];

  it('creates multiple field values in a single batch', async () => {
    (db.itemFieldValue.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 2 });

    const result = await createItemFieldValues('item-1', values);

    expect(db.itemFieldValue.createMany).toHaveBeenCalledWith({
      data: [
        { itemId: 'item-1', dynamicFieldId: 'field-1', value: 'Widget' },
        { itemId: 'item-1', dynamicFieldId: 'field-2', value: 42 },
      ],
    });
    expect(result.count).toBe(2);
  });

  it('handles empty array gracefully', async () => {
    const result = await createItemFieldValues('item-1', []);

    expect(db.itemFieldValue.createMany).not.toHaveBeenCalled();
    expect(result.count).toBe(0);
  });

  it('accepts optional transaction client', async () => {
    const mockTxFieldValue = { createMany: vi.fn() };
    const tx = { itemFieldValue: mockTxFieldValue } as any;
    (tx.itemFieldValue.createMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    await createItemFieldValues('item-1', [values[0]], tx);

    expect(tx.itemFieldValue.createMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deleteItemFieldValues
// ---------------------------------------------------------------------------
describe('deleteItemFieldValues', () => {
  it('deletes all field values for an item', async () => {
    (db.itemFieldValue.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

    const result = await deleteItemFieldValues('item-1');

    expect(db.itemFieldValue.deleteMany).toHaveBeenCalledWith({
      where: { itemId: 'item-1' },
    });
    expect(result.count).toBe(3);
  });

  it('accepts optional transaction client', async () => {
    const mockTxFieldValue = { deleteMany: vi.fn() };
    const tx = { itemFieldValue: mockTxFieldValue } as any;
    (tx.itemFieldValue.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 });

    await deleteItemFieldValues('item-1', tx);

    expect(tx.itemFieldValue.deleteMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// findFieldValuesByItemId
// ---------------------------------------------------------------------------
describe('findFieldValuesByItemId', () => {
  it('returns all field values for an item', async () => {
    (db.itemFieldValue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      fieldValue,
      fieldValue2,
    ]);

    const result = await findFieldValuesByItemId('item-1');

    expect(db.itemFieldValue.findMany).toHaveBeenCalledWith({
      where: { itemId: 'item-1' },
      include: undefined,
    });
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('Widget');
    expect(result[1].value).toBe(42);
  });

  it('returns empty array when no field values exist', async () => {
    (db.itemFieldValue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await findFieldValuesByItemId('item-999');

    expect(result).toHaveLength(0);
  });

  it('accepts optional include parameter', async () => {
    (db.itemFieldValue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...fieldValue, dynamicField: { id: 'field-1', name: 'Name', type: 'SHORT_TEXT' } },
    ]);

    const result = await findFieldValuesByItemId('item-1', { dynamicField: true });

    expect(db.itemFieldValue.findMany).toHaveBeenCalledWith({
      where: { itemId: 'item-1' },
      include: { dynamicField: true },
    });
    expect(result).toHaveLength(1);
  });

  it('accepts optional transaction client', async () => {
    const mockTxFieldValue = { findMany: vi.fn() };
    const tx = { itemFieldValue: mockTxFieldValue } as any;
    (tx.itemFieldValue.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([fieldValue]);

    await findFieldValuesByItemId('item-1', undefined, tx);

    expect(tx.itemFieldValue.findMany).toHaveBeenCalled();
  });
});
