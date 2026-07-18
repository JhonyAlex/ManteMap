import type { PrismaClient, Inspection } from '@mantemap/database';
import prisma from '@mantemap/database';

/**
 * Create a new inspection record.
 */
export async function createInspection(
  data: {
    itemId: string;
    userId: string;
    statusId?: string;
    notes?: string;
    photoPath?: string;
  },
  client: PrismaClient = prisma,
): Promise<Inspection> {
  return client.inspection.create({
    data: {
      itemId: data.itemId,
      userId: data.userId,
      statusId: data.statusId ?? null,
      notes: data.notes ?? null,
      photoPath: data.photoPath ?? null,
    },
  });
}

/**
 * List all inspections for an item, ordered by newest first.
 * Includes user name and email for display.
 */
export async function listByItem(
  itemId: string,
  client: PrismaClient = prisma,
): Promise<Inspection[]> {
  return client.inspection.findMany({
    where: { itemId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
    },
  });
}

/**
 * List all inspections by a user, ordered by newest first.
 * Includes item id, name, and slug for display.
 */
export async function listByUser(
  userId: string,
  client: PrismaClient = prisma,
): Promise<Inspection[]> {
  return client.inspection.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      item: { select: { id: true, name: true, slug: true } },
    },
  });
}
