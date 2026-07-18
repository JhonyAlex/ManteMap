import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma client — inspection CRUD
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    inspection: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// RED — production code does not exist yet
import {
  createInspection,
  listByItem,
  listByUser,
} from './inspection-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ITEM_ID = 'clitemxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxx';
const STATUS_ID = 'clstatusxxxxxxxxxxxxxxx';

const inspection1 = {
  id: 'clinsp1xxxxxxxxxxxxxxxx',
  itemId: ITEM_ID,
  userId: USER_ID,
  statusId: STATUS_ID,
  notes: 'Bearing noise detected',
  photoPath: null,
  createdAt: new Date('2026-07-18T10:00:00Z'),
};

const inspection2 = {
  id: 'clinsp2xxxxxxxxxxxxxxxx',
  itemId: ITEM_ID,
  userId: 'cluser2xxxxxxxxxxxxxxxxx',
  statusId: null,
  notes: 'All clear',
  photoPath: '/uploads/inspection-photo-2.jpg',
  createdAt: new Date('2026-07-18T11:00:00Z'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InspectionRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createInspection', () => {
    it('should create an inspection with all fields', async () => {
      const data = {
        itemId: ITEM_ID,
        userId: USER_ID,
        statusId: STATUS_ID,
        notes: 'Bearing noise detected',
      };
      db.inspection.create.mockResolvedValue(inspection1);

      const result = await createInspection(data);

      expect(result.id).toBe('clinsp1xxxxxxxxxxxxxxxx');
      expect(result.itemId).toBe(ITEM_ID);
      expect(result.userId).toBe(USER_ID);
      expect(result.statusId).toBe(STATUS_ID);
      expect(result.notes).toBe('Bearing noise detected');
      expect(result.photoPath).toBeNull();
      expect(db.inspection.create).toHaveBeenCalledWith({
        data: {
          itemId: data.itemId,
          userId: data.userId,
          statusId: data.statusId,
          notes: data.notes,
          photoPath: null,
        },
      });
    });

    it('should create an inspection with minimal fields (no status, no notes)', async () => {
      const data = {
        itemId: ITEM_ID,
        userId: USER_ID,
      };
      const minimalResult = {
        id: 'clinsp3xxxxxxxxxxxxxxxx',
        itemId: ITEM_ID,
        userId: USER_ID,
        statusId: null,
        notes: null,
        photoPath: null,
        createdAt: new Date('2026-07-18T12:00:00Z'),
      };
      db.inspection.create.mockResolvedValue(minimalResult);

      const result = await createInspection(data);

      expect(result.id).toBe('clinsp3xxxxxxxxxxxxxxxx');
      expect(result.statusId).toBeNull();
      expect(result.notes).toBeNull();
      expect(db.inspection.create).toHaveBeenCalledWith({
        data: {
          itemId: data.itemId,
          userId: data.userId,
          statusId: null,
          notes: null,
          photoPath: null,
        },
      });
    });

    it('should create an inspection with a photo path', async () => {
      const data = {
        itemId: ITEM_ID,
        userId: USER_ID,
        notes: 'Photo attached',
        photoPath: '/uploads/photo.jpg',
      };
      db.inspection.create.mockResolvedValue({
        ...inspection1,
        notes: 'Photo attached',
        photoPath: '/uploads/photo.jpg',
      });

      const result = await createInspection(data);

      expect(result.photoPath).toBe('/uploads/photo.jpg');
      expect(result.notes).toBe('Photo attached');
    });
  });

  describe('listByItem', () => {
    it('should return inspections for an item ordered by newest first', async () => {
      db.inspection.findMany.mockResolvedValue([inspection2, inspection1]);

      const result = await listByItem(ITEM_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('clinsp2xxxxxxxxxxxxxxxx');
      expect(result[1].id).toBe('clinsp1xxxxxxxxxxxxxxxx');
      expect(db.inspection.findMany).toHaveBeenCalledWith({
        where: { itemId: ITEM_ID },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      });
    });

    it('should return empty array when item has no inspections', async () => {
      db.inspection.findMany.mockResolvedValue([]);

      const result = await listByItem(ITEM_ID);

      expect(result).toEqual([]);
    });
  });

  describe('listByUser', () => {
    it('should return inspections for a user ordered by newest first', async () => {
      db.inspection.findMany.mockResolvedValue([inspection1]);

      const result = await listByUser(USER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(USER_ID);
      expect(db.inspection.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
        include: { item: { select: { id: true, name: true, slug: true } } },
      });
    });

    it('should return empty array when user has no inspections', async () => {
      db.inspection.findMany.mockResolvedValue([]);

      const result = await listByUser(USER_ID);

      expect(result).toEqual([]);
    });
  });
});
