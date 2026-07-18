import type { PrismaClient, UserChannelConfig } from '@mantemap/database';
import prisma from '@mantemap/database';

/**
 * Get a single user channel config by userId and channelType.
 */
export async function getUserChannelConfig(
  userId: string,
  channelType: string,
  client: PrismaClient = prisma,
): Promise<UserChannelConfig | null> {
  return client.userChannelConfig.findUnique({
    where: { userId_channelType: { userId, channelType } },
  });
}

/**
 * Upsert a user channel config. Creates if not exists, updates if exists.
 */
export async function upsertUserChannelConfig(
  userId: string,
  channelType: string,
  config: object,
  enabled: boolean,
  client: PrismaClient = prisma,
): Promise<UserChannelConfig> {
  return client.userChannelConfig.upsert({
    where: { userId_channelType: { userId, channelType } },
    create: {
      userId,
      channelType,
      config,
      enabled,
    },
    update: {
      config,
      enabled,
    },
  });
}

/**
 * Delete a user channel config.
 */
export async function deleteUserChannelConfig(
  userId: string,
  channelType: string,
  client: PrismaClient = prisma,
): Promise<void> {
  await client.userChannelConfig.delete({
    where: { userId_channelType: { userId, channelType } },
  });
}

/**
 * List all channel configs for a user.
 */
export async function listUserChannelConfigs(
  userId: string,
  client: PrismaClient = prisma,
): Promise<UserChannelConfig[]> {
  return client.userChannelConfig.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}
