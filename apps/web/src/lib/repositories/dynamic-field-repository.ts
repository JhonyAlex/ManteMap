import prisma from '@mantemap/database';
import type { DynamicField, PrismaClient } from '@mantemap/database';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Internal helper — verify parent ItemType belongs to project
// ---------------------------------------------------------------------------
async function verifyItemTypeInProject(
  projectId: string,
  itemTypeId: string,
  client: PrismaClient
): Promise<void> {
  const itemType = await (client as PrismaClient).itemType.findUnique({
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

export async function listFieldsByItemType(
  projectId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<DynamicField[]> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return (client as PrismaClient).dynamicField.findMany({
    where: { itemTypeId, active: true },
    orderBy: { order: 'asc' },
  });
}

export async function getFieldById(
  projectId: string,
  fieldId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<DynamicField | null> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return (client as PrismaClient).dynamicField.findFirst({
    where: { id: fieldId, itemTypeId, active: true },
  });
}

export async function createField(
  projectId: string,
  itemTypeId: string,
  data: Omit<Parameters<PrismaClient['dynamicField']['create']>[0]['data'], 'itemTypeId'>,
  client: PrismaClient = prisma
): Promise<DynamicField> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  return (client as PrismaClient).dynamicField.create({
    data: { ...data, itemTypeId } as Parameters<PrismaClient['dynamicField']['create']>[0]['data'],
  });
}

export async function updateField(
  projectId: string,
  fieldId: string,
  itemTypeId: string,
  data: Parameters<PrismaClient['dynamicField']['update']>[0]['data'],
  client: PrismaClient = prisma
): Promise<DynamicField> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);

  // Block mutations on deactivated fields
  const field = await (client as PrismaClient).dynamicField.findFirst({
    where: { id: fieldId, itemTypeId, active: true },
    select: { id: true },
  });
  if (!field) {
    throw new NotFoundError('Dynamic field', fieldId);
  }

  return (client as PrismaClient).dynamicField.update({
    where: { id: fieldId, itemTypeId },
    data,
  });
}

export async function deactivateField(
  projectId: string,
  fieldId: string,
  itemTypeId: string,
  client: PrismaClient = prisma
): Promise<DynamicField> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);
  const field = await (client as PrismaClient).dynamicField.findFirst({
    where: { id: fieldId, itemTypeId, active: true },
  });
  if (!field) {
    throw new NotFoundError('Dynamic field', fieldId);
  }
  return (client as PrismaClient).dynamicField.update({
    where: { id: fieldId, itemTypeId },
    data: { active: false },
  });
}

export async function reorderFields(
  projectId: string,
  itemTypeId: string,
  fieldIds: string[],
  client: PrismaClient = prisma
): Promise<void> {
  await verifyItemTypeInProject(projectId, itemTypeId, client);

  // Verify all field IDs belong to this item type AND are active
  const existing = await (client as PrismaClient).dynamicField.findMany({
    where: { id: { in: fieldIds }, itemTypeId, active: true },
    select: { id: true },
  });
  if (existing.length !== fieldIds.length) {
    throw new NotFoundError('One or more fields');
  }

  // Atomic batch update — all or nothing
  await prisma.$transaction(
    fieldIds.map((id, index) =>
      (client as PrismaClient).dynamicField.update({
        where: { id, itemTypeId },
        data: { order: index },
      })
    )
  );
}
