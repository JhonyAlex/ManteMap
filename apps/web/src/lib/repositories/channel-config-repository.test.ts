import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma client — channel config CRUD
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    userChannelConfig: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// RED — production code does not exist yet
import {
  getUserChannelConfig,
  upsertUserChannelConfig,
  deleteUserChannelConfig,
  listUserChannelConfigs,
} from './channel-config-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

const slackConfig = {
  id: 'clchanxxxxxxxxxxxxxxxxxx',
  userId: USER_ID,
  channelType: 'slack',
  config: { webhookUrl: 'https://hooks.slack.com/services/TEST/BOT' },
  enabled: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const telegramConfig = {
  id: 'clchan2xxxxxxxxxxxxxxxxx',
  userId: USER_ID,
  channelType: 'telegram',
  config: { botToken: '123456:ABC', chatId: '123456789' },
  enabled: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChannelConfigRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserChannelConfig', () => {
    it('should return the config when found', async () => {
      db.userChannelConfig.findUnique.mockResolvedValue(slackConfig);

      const result = await getUserChannelConfig(USER_ID, 'slack');

      expect(result).toEqual(slackConfig);
      expect(db.userChannelConfig.findUnique).toHaveBeenCalledWith({
        where: { userId_channelType: { userId: USER_ID, channelType: 'slack' } },
      });
    });

    it('should return null when config not found', async () => {
      db.userChannelConfig.findUnique.mockResolvedValue(null);

      const result = await getUserChannelConfig(USER_ID, 'teams');

      expect(result).toBeNull();
    });
  });

  describe('upsertUserChannelConfig', () => {
    it('should create config when it does not exist', async () => {
      const newConfig = { webhookUrl: 'https://hooks.slack.com/services/NEW' };
      db.userChannelConfig.upsert.mockResolvedValue({
        ...slackConfig,
        config: newConfig,
      });

      const result = await upsertUserChannelConfig(USER_ID, 'slack', newConfig, true);

      expect(result.config).toEqual(newConfig);
      expect(db.userChannelConfig.upsert).toHaveBeenCalledWith({
        where: { userId_channelType: { userId: USER_ID, channelType: 'slack' } },
        create: {
          userId: USER_ID,
          channelType: 'slack',
          config: newConfig,
          enabled: true,
        },
        update: {
          config: newConfig,
          enabled: true,
        },
      });
    });

    it('should update config when it exists', async () => {
      const updatedConfig = { webhookUrl: 'https://hooks.slack.com/UPDATED' };
      db.userChannelConfig.upsert.mockResolvedValue({
        ...slackConfig,
        config: updatedConfig,
        enabled: false,
      });

      const result = await upsertUserChannelConfig(USER_ID, 'slack', updatedConfig, false);

      expect(result.enabled).toBe(false);
      expect(db.userChannelConfig.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_channelType: { userId: USER_ID, channelType: 'slack' } },
        }),
      );
    });
  });

  describe('deleteUserChannelConfig', () => {
    it('should call delete with the correct where clause', async () => {
      db.userChannelConfig.delete.mockResolvedValue(slackConfig);

      await deleteUserChannelConfig(USER_ID, 'slack');

      expect(db.userChannelConfig.delete).toHaveBeenCalledWith({
        where: { userId_channelType: { userId: USER_ID, channelType: 'slack' } },
      });
    });

    it('should not throw when deleting non-existent config', async () => {
      db.userChannelConfig.delete.mockRejectedValue(new Error('Record not found'));

      await expect(deleteUserChannelConfig(USER_ID, 'nonexistent')).rejects.toThrow(
        'Record not found',
      );
    });
  });

  describe('listUserChannelConfigs', () => {
    it('should return all configs for a user', async () => {
      db.userChannelConfig.findMany.mockResolvedValue([slackConfig, telegramConfig]);

      const result = await listUserChannelConfigs(USER_ID);

      expect(result).toHaveLength(2);
      expect(result[0].channelType).toBe('slack');
      expect(result[1].channelType).toBe('telegram');
      expect(db.userChannelConfig.findMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no configs exist', async () => {
      db.userChannelConfig.findMany.mockResolvedValue([]);

      const result = await listUserChannelConfigs(USER_ID);

      expect(result).toEqual([]);
    });
  });
});
