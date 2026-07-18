import {
  createItemTypeSchema,
  updateItemTypeSchema,
  type CreateItemTypeInput,
  type UpdateItemTypeInput,
} from '@mantemap/validation';
import { ConflictError, NotFoundError } from '@mantemap/shared';
import {
  archiveItemType as archiveItemTypeRepo,
  createItemType as createItemTypeRepo,
  findItemTypeById,
  findItemTypeBySlug,
  findItemTypesByProject,
  updateItemType as updateItemTypeRepo,
} from '@/lib/repositories/item-type-repository';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';

export async function listItemTypes(projectId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  return { itemTypes: await findItemTypesByProject(projectId) };
}

export async function getItemType(projectId: string, itemTypeId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  const itemType = await findItemTypeById(projectId, itemTypeId, {
    dynamicFields: { where: { active: true }, orderBy: { order: 'asc' } },
    statuses: { where: { active: true }, orderBy: { order: 'asc' } },
  });
  if (!itemType) throw new NotFoundError('Item type', itemTypeId);
  return { itemType };
}

export async function createItemType(
  projectId: string,
  input: CreateItemTypeInput,
  userId: string
) {
  const parsed = createItemTypeSchema.parse(input);
  await requireProjectOwner(projectId, userId);
  if (await findItemTypeBySlug(projectId, parsed.slug)) {
    throw new ConflictError('An item type with this slug already exists in the project');
  }
  try {
    return { itemType: await createItemTypeRepo(projectId, parsed) };
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('An item type with this slug already exists in the project');
    }
    throw error;
  }
}

export async function updateItemType(
  projectId: string,
  itemTypeId: string,
  input: UpdateItemTypeInput,
  userId: string
) {
  const parsed = updateItemTypeSchema.parse(input);
  await requireProjectOwner(projectId, userId);
  const current = await findItemTypeById(projectId, itemTypeId);
  if (!current || current.status === 'ARCHIVED') {
    throw new NotFoundError('Item type', itemTypeId);
  }
  if (parsed.slug && parsed.slug !== current.slug && await findItemTypeBySlug(projectId, parsed.slug)) {
    throw new ConflictError('An item type with this slug already exists in the project');
  }
  try {
    return { itemType: await updateItemTypeRepo(projectId, itemTypeId, parsed) };
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('An item type with this slug already exists in the project');
    }
    throw error;
  }
}

export async function archiveItemType(projectId: string, itemTypeId: string, userId: string) {
  await requireProjectOwner(projectId, userId);
  const current = await findItemTypeById(projectId, itemTypeId);
  if (!current || current.status === 'ARCHIVED') {
    throw new NotFoundError('Item type', itemTypeId);
  }
  return { itemType: await archiveItemTypeRepo(projectId, itemTypeId) };
}
