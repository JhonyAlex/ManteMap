import type { Prisma } from '@mantemap/database';
import prisma from '@mantemap/database';
import type { Item, ItemFieldValue, PrismaClient } from '@mantemap/database';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Internal helper — verify parent ItemType belongs to project
// ---------------------------------------------------------------------------
async function verifyItemTypeInProject(
  projectId: string,
  itemTypeId: string,
  client: PrismaClient
): Promise<void> {
  const itemType = await client.itemType.findUnique({
    where: { id: itemTypeId, projectId },
    select: { id: true },
  });
  if (!itemType) {
    throw new NotFoundError('Item type', itemTypeId);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateItemData = {
  name: string;
  slug: string;
  itemTypeId: string;
  statusId?: string | null;
};

export type UpdateItemData = {
  name?: string;
  statusId?: string | null;
};

export type ListItemsFilters = {
  itemTypeId: string;
  statusId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function createItem(
  projectId: string,
  data: CreateItemData,
  client: PrismaClient = prisma
): Promise<Item> {
  await verifyItemTypeInProject(projectId, data.itemTypeId, client);
  return client.item.create({
    data: {
      name: data.name,
      slug: data.slug,
      itemTypeId: data.itemTypeId,
      statusId: data.statusId ?? null,
    },
  });
}

export async function findItemById(
  projectId: string,
  itemId: string,
  itemTypeId: string,
  include?: Prisma.ItemInclude,
  client: PrismaClient = prisma
): Promise<(Item & { fieldValues?: ItemFieldValue[]; status?: unknown; itemType?: unknown }) | null> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return client.item.findFirst({
    where: { id: itemId, itemTypeId },
    include: include ?? undefined,
  });
}

export async function findItemsByProject(
  projectId: string,
  filters: ListItemsFilters,
  client: PrismaClient = prisma
): Promise<Item[]> {
  await verifyItemTypeInProject(projectId, filters.itemTypeId, client);

  const where: Prisma.ItemWhereInput = {
    itemTypeId: filters.itemTypeId,
  };

  if (filters.statusId) {
    where.statusId = filters.statusId;
  }

  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  return client.item.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: undefined,
  });
}

export async function updateItem(
  projectId: string,
  itemId: string,
  itemTypeId: string,
  data: UpdateItemData,
  client: PrismaClient = prisma
): Promise<Item> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);

  // Verify item exists and belongs to this item type
  const existing = await client.item.findFirst({
    where: { id: itemId, itemTypeId },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError('Item', itemId);
  }

  return client.item.update({
    where: { id: itemId, itemTypeId },
    data,
  });
}

export async function deleteItem(
  projectId: string,
  itemId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<void> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);

  // Verify item exists and belongs to this item type
  const existing = await client.item.findFirst({
    where: { id: itemId, itemTypeId },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError('Item', itemId);
  }

  await client.item.delete({
    where: { id: itemId, itemTypeId },
  });
}

// ---------------------------------------------------------------------------
// Field value operations
// ---------------------------------------------------------------------------

export async function createItemFieldValues(
  itemId: string,
  values: Array<{ dynamicFieldId: string; value: unknown }>,
  client: PrismaClient = prisma
): Promise<{ count: number }> {
  if (values.length === 0) {
    return { count: 0 };
  }

  return client.itemFieldValue.createMany({
    data: values.map((v) => ({
      itemId,
      dynamicFieldId: v.dynamicFieldId,
      value: v.value as Prisma.InputJsonValue,
    })),
  });
}

export async function deleteItemFieldValues(
  itemId: string,
  client: PrismaClient = prisma
): Promise<{ count: number }> {
  return client.itemFieldValue.deleteMany({
    where: { itemId },
  });
}

export async function findFieldValuesByItemId(
  itemId: string,
  include?: Prisma.ItemFieldValueInclude,
  client: PrismaClient = prisma
): Promise<ItemFieldValue[]> {
  return client.itemFieldValue.findMany({
    where: { itemId },
    include: include ?? undefined,
  });
}

/**
 * Find an item by projectId + itemId (no itemTypeId required).
 * Verifies the item's ItemType belongs to the project.
 */
export async function findItemByProjectAndId(
  projectId: string,
  itemId: string,
  include?: Prisma.ItemInclude,
  client: PrismaClient = prisma
): Promise<(Item & { fieldValues?: ItemFieldValue[]; status?: unknown; itemType?: unknown }) | null> {
  return client.item.findFirst({
    where: {
      id: itemId,
      itemType: { projectId },
    },
    include: include ?? undefined,
  });
}
