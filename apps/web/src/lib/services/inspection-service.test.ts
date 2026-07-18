import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock repository layer
// ---------------------------------------------------------------------------
vi.mock('@/lib/repositories/inspection-repository', () => ({
  createInspection: vi.fn(),
  listByItem: vi.fn(),
  listByUser: vi.fn(),
}));

vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));

import {
  createInspection as createInspectionRepo,
  listByItem as listByItemRepo,
  listByUser as listByUserRepo,
} from '@/lib/repositories/inspection-repository';
import { requireProjectMember } from '@/lib/services/project-access-service';

// RED — production code does not exist yet
import {
  logInspection,
  getInspectionsByItem,
  getInspectionsByUser,
} from './inspection-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxx';
const ITEM_ID = 'clitemxxxxxxxxxxxxxxxxx';

const mockInspection = {
  id: 'clinsp1xxxxxxxxxxxxxxxx',
  itemId: ITEM_ID,
  userId: USER_ID,
  statusId: 'clstatusxxxxxxxxxxxxxxx',
  notes: 'All good',
  photoPath: null,
  createdAt: new Date('2026-07-18T10:00:00Z'),
  user: { name: 'John Doe', email: 'john@example.com' },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InspectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireProjectMember).mockResolvedValue();
    vi.mocked(listByItemRepo).mockResolvedValue([mockInspection]);
    vi.mocked(listByUserRepo).mockResolvedValue([mockInspection]);
  });

  describe('logInspection', () => {
    it('should require project membership before logging', async () => {
      vi.mocked(createInspectionRepo).mockResolvedValue(mockInspection);

      await logInspection(PROJECT_ID, {
        itemId: ITEM_ID,
        userId: USER_ID,
      });

      expect(requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
    });

    it('should create inspection with all fields', async () => {
      vi.mocked(createInspectionRepo).mockResolvedValue(mockInspection);

      const result = await logInspection(PROJECT_ID, {
        itemId: ITEM_ID,
        userId: USER_ID,
        statusId: 'clstatusxxxxxxxxxxxxxxx',
        notes: 'All good',
      });

      expect(result.inspection).toEqual(mockInspection);
      expect(createInspectionRepo).toHaveBeenCalledWith({
        itemId: ITEM_ID,
        userId: USER_ID,
        statusId: 'clstatusxxxxxxxxxxxxxxx',
        notes: 'All good',
        photoPath: undefined,
      });
    });

    it('should create inspection with minimal fields', async () => {
      const minimalInspection = {
        ...mockInspection,
        statusId: null,
        notes: null,
      };
      vi.mocked(createInspectionRepo).mockResolvedValue(minimalInspection);

      const result = await logInspection(PROJECT_ID, {
        itemId: ITEM_ID,
        userId: USER_ID,
      });

      expect(result.inspection.statusId).toBeNull();
      expect(result.inspection.notes).toBeNull();
      expect(createInspectionRepo).toHaveBeenCalledWith({
        itemId: ITEM_ID,
        userId: USER_ID,
        statusId: undefined,
        notes: undefined,
        photoPath: undefined,
      });
    });
  });

  describe('getInspectionsByItem', () => {
    it('should require project membership and return inspections', async () => {
      const inspections = [mockInspection, { ...mockInspection, id: 'clinsp2' }];
      vi.mocked(listByItemRepo).mockResolvedValue(inspections);

      const result = await getInspectionsByItem(PROJECT_ID, ITEM_ID, USER_ID);

      expect(requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
      expect(listByItemRepo).toHaveBeenCalledWith(ITEM_ID);
      expect(result.inspections).toHaveLength(2);
    });

    it('should return empty array when no inspections', async () => {
      vi.mocked(listByItemRepo).mockResolvedValue([]);

      const result = await getInspectionsByItem(PROJECT_ID, ITEM_ID, USER_ID);

      expect(result.inspections).toEqual([]);
    });
  });

  describe('getInspectionsByUser', () => {
    it('should return inspections for a user', async () => {
      const result = await getInspectionsByUser(USER_ID);

      expect(listByUserRepo).toHaveBeenCalledWith(USER_ID);
      expect(result.inspections).toHaveLength(1);
      expect(result.inspections[0].userId).toBe(USER_ID);
    });

    it('should return empty array when user has no inspections', async () => {
      vi.mocked(listByUserRepo).mockResolvedValue([]);

      const result = await getInspectionsByUser(USER_ID);

      expect(result.inspections).toEqual([]);
    });
  });
});
