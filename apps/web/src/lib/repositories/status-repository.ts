import prisma from '@mantemap/database';
import type { PrismaClient, Status } from '@mantemap/database';
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
// Repository functions
// ---------------------------------------------------------------------------

export async function listStatusesByItemType(
  projectId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<Status[]> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return client.status.findMany({
    where: { itemTypeId, active: true },
    orderBy: { order: 'asc' },
  });
}

export async function getStatusById(
  projectId: string,
  statusId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<Status | null> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return client.status.findFirst({
    where: { id: statusId, itemTypeId, active: true },
  });
}

export async function createStatus(
  projectId: string,
  itemTypeId: string,
  data: Omit<Parameters<PrismaClient['status']['create']>[0]['data'], 'itemTypeId'>,
  client: PrismaClient = prisma
): Promise<Status> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return client.status.create({
    data: { ...data, itemTypeId } as Parameters<PrismaClient['status']['create']>[0]['data'],
  });
}

export async function updateStatus(
  projectId: string,
  statusId: string,
  itemTypeId: string,
  data: Parameters<PrismaClient['status']['update']>[0]['data'],
  client: PrismaClient = prisma
): Promise<Status> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);

  // Block mutations on deactivated statuses
  const status = await client.status.findFirst({
    where: { id: statusId, itemTypeId, active: true },
    select: { id: true },
  });
  if (!status) {
    throw new NotFoundError('Status', statusId);
  }

  return client.status.update({
    where: { id: statusId, itemTypeId },
    data,
  });
}

export async function deactivateStatus(
  projectId: string,
  statusId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<Status> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  const status = await client.status.findFirst({
    where: { id: statusId, itemTypeId, active: true },
  });
  if (!status) {
    throw new NotFoundError('Status', statusId);
  }
  return client.status.update({
    where: { id: statusId, itemTypeId },
    data: { active: false },
  });
}

export async function reorderStatuses(
  projectId: string,
  itemTypeId: string,
  statusIds: string[],
  client: PrismaClient = prisma
): Promise<void> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);

  // Verify all status IDs belong to this item type AND are active
  const existing = await client.status.findMany({
    where: { id: { in: statusIds }, itemTypeId, active: true },
    select: { id: true },
  });
  if (existing.length !== statusIds.length) {
    throw new NotFoundError('One or more statuses');
  }

  // Atomic batch update — all or nothing
  await prisma.$transaction(
    statusIds.map((id, index) =>
      client.status.update({
        where: { id, itemTypeId },
        data: { order: index },
      })
    )
  );
}

export async function getDefaultStatus(
  projectId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<Status | null> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return client.status.findFirst({
    where: { itemTypeId, isDefault: true, active: true },
  });
}

export async function setDefaultStatus(
  projectId: string,
  statusId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<Status> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);

  // Ensure the status exists and is active
  const status = await client.status.findFirst({
    where: { id: statusId, itemTypeId, active: true },
    select: { id: true },
  });
  if (!status) {
    throw new NotFoundError('Status', statusId);
  }

  // Atomic: unset previous defaults + set this one as default
  const [, statusResult] = await prisma.$transaction([
    client.status.updateMany({
      where: { itemTypeId, isDefault: true, active: true, id: { not: statusId } },
      data: { isDefault: false },
    }),
    client.status.update({
      where: { id: statusId, itemTypeId },
      data: { isDefault: true },
    }),
  ]);

  return statusResult;
}
