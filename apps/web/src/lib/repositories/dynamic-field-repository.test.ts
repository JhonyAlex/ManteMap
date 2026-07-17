import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock Prisma client — inline factories to avoid Vitest hoisting issues
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    dynamicField: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
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
  createField,
  deactivateField,
  getFieldById,
  listFieldsByItemType,
  reorderFields,
  updateField,
} from './dynamic-field-repository';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const activeField = {
  id: 'field-1',
  itemTypeId: 'type-1',
  name: 'Serial Number',
  key: 'serial-number',
  type: 'SHORT_TEXT' as const,
  description: null,
  required: false,
  defaultValue: null,
  order: 0,
  visible: true,
  active: true,
  options: null,
  unit: null,
  validation: null,
  showInList: false,
  showInSearch: false,
  helpText: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const activeField2 = {
  ...activeField,
  id: 'field-2',
  name: 'Manufacturer',
  key: 'manufacturer',
  order: 1,
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
// listFieldsByItemType
// ---------------------------------------------------------------------------
describe('listFieldsByItemType', () => {
  it('returns fields ordered by `order` asc, scoped through parent ItemType projectId', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      activeField,
      activeField2,
    ]);

    const result = await listFieldsByItemType('project-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.dynamicField.findMany).toHaveBeenCalledWith({
      where: { itemTypeId: 'type-1', active: true },
      orderBy: { order: 'asc' },
    });
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('field-1');
    expect(result[1].id).toBe('field-2');
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      listFieldsByItemType('project-2', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.findMany).not.toHaveBeenCalled();
  });

  it('returns only active fields, excluding deactivated', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      activeField,
      activeField2,
    ]);

    const result = await listFieldsByItemType('project-1', 'type-1');

    expect(db.dynamicField.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemTypeId: 'type-1', active: true } })
    );
    expect(result).toHaveLength(2);
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxDynamicField = { findMany: vi.fn() };
    const tx = { dynamicField: mockTxDynamicField, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.dynamicField.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeField]);

    await listFieldsByItemType('project-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.dynamicField.findMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getFieldById
// ---------------------------------------------------------------------------
describe('getFieldById', () => {
  it('returns a single field scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);

    const result = await getFieldById('project-1', 'field-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.dynamicField.findFirst).toHaveBeenCalledWith({
      where: { id: 'field-1', itemTypeId: 'type-1', active: true },
    });
    expect(result).toEqual(activeField);
  });

  it('returns null for a non-existent field', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getFieldById('project-1', 'field-999', 'type-1');

    expect(result).toBeNull();
  });

  it('returns null for a deactivated field (active=false)', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getFieldById('project-1', 'field-3', 'type-1');

    expect(result).toBeNull();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      getFieldById('project-2', 'field-1', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.findFirst).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxDynamicField = { findFirst: vi.fn() };
    const tx = { dynamicField: mockTxDynamicField, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);

    await getFieldById('project-1', 'field-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.dynamicField.findFirst).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createField
// ---------------------------------------------------------------------------
describe('createField', () => {
  const fieldData = {
    name: 'Serial Number',
    key: 'serial-number',
    type: 'SHORT_TEXT' as const,
    description: null,
    required: false,
    defaultValue: null,
    order: 0,
    visible: true,
    options: null,
    unit: null,
    validation: null,
    showInList: false,
    showInSearch: false,
    helpText: null,
  };

  it('creates a field scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.create as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);

    const result = await createField('project-1', 'type-1', fieldData as any);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    expect(db.dynamicField.create).toHaveBeenCalledWith({
      data: { ...fieldData, itemTypeId: 'type-1' },
    });
    expect(result).toEqual(activeField);
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      createField('project-2', 'type-1', fieldData as any)
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.create).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxDynamicField = { create: vi.fn() };
    const tx = { dynamicField: mockTxDynamicField, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.dynamicField.create as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);

    await createField('project-1', 'type-1', fieldData as any, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.dynamicField.create).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateField
// ---------------------------------------------------------------------------
describe('updateField', () => {
  const updateData = { name: 'Updated Name', order: 5 };

  it('updates a field scoped by projectId through parent ItemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'field-1' });
    (db.dynamicField.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeField,
      ...updateData,
    });

    const result = await updateField('project-1', 'field-1', 'type-1', updateData);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    // Should check the field is active before updating
    expect(db.dynamicField.findFirst).toHaveBeenCalledWith({
      where: { id: 'field-1', itemTypeId: 'type-1', active: true },
      select: { id: true },
    });
    expect(db.dynamicField.update).toHaveBeenCalledWith({
      where: { id: 'field-1', itemTypeId: 'type-1' },
      data: updateData,
    });
    expect(result.name).toBe('Updated Name');
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      updateField('project-2', 'field-1', 'type-1', updateData)
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.findFirst).not.toHaveBeenCalled();
    expect(db.dynamicField.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when field is deactivated (active=false)', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    // Field exists but is deactivated — findFirst for active:true returns null
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      updateField('project-1', 'field-deactivated', 'type-1', updateData)
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxDynamicField = { findFirst: vi.fn(), update: vi.fn() };
    const tx = { dynamicField: mockTxDynamicField, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'field-1' });
    (tx.dynamicField.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeField,
      ...updateData,
    });

    await updateField('project-1', 'field-1', 'type-1', updateData, tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.dynamicField.findFirst).toHaveBeenCalled();
    expect(tx.dynamicField.update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// deactivateField
// ---------------------------------------------------------------------------
describe('deactivateField', () => {
  it('sets active=false on the field (soft delete)', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);
    (db.dynamicField.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeField,
      active: false,
    });

    const result = await deactivateField('project-1', 'field-1', 'type-1');

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    // First check the field exists and is active
    expect(db.dynamicField.findFirst).toHaveBeenCalledWith({
      where: { id: 'field-1', itemTypeId: 'type-1', active: true },
    });
    // Then deactivate
    expect(db.dynamicField.update).toHaveBeenCalledWith({
      where: { id: 'field-1', itemTypeId: 'type-1' },
      data: { active: false },
    });
    expect(result.active).toBe(false);
  });

  it('throws NotFoundError when field does not exist', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deactivateField('project-1', 'field-999', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when field is already deactivated', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (db.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deactivateField('project-1', 'field-3', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deactivateField('project-2', 'field-1', 'type-1')
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.findFirst).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxDynamicField = { findFirst: vi.fn(), update: vi.fn() };
    const tx = { dynamicField: mockTxDynamicField, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.dynamicField.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);
    (tx.dynamicField.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...activeField,
      active: false,
    });

    await deactivateField('project-1', 'field-1', 'type-1', tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.dynamicField.findFirst).toHaveBeenCalled();
    expect(tx.dynamicField.update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderFields
// ---------------------------------------------------------------------------
describe('reorderFields', () => {
  it('updates order values atomically for all fields in the array', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    // findMany now filters active:true
    (db.dynamicField.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...activeField, id: 'field-2' },
      { ...activeField, id: 'field-1' },
      { ...activeField, id: 'field-3' },
    ]);
    (db.dynamicField.update as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);
    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (promises: Promise<unknown>[]) => Promise.all(promises)
    );

    await reorderFields('project-1', 'type-1', ['field-2', 'field-1', 'field-3']);

    expect(db.itemType.findUnique).toHaveBeenCalledWith(
      findUniqueMatcher({ id: 'type-1', projectId: 'project-1' })
    );
    // findMany should include active:true
    expect(db.dynamicField.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['field-2', 'field-1', 'field-3'] }, itemTypeId: 'type-1', active: true },
      select: { id: true },
    });
    expect(db.dynamicField.update).toHaveBeenCalledTimes(3);
    expect(db.dynamicField.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'field-2', itemTypeId: 'type-1' },
      data: { order: 0 },
    });
    expect(db.dynamicField.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'field-1', itemTypeId: 'type-1' },
      data: { order: 1 },
    });
    expect(db.dynamicField.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'field-3', itemTypeId: 'type-1' },
      data: { order: 2 },
    });
    // Must use $transaction for atomicity
    expect(db.$transaction).toHaveBeenCalledTimes(1);
  });

  it('throws NotFoundError when parent ItemType does not belong to project', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      reorderFields('project-2', 'type-1', ['field-1'])
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if any fieldId does not belong to the itemType', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    // Only 2 out of 3 fields found (non-existent field-999)
    (db.dynamicField.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...activeField, id: 'field-1' },
      { ...activeField, id: 'field-2' },
    ]);

    await expect(
      reorderFields('project-1', 'type-1', ['field-1', 'field-2', 'field-999'])
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError if any field is deactivated', async () => {
    (db.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    // Only 2 out of 3 are found because field-3 is deactivated (active=false)
    (db.dynamicField.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...activeField, id: 'field-1' },
      { ...activeField, id: 'field-2' },
    ]);

    await expect(
      reorderFields('project-1', 'type-1', ['field-1', 'field-2', 'field-3'])
    ).rejects.toThrow(NotFoundError);
    expect(db.dynamicField.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxItemType = { findUnique: vi.fn() };
    const mockTxDynamicField = { findMany: vi.fn(), update: vi.fn() };
    const tx = { dynamicField: mockTxDynamicField, itemType: mockTxItemType } as any;
    (tx.itemType.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(parentItemType);
    (tx.dynamicField.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeField]);
    (tx.dynamicField.update as ReturnType<typeof vi.fn>).mockResolvedValue(activeField);
    // reorderFields always uses prisma.$transaction (not tx.$transaction)
    (db.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (promises: Promise<unknown>[]) => Promise.all(promises)
    );

    await reorderFields('project-1', 'type-1', ['field-1'], tx);

    expect(tx.itemType.findUnique).toHaveBeenCalled();
    expect(tx.dynamicField.findMany).toHaveBeenCalled();
    expect(tx.dynamicField.update).toHaveBeenCalled();
  });
});
