import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock Prisma client — inline factories to avoid Vitest hoisting issues
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    location: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// Import production code — RED until GREEN
import {
  createLocation,
  findLocationById,
  findLocationsByProject,
  findLocationTree,
  updateLocation,
  reorderLocations,
  deleteLocation,
} from './location-repository';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const rootLocation = {
  id: 'loc-root-1',
  projectId: 'project-1',
  parentId: null,
  name: 'Main Center',
  level: 0,
  order: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const childLocation = {
  id: 'loc-child-1',
  projectId: 'project-1',
  parentId: 'loc-root-1',
  name: 'Building A',
  level: 1,
  order: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const grandchildLocation = {
  id: 'loc-grandchild-1',
  projectId: 'project-1',
  parentId: 'loc-child-1',
  name: 'Floor 1',
  level: 2,
  order: 0,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const inactiveLocation = {
  id: 'loc-inactive-1',
  projectId: 'project-1',
  parentId: null,
  name: 'Old Center',
  level: 0,
  order: 1,
  active: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createLocation
// ---------------------------------------------------------------------------
describe('createLocation', () => {
  const createData = {
    name: 'Main Center',
    level: 0,
    order: 0,
  };

  it('creates a root location with parentId null', async () => {
    (db.location.create as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);

    const result = await createLocation('project-1', createData);

    expect(db.location.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        name: 'Main Center',
        level: 0,
        order: 0,
        parentId: null,
      },
    });
    expect(result).toEqual(rootLocation);
  });

  it('creates a child location with parentId', async () => {
    (db.location.create as ReturnType<typeof vi.fn>).mockResolvedValue(childLocation);

    const result = await createLocation('project-1', {
      name: 'Building A',
      level: 1,
      parentId: 'loc-root-1',
    });

    expect(db.location.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        name: 'Building A',
        level: 1,
        order: 0,
        parentId: 'loc-root-1',
      },
    });
    expect(result).toEqual(childLocation);
  });

  it('defaults order to 0 when not provided', async () => {
    (db.location.create as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);

    await createLocation('project-1', { name: 'Center', level: 0 });

    expect(db.location.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ order: 0 }),
    });
  });

  it('accepts optional transaction client', async () => {
    const mockTx = { location: { create: vi.fn() } };
    (mockTx.location.create as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);

    const result = await createLocation('project-1', createData, mockTx as any);

    expect(mockTx.location.create).toHaveBeenCalled();
    expect(result).toEqual(rootLocation);
  });
});

// ---------------------------------------------------------------------------
// findLocationById
// ---------------------------------------------------------------------------
describe('findLocationById', () => {
  it('returns a location by ID scoped to project', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);

    const result = await findLocationById('project-1', 'loc-root-1');

    expect(db.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'loc-root-1', projectId: 'project-1', active: true },
    });
    expect(result).toEqual(rootLocation);
  });

  it('returns null for non-existent location', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await findLocationById('project-1', 'loc-999');

    expect(result).toBeNull();
  });

  it('excludes inactive locations by default', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await findLocationById('project-1', 'loc-inactive-1');

    expect(db.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'loc-inactive-1', projectId: 'project-1', active: true },
    });
  });

  it('includes inactive locations when requested', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(inactiveLocation);

    const result = await findLocationById('project-1', 'loc-inactive-1', { includeInactive: true });

    expect(db.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'loc-inactive-1', projectId: 'project-1' },
    });
    expect(result).toEqual(inactiveLocation);
  });

  it('accepts optional transaction client', async () => {
    const mockTx = { location: { findFirst: vi.fn() } };
    (mockTx.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);

    const result = await findLocationById('project-1', 'loc-root-1', {}, mockTx as any);

    expect(mockTx.location.findFirst).toHaveBeenCalled();
    expect(result).toEqual(rootLocation);
  });
});

// ---------------------------------------------------------------------------
// findLocationsByProject
// ---------------------------------------------------------------------------
describe('findLocationsByProject', () => {
  it('returns all active locations for a project ordered by level and order', async () => {
    (db.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      rootLocation,
      childLocation,
    ]);

    const result = await findLocationsByProject('project-1');

    expect(db.location.findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1', active: true },
      orderBy: [{ level: 'asc' }, { order: 'asc' }],
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no locations exist', async () => {
    (db.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await findLocationsByProject('project-2');

    expect(result).toEqual([]);
  });

  it('accepts optional transaction client', async () => {
    const mockTx = { location: { findMany: vi.fn() } };
    (mockTx.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([rootLocation]);

    await findLocationsByProject('project-1', mockTx as any);

    expect(mockTx.location.findMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// findLocationTree
// ---------------------------------------------------------------------------
describe('findLocationTree', () => {
  it('returns a nested tree structure from flat locations', async () => {
    const allLocations = [rootLocation, childLocation, grandchildLocation];
    (db.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(allLocations);

    const result = await findLocationTree('project-1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('loc-root-1');
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children[0].id).toBe('loc-child-1');
    expect(result[0].children[0].children).toHaveLength(1);
    expect(result[0].children[0].children[0].id).toBe('loc-grandchild-1');
  });

  it('returns empty array when no locations exist', async () => {
    (db.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await findLocationTree('project-1');

    expect(result).toEqual([]);
  });

  it('handles multiple roots correctly', async () => {
    const root2 = { ...rootLocation, id: 'loc-root-2', name: 'Second Center', order: 1 };
    (db.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      rootLocation,
      root2,
      childLocation,
    ]);

    const result = await findLocationTree('project-1');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('loc-root-1');
    expect(result[1].id).toBe('loc-root-2');
  });

  it('orders children by the order field', async () => {
    const child2 = { ...childLocation, id: 'loc-child-2', name: 'Building B', order: 1 };
    (db.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      rootLocation,
      child2,
      childLocation,
    ]);

    const result = await findLocationTree('project-1');

    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0].id).toBe('loc-child-1');
    expect(result[0].children[1].id).toBe('loc-child-2');
  });

  it('accepts optional transaction client', async () => {
    const mockTx = { location: { findMany: vi.fn() } };
    (mockTx.location.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([rootLocation]);

    await findLocationTree('project-1', mockTx as any);

    expect(mockTx.location.findMany).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateLocation
// ---------------------------------------------------------------------------
describe('updateLocation', () => {
  const updateData = { name: 'Updated Center' };

  it('updates a location scoped to project', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);
    (db.location.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...rootLocation,
      ...updateData,
    });

    const result = await updateLocation('project-1', 'loc-root-1', updateData);

    expect(db.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'loc-root-1', projectId: 'project-1', active: true },
    });
    expect(db.location.update).toHaveBeenCalledWith({
      where: { id: 'loc-root-1' },
      data: updateData,
    });
    expect(result.name).toBe('Updated Center');
  });

  it('throws NotFoundError when location does not exist', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      updateLocation('project-1', 'loc-999', updateData)
    ).rejects.toThrow(NotFoundError);
    expect(db.location.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTx = { location: { findFirst: vi.fn(), update: vi.fn() } };
    (mockTx.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);
    (mockTx.location.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...rootLocation,
      ...updateData,
    });

    await updateLocation('project-1', 'loc-root-1', updateData, mockTx as any);

    expect(mockTx.location.findFirst).toHaveBeenCalled();
    expect(mockTx.location.update).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderLocations
// ---------------------------------------------------------------------------
describe('reorderLocations', () => {
  it('updates order for each location in the array', async () => {
    (db.location.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 3 });

    await reorderLocations('project-1', ['loc-c', 'loc-a', 'loc-b']);

    expect(db.location.updateMany).toHaveBeenCalledTimes(3);
    expect(db.location.updateMany).toHaveBeenCalledWith({
      where: { id: 'loc-c', projectId: 'project-1' },
      data: { order: 0 },
    });
    expect(db.location.updateMany).toHaveBeenCalledWith({
      where: { id: 'loc-a', projectId: 'project-1' },
      data: { order: 1 },
    });
    expect(db.location.updateMany).toHaveBeenCalledWith({
      where: { id: 'loc-b', projectId: 'project-1' },
      data: { order: 2 },
    });
  });

  it('accepts optional transaction client', async () => {
    const mockTx = { location: { updateMany: vi.fn() } };
    (mockTx.location.updateMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

    await reorderLocations('project-1', ['loc-a'], mockTx as any);

    expect(mockTx.location.updateMany).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// deleteLocation
// ---------------------------------------------------------------------------
describe('deleteLocation', () => {
  it('soft-deletes a location by setting active to false', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);
    (db.location.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...rootLocation,
      active: false,
    });

    await deleteLocation('project-1', 'loc-root-1');

    expect(db.location.findFirst).toHaveBeenCalledWith({
      where: { id: 'loc-root-1', projectId: 'project-1', active: true },
    });
    expect(db.location.update).toHaveBeenCalledWith({
      where: { id: 'loc-root-1' },
      data: { active: false },
    });
  });

  it('throws NotFoundError when location does not exist', async () => {
    (db.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      deleteLocation('project-1', 'loc-999')
    ).rejects.toThrow(NotFoundError);
    expect(db.location.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTx = { location: { findFirst: vi.fn(), update: vi.fn() } };
    (mockTx.location.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(rootLocation);
    (mockTx.location.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...rootLocation,
      active: false,
    });

    await deleteLocation('project-1', 'loc-root-1', mockTx as any);

    expect(mockTx.location.findFirst).toHaveBeenCalled();
    expect(mockTx.location.update).toHaveBeenCalled();
  });
});
