import type { Prisma } from '@mantemap/database';
import prisma from '@mantemap/database';
import type { ItemType, PrismaClient } from '@mantemap/database';

export type ItemTypeData = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
};

export type ItemTypeUpdateData = Partial<ItemTypeData> & {
  status?: 'ACTIVE' | 'ARCHIVED';
};

export async function findItemTypesByProject(
  projectId: string,
  client: PrismaClient = prisma
): Promise<ItemType[]> {
  return client.itemType.findMany({
    where: { projectId },
    orderBy: { name: 'asc' },
  });
}

export async function findItemTypeById(
  projectId: string,
  itemTypeId: string,
  include?: Prisma.ItemTypeInclude,
  client: PrismaClient = prisma
): Promise<ItemType | null> {
  return client.itemType.findFirst({
    where: { id: itemTypeId, projectId },
    include: include ?? undefined,
  });
}

export async function findItemTypeBySlug(
  projectId: string,
  slug: string,
  client: PrismaClient = prisma
): Promise<ItemType | null> {
  return client.itemType.findUnique({
    where: { projectId_slug: { projectId, slug } },
  });
}

export async function createItemType(
  projectId: string,
  data: ItemTypeData,
  client: PrismaClient = prisma
): Promise<ItemType> {
  return client.itemType.create({
    data: {
      projectId,
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      icon: data.icon ?? null,
      color: data.color ?? null,
    },
  });
}

export async function updateItemType(
  projectId: string,
  itemTypeId: string,
  data: ItemTypeUpdateData,
  client: PrismaClient = prisma
): Promise<ItemType> {
  return client.itemType.updateMany({
    where: { id: itemTypeId, projectId },
    data,
  }).then(async (result) => {
    if (result.count === 0) {
      throw Object.assign(new Error('Item type not found'), { code: 'P2025' });
    }
    const itemType = await findItemTypeById(projectId, itemTypeId, undefined, client);
    if (!itemType) throw Object.assign(new Error('Item type not found'), { code: 'P2025' });
    return itemType;
  });
}

export async function archiveItemType(
  projectId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<ItemType> {
  return updateItemType(projectId, itemTypeId, { status: 'ARCHIVED' }, client);
}
