import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma client — notification delivery CRUD
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    notificationDelivery: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// RED — production code does not exist yet
import { createDelivery, existsDelivery, listDeliveries } from './notification-delivery-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ALERT_ID = 'clalertxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

const sentDelivery = {
  id: 'cldelivxxxxxxxxxxxxxxxx',
  alertId: ALERT_ID,
  userId: USER_ID,
  channelType: 'email',
  status: 'sent',
  errorMessage: null,
  deliveredAt: new Date('2026-01-01'),
};

const failedDelivery = {
  id: 'cldeliv2xxxxxxxxxxxxxxx',
  alertId: ALERT_ID,
  userId: USER_ID,
  channelType: 'slack',
  status: 'failed',
  errorMessage: 'Webhook returned 500',
  deliveredAt: new Date('2026-01-01'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationDeliveryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDelivery', () => {
    it('should create a successful delivery record', async () => {
      db.notificationDelivery.create.mockResolvedValue(sentDelivery);

      const result = await createDelivery({
        alertId: ALERT_ID,
        userId: USER_ID,
        channelType: 'email',
        status: 'sent',
      });

      expect(result).toEqual(sentDelivery);
      expect(db.notificationDelivery.create).toHaveBeenCalledWith({
        data: {
          alertId: ALERT_ID,
          userId: USER_ID,
          channelType: 'email',
          status: 'sent',
        },
      });
    });

    it('should create a failed delivery record with error message', async () => {
      db.notificationDelivery.create.mockResolvedValue(failedDelivery);

      const result = await createDelivery({
        alertId: ALERT_ID,
        userId: USER_ID,
        channelType: 'slack',
        status: 'failed',
        errorMessage: 'Webhook returned 500',
      });

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Webhook returned 500');
      expect(db.notificationDelivery.create).toHaveBeenCalledWith({
        data: {
          alertId: ALERT_ID,
          userId: USER_ID,
          channelType: 'slack',
          status: 'failed',
          errorMessage: 'Webhook returned 500',
        },
      });
    });
  });

  describe('existsDelivery', () => {
    it('should return true when delivery exists', async () => {
      db.notificationDelivery.findFirst.mockResolvedValue(sentDelivery);

      const result = await existsDelivery(ALERT_ID, USER_ID, 'email');

      expect(result).toBe(true);
      expect(db.notificationDelivery.findFirst).toHaveBeenCalledWith({
        where: { alertId: ALERT_ID, userId: USER_ID, channelType: 'email', status: 'sent' },
      });
    });

    it('should return false when no delivery found', async () => {
      db.notificationDelivery.findFirst.mockResolvedValue(null);

      const result = await existsDelivery(ALERT_ID, USER_ID, 'slack');

      expect(result).toBe(false);
    });
  });

  describe('listDeliveries', () => {
    it('should list deliveries filtered by alertId', async () => {
      db.notificationDelivery.findMany.mockResolvedValue([sentDelivery, failedDelivery]);

      const result = await listDeliveries({ alertId: ALERT_ID });

      expect(result).toHaveLength(2);
      expect(db.notificationDelivery.findMany).toHaveBeenCalledWith({
        where: { alertId: ALERT_ID },
        orderBy: { deliveredAt: 'desc' },
      });
    });

    it('should list deliveries filtered by multiple criteria', async () => {
      db.notificationDelivery.findMany.mockResolvedValue([sentDelivery]);

      const result = await listDeliveries({
        userId: USER_ID,
        channelType: 'email',
        status: 'sent',
      });

      expect(result).toHaveLength(1);
      expect(db.notificationDelivery.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID, channelType: 'email', status: 'sent' },
        orderBy: { deliveredAt: 'desc' },
      });
    });

    it('should return empty array when no deliveries match', async () => {
      db.notificationDelivery.findMany.mockResolvedValue([]);

      const result = await listDeliveries({});

      expect(result).toEqual([]);
    });
  });
});
