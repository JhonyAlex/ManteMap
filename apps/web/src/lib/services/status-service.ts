import {
  createStatusSchema,
  updateStatusSchema,
  reorderStatusesSchema,
  type CreateStatusInput,
  type UpdateStatusInput,
  type ReorderStatusesInput,
} from '@mantemap/validation';
import { ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';
import { ZodError } from 'zod';
import {
  createStatus as createStatusRepo,
  deactivateStatus as deactivateStatusRepo,
  getStatusById,
  listStatusesByItemType,
  reorderStatuses as reorderStatusesRepo,
  setDefaultStatus as setDefaultStatusRepo,
  updateStatus as updateStatusRepo,
} from '@/lib/repositories/status-repository';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';
import prisma from '@mantemap/database';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function handleZodError(error: unknown): never {
  if (error instanceof ZodError) {
    const first = error.errors[0];
    throw new ValidationError(first?.message ?? 'Validation failed', error.errors);
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listStatuses(projectId: string, itemTypeId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  return listStatusesByItemType(projectId, itemTypeId);
}

export async function getStatus(
  projectId: string,
  statusId: string,
  itemTypeId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const status = await getStatusById(projectId, statusId, itemTypeId);
  if (!status) {
    throw new NotFoundError('Status', statusId);
  }
  return status;
}

export async function createStatus(
  projectId: string,
  input: CreateStatusInput,
  itemTypeId: string,
  userId: string
) {
  let parsed: CreateStatusInput;
  try {
    parsed = createStatusSchema.parse(input);
  } catch (error) {
    return handleZodError(error);
  }

  await requireProjectOwner(projectId, userId);

  // Build Prisma data from parsed input
  const data = {
    name: parsed.name,
    key: parsed.key,
    color: parsed.color,
    icon: parsed.icon ?? null,
    description: parsed.description ?? null,
    order: parsed.order,
    isDefault: parsed.isDefault,
    isFinal: false,
    isBlocking: false,
    isIncident: false,
  };

  try {
    // If isDefault, wrap in transaction to unset previous default first
    if (parsed.isDefault) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (prisma as any).$transaction(async (tx: any) => {
        // Unset any existing default
        await tx.status.updateMany({
          where: { itemTypeId, isDefault: true, active: true },
          data: { isDefault: false },
        });
        // Create the new default status
        return createStatusRepo(projectId, itemTypeId, data as Parameters<typeof createStatusRepo>[2], tx);
      });
      return result;
    }

    const result = await createStatusRepo(projectId, itemTypeId, data as Parameters<typeof createStatusRepo>[2]);
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A status with this key already exists in this item type');
    }
    throw error;
  }
}

export async function updateStatus(
  projectId: string,
  statusId: string,
  input: UpdateStatusInput,
  itemTypeId: string,
  userId: string
) {
  let parsed: UpdateStatusInput;
  try {
    parsed = updateStatusSchema.parse(input);
  } catch (error) {
    return handleZodError(error);
  }

  await requireProjectOwner(projectId, userId);

  // Build update data — only include provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.key !== undefined) data.key = parsed.key;
  if (parsed.color !== undefined) data.color = parsed.color;
  if (parsed.icon !== undefined) data.icon = parsed.icon;
  if (parsed.description !== undefined) data.description = parsed.description;
  if (parsed.order !== undefined) data.order = parsed.order;
  if (parsed.isDefault !== undefined) data.isDefault = parsed.isDefault;

  try {
    // If setting isDefault to true, wrap in transaction to unset previous default
    if (parsed.isDefault === true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (prisma as any).$transaction(async (tx: any) => {
        // Unset any existing default
        await tx.status.updateMany({
          where: { itemTypeId, isDefault: true, active: true, id: { not: statusId } },
          data: { isDefault: false },
        });
        // Update the status
        return updateStatusRepo(projectId, statusId, itemTypeId, data, tx);
      });
      return result;
    }

    const result = await updateStatusRepo(projectId, statusId, itemTypeId, data);
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A status with this key already exists in this item type');
    }
    throw error;
  }
}

export async function deactivateStatus(
  projectId: string,
  statusId: string,
  itemTypeId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);
  try {
    const result = await deactivateStatusRepo(projectId, statusId, itemTypeId);
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A status with this key already exists in this item type');
    }
    throw error;
  }
}

export async function reorderStatuses(
  projectId: string,
  statusIds: ReorderStatusesInput['statusIds'],
  itemTypeId: string,
  userId: string
) {
  let parsed: ReorderStatusesInput;
  try {
    parsed = reorderStatusesSchema.parse({ statusIds });
  } catch (error) {
    return handleZodError(error);
  }

  await requireProjectOwner(projectId, userId);

  try {
    const result = await reorderStatusesRepo(projectId, itemTypeId, parsed.statusIds);
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A status with this key already exists in this item type');
    }
    throw error;
  }
}

export async function setDefaultStatus(
  projectId: string,
  statusId: string,
  itemTypeId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);
  return setDefaultStatusRepo(projectId, statusId, itemTypeId);
}
