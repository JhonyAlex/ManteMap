/**
 * Tests for FloorPlanRepository — data access for FloorPlan and LocationMarker.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "FloorPlan model with image upload" — create, findByLocation, delete
 *   "LocationMarker model with normalized coordinates" — marker CRUD
 *   "Cascade delete markers" — floor plan deletion removes markers
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Data access layer for floor plans"
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks — use vi.hoisted to avoid hoisting issues
// ---------------------------------------------------------------------------

const { mockPrismaClient } = vi.hoisted(() => ({
  mockPrismaClient: {
    floorPlan: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    locationMarker: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@mantemap/database', () => ({
  default: mockPrismaClient,
}));

import {
  createFloorPlan,
  findFloorPlanById,
  findFloorPlansByLocation,
  deleteFloorPlan,
  createMarker,
  findMarkerById,
  findMarkersByFloorPlan,
  updateMarker,
  deleteMarker,
} from './floor-plan-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const LOCATION_ID = 'clloc1xxxxxxxxxxxxxxxxxx';
const FLOOR_PLAN_ID = 'clfp1xxxxxxxxxxxxxxxxxxx';
const MARKER_ID = 'clmk1xxxxxxxxxxxxxxxxxxx';

const floorPlanRecord = {
  id: FLOOR_PLAN_ID,
  locationId: LOCATION_ID,
  name: 'Ground Floor',
  imageUrl: '/storage/proj1/floor-plans/1234-plan.png',
  width: 1920,
  height: 1080,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const markerRecord = {
  id: MARKER_ID,
  floorPlanId: FLOOR_PLAN_ID,
  itemId: null,
  x: 0.5,
  y: 0.3,
  label: 'Server Rack',
  color: '#ff0000',
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// FloorPlan CRUD
// ---------------------------------------------------------------------------

describe('FloorPlanRepository createFloorPlan', () => {
  it('creates a floor plan record', async () => {
    mockPrismaClient.floorPlan.create.mockResolvedValue(floorPlanRecord);

    const result = await createFloorPlan(LOCATION_ID, {
      name: 'Ground Floor',
      imageUrl: '/storage/proj1/floor-plans/1234-plan.png',
      width: 1920,
      height: 1080,
    });

    expect(mockPrismaClient.floorPlan.create).toHaveBeenCalledWith({
      data: {
        locationId: LOCATION_ID,
        name: 'Ground Floor',
        imageUrl: '/storage/proj1/floor-plans/1234-plan.png',
        width: 1920,
        height: 1080,
      },
    });
    expect(result).toEqual(floorPlanRecord);
  });
});

describe('FloorPlanRepository findFloorPlanById', () => {
  it('returns a floor plan when found', async () => {
    mockPrismaClient.floorPlan.findFirst.mockResolvedValue(floorPlanRecord);

    const result = await findFloorPlanById(LOCATION_ID, FLOOR_PLAN_ID);

    expect(mockPrismaClient.floorPlan.findFirst).toHaveBeenCalledWith({
      where: { id: FLOOR_PLAN_ID, locationId: LOCATION_ID, active: true },
    });
    expect(result).toEqual(floorPlanRecord);
  });

  it('returns null when not found', async () => {
    mockPrismaClient.floorPlan.findFirst.mockResolvedValue(null);

    const result = await findFloorPlanById(LOCATION_ID, 'clnonexistentxxxxxxx');

    expect(result).toBeNull();
  });
});

describe('FloorPlanRepository findFloorPlansByLocation', () => {
  it('returns floor plans for a location', async () => {
    mockPrismaClient.floorPlan.findMany.mockResolvedValue([floorPlanRecord]);

    const result = await findFloorPlansByLocation(LOCATION_ID);

    expect(mockPrismaClient.floorPlan.findMany).toHaveBeenCalledWith({
      where: { locationId: LOCATION_ID, active: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no floor plans exist', async () => {
    mockPrismaClient.floorPlan.findMany.mockResolvedValue([]);

    const result = await findFloorPlansByLocation(LOCATION_ID);

    expect(result).toEqual([]);
  });
});

describe('FloorPlanRepository deleteFloorPlan', () => {
  it('deletes a floor plan when found', async () => {
    mockPrismaClient.floorPlan.findFirst.mockResolvedValue(floorPlanRecord);
    mockPrismaClient.floorPlan.delete.mockResolvedValue(floorPlanRecord);

    await deleteFloorPlan(LOCATION_ID, FLOOR_PLAN_ID);

    expect(mockPrismaClient.floorPlan.delete).toHaveBeenCalledWith({
      where: { id: FLOOR_PLAN_ID },
    });
  });

  it('throws NotFoundError when floor plan does not exist', async () => {
    mockPrismaClient.floorPlan.findFirst.mockResolvedValue(null);

    await expect(deleteFloorPlan(LOCATION_ID, 'clnonexistentxxxxxxx')).rejects.toThrow(
      NotFoundError
    );
  });
});

// ---------------------------------------------------------------------------
// Marker CRUD
// ---------------------------------------------------------------------------

describe('FloorPlanRepository createMarker', () => {
  it('creates a marker record', async () => {
    mockPrismaClient.locationMarker.create.mockResolvedValue(markerRecord);

    const result = await createMarker(FLOOR_PLAN_ID, {
      x: 0.5,
      y: 0.3,
      label: 'Server Rack',
      color: '#ff0000',
    });

    expect(mockPrismaClient.locationMarker.create).toHaveBeenCalledWith({
      data: {
        floorPlanId: FLOOR_PLAN_ID,
        x: 0.5,
        y: 0.3,
        label: 'Server Rack',
        color: '#ff0000',
        itemId: undefined,
      },
    });
    expect(result).toEqual(markerRecord);
  });

  it('creates a marker with itemId', async () => {
    const markerWithItem = { ...markerRecord, itemId: 'clitemxxxxxxxxxxxxxxxxx' };
    mockPrismaClient.locationMarker.create.mockResolvedValue(markerWithItem);

    const result = await createMarker(FLOOR_PLAN_ID, {
      x: 0.5,
      y: 0.3,
      itemId: 'clitemxxxxxxxxxxxxxxxxx',
    });

    expect(mockPrismaClient.locationMarker.create).toHaveBeenCalledWith({
      data: {
        floorPlanId: FLOOR_PLAN_ID,
        x: 0.5,
        y: 0.3,
        label: undefined,
        color: undefined,
        itemId: 'clitemxxxxxxxxxxxxxxxxx',
      },
    });
    expect(result.itemId).toBe('clitemxxxxxxxxxxxxxxxxx');
  });
});

describe('FloorPlanRepository findMarkerById', () => {
  it('returns a marker when found', async () => {
    mockPrismaClient.locationMarker.findFirst.mockResolvedValue(markerRecord);

    const result = await findMarkerById(FLOOR_PLAN_ID, MARKER_ID);

    expect(mockPrismaClient.locationMarker.findFirst).toHaveBeenCalledWith({
      where: { id: MARKER_ID, floorPlanId: FLOOR_PLAN_ID },
    });
    expect(result).toEqual(markerRecord);
  });

  it('returns null when not found', async () => {
    mockPrismaClient.locationMarker.findFirst.mockResolvedValue(null);

    const result = await findMarkerById(FLOOR_PLAN_ID, 'clnonexistentxxxxxxx');

    expect(result).toBeNull();
  });
});

describe('FloorPlanRepository findMarkersByFloorPlan', () => {
  it('returns markers for a floor plan', async () => {
    mockPrismaClient.locationMarker.findMany.mockResolvedValue([markerRecord]);

    const result = await findMarkersByFloorPlan(FLOOR_PLAN_ID);

    expect(mockPrismaClient.locationMarker.findMany).toHaveBeenCalledWith({
      where: { floorPlanId: FLOOR_PLAN_ID },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toHaveLength(1);
  });
});

describe('FloorPlanRepository updateMarker', () => {
  it('updates marker coordinates', async () => {
    const updated = { ...markerRecord, x: 0.7, y: 0.8 };
    mockPrismaClient.locationMarker.findFirst.mockResolvedValue(markerRecord);
    mockPrismaClient.locationMarker.update.mockResolvedValue(updated);

    const result = await updateMarker(FLOOR_PLAN_ID, MARKER_ID, { x: 0.7, y: 0.8 });

    expect(mockPrismaClient.locationMarker.update).toHaveBeenCalledWith({
      where: { id: MARKER_ID },
      data: { x: 0.7, y: 0.8 },
    });
    expect(result.x).toBe(0.7);
    expect(result.y).toBe(0.8);
  });

  it('throws NotFoundError when marker does not exist', async () => {
    mockPrismaClient.locationMarker.findFirst.mockResolvedValue(null);

    await expect(
      updateMarker(FLOOR_PLAN_ID, 'clnonexistentxxxxxxx', { x: 0.5 })
    ).rejects.toThrow(NotFoundError);
  });
});

describe('FloorPlanRepository deleteMarker', () => {
  it('deletes a marker when found', async () => {
    mockPrismaClient.locationMarker.findFirst.mockResolvedValue(markerRecord);
    mockPrismaClient.locationMarker.delete.mockResolvedValue(markerRecord);

    await deleteMarker(FLOOR_PLAN_ID, MARKER_ID);

    expect(mockPrismaClient.locationMarker.delete).toHaveBeenCalledWith({
      where: { id: MARKER_ID },
    });
  });

  it('throws NotFoundError when marker does not exist', async () => {
    mockPrismaClient.locationMarker.findFirst.mockResolvedValue(null);

    await expect(deleteMarker(FLOOR_PLAN_ID, 'clnonexistentxxxxxxx')).rejects.toThrow(
      NotFoundError
    );
  });
});
