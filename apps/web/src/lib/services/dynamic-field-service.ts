import {
  createDynamicFieldSchema,
  updateDynamicFieldSchema,
  reorderFieldsSchema,
  type CreateDynamicFieldInput,
  type UpdateDynamicFieldInput,
  type ReorderFieldsInput,
} from '@mantemap/validation';
import { ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';
import { ZodError } from 'zod';
import type { Prisma } from '@mantemap/database';
import {
  createField as createFieldRepo,
  deactivateField as deactivateFieldRepo,
  getFieldById,
  listFieldsByItemType,
  reorderFields as reorderFieldsRepo,
  updateField as updateFieldRepo,
} from '@/lib/repositories/dynamic-field-repository';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';

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

export async function listFields(projectId: string, itemTypeId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  return listFieldsByItemType(projectId, itemTypeId);
}

export async function getField(
  projectId: string,
  fieldId: string,
  itemTypeId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const field = await getFieldById(projectId, fieldId, itemTypeId);
  if (!field) {
    throw new NotFoundError('Dynamic field', fieldId);
  }
  return field;
}

export async function createField(
  projectId: string,
  input: CreateDynamicFieldInput,
  itemTypeId: string,
  userId: string
) {
  let parsed: CreateDynamicFieldInput;
  try {
    parsed = createDynamicFieldSchema.parse(input);
  } catch (error) {
    return handleZodError(error);
  }

  await requireProjectOwner(projectId, userId);

  try {
    const result = await createFieldRepo(projectId, itemTypeId, {
      name: parsed.name,
      key: parsed.key,
      type: parsed.type,
      description: parsed.description ?? null,
      required: parsed.required,
      defaultValue: (parsed.defaultValue as Prisma.InputJsonValue) ?? null,
      order: parsed.order,
      visible: parsed.visible,
      options: (parsed.options as Prisma.InputJsonValue) ?? null,
      unit: parsed.unit ?? null,
      validation: (parsed.validation as Prisma.InputJsonValue) ?? null,
      showInList: parsed.showInList,
      showInSearch: parsed.showInSearch,
      helpText: parsed.helpText ?? null,
    });
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A field with this key already exists in this item type');
    }
    throw error;
  }
}

export async function updateField(
  projectId: string,
  fieldId: string,
  input: UpdateDynamicFieldInput,
  itemTypeId: string,
  userId: string
) {
  let parsed: UpdateDynamicFieldInput;
  try {
    parsed = updateDynamicFieldSchema.parse(input);
  } catch (error) {
    return handleZodError(error);
  }

  await requireProjectOwner(projectId, userId);

  try {
    const result = await updateFieldRepo(projectId, fieldId, itemTypeId, {
      ...(parsed.name !== undefined && { name: parsed.name }),
      ...(parsed.key !== undefined && { key: parsed.key }),
      ...(parsed.type !== undefined && { type: parsed.type }),
      ...(parsed.description !== undefined && { description: parsed.description }),
      ...(parsed.required !== undefined && { required: parsed.required }),
      ...(parsed.defaultValue !== undefined && { defaultValue: parsed.defaultValue as Prisma.InputJsonValue }),
      ...(parsed.order !== undefined && { order: parsed.order }),
      ...(parsed.visible !== undefined && { visible: parsed.visible }),
      ...(parsed.options !== undefined && { options: parsed.options as Prisma.InputJsonValue }),
      ...(parsed.unit !== undefined && { unit: parsed.unit }),
      ...(parsed.validation !== undefined && { validation: parsed.validation as Prisma.InputJsonValue }),
      ...(parsed.showInList !== undefined && { showInList: parsed.showInList }),
      ...(parsed.showInSearch !== undefined && { showInSearch: parsed.showInSearch }),
      ...(parsed.helpText !== undefined && { helpText: parsed.helpText }),
    });
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A field with this key already exists in this item type');
    }
    throw error;
  }
}

export async function deactivateField(
  projectId: string,
  fieldId: string,
  itemTypeId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);
  try {
    const result = await deactivateFieldRepo(projectId, fieldId, itemTypeId);
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A field with this key already exists in this item type');
    }
    throw error;
  }
}

export async function reorderFields(
  projectId: string,
  fieldIds: ReorderFieldsInput['fieldIds'],
  itemTypeId: string,
  userId: string
) {
  let parsed: ReorderFieldsInput;
  try {
    parsed = reorderFieldsSchema.parse({ fieldIds });
  } catch (error) {
    return handleZodError(error);
  }

  await requireProjectOwner(projectId, userId);

  try {
    const result = await reorderFieldsRepo(projectId, itemTypeId, parsed.fieldIds);
    return result;
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      throw new ConflictError('A field with this key already exists in this item type');
    }
    throw error;
  }
}
