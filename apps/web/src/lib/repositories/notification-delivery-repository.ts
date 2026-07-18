import type { PrismaClient, NotificationDelivery } from '@mantemap/database';
import prisma from '@mantemap/database';

export type CreateDeliveryData = {
  alertId: string;
  userId: string;
  channelType: string;
  status: string;
  errorMessage?: string;
};

export type DeliveryFilters = {
  alertId?: string;
  userId?: string;
  channelType?: string;
  status?: string;
};

/**
 * Create a notification delivery log entry.
 */
export async function createDelivery(
  data: CreateDeliveryData,
  client: PrismaClient = prisma,
): Promise<NotificationDelivery> {
  return client.notificationDelivery.create({
    data: {
      alertId: data.alertId,
      userId: data.userId,
      channelType: data.channelType,
      status: data.status,
      ...(data.errorMessage ? { errorMessage: data.errorMessage } : {}),
    },
  });
}

/**
 * Check if a delivery already exists for the given alert + user + channel
 * (successfully sent — dedup check).
 */
export async function existsDelivery(
  alertId: string,
  userId: string,
  channelType: string,
  client: PrismaClient = prisma,
): Promise<boolean> {
  const existing = await client.notificationDelivery.findFirst({
    where: { alertId, userId, channelType, status: 'sent' },
  });
  return existing !== null;
}

/**
 * List deliveries with optional filters.
 */
export async function listDeliveries(
  filters: DeliveryFilters = {},
  client: PrismaClient = prisma,
): Promise<NotificationDelivery[]> {
  const where: Record<string, string> = {};
  if (filters.alertId) where.alertId = filters.alertId;
  if (filters.userId) where.userId = filters.userId;
  if (filters.channelType) where.channelType = filters.channelType;
  if (filters.status) where.status = filters.status;

  return client.notificationDelivery.findMany({
    where,
    orderBy: { deliveredAt: 'desc' },
  });
}
