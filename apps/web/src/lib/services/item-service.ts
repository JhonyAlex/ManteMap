import {
  createItemSchema,
  updateItemSchema,
  type CreateItemInput,
  type UpdateItemInput,
} from '@mantemap/validation';
import { ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';
import {
  createItem as createItemRepo,
  findItemByProjectAndId,
  findItemsByProject,
  updateItem as updateItemRepo,
  deleteItem as deleteItemRepo,
  createItemFieldValues,
  deleteItemFieldValues,
  type ListItemsFilters,
} from '@/lib/repositories/item-repository';
import { listFieldsByItemType } from '@/lib/repositories/dynamic-field-repository';
import { getDefaultStatus, getStatusById } from '@/lib/repositories/status-repository';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';
import { generateAlert } from '@/lib/services/alert-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a URL-safe slug from a display name.
 */
export function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolve slug conflicts by appending -2, -3, etc.
 * existingSlugs is a Set of slugs already used in the ItemType.
 */
export function resolveSlugConflict(baseSlug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }
  let counter = 2;
  while (existingSlugs.has(`${baseSlug}-${counter}`)) {
    counter++;
  }
  return `${baseSlug}-${counter}`;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createItem(
  projectId: string,
  input: CreateItemInput,
  userId: string
) {
  const parsed = createItemSchema.parse(input);
  await requireProjectOwner(projectId, userId);

  // Generate slug if not provided
  let slug = parsed.slug ?? generateSlug(parsed.name);

  // Resolve slug conflicts
  const existingItems = await findItemsByProject(projectId, {
    itemTypeId: parsed.itemTypeId,
    pageSize: 1000,
  });
  const existingSlugs = new Set(existingItems.map((i) => i.slug));
  slug = resolveSlugConflict(slug, existingSlugs);

  // Determine statusId
  let statusId = parsed.statusId ?? null;
  if (!parsed.statusId) {
    const defaultStatus = await getDefaultStatus(projectId, parsed.itemTypeId);
    statusId = defaultStatus?.id ?? null;
  }

  // Validate field values BEFORE creating the item
  if (parsed.fieldValues && parsed.fieldValues.length > 0) {
    const validFields = await listFieldsByItemType(projectId, parsed.itemTypeId);
    const validFieldIds = new Set(validFields.map((f) => f.id));

    const fabricatedIds = parsed.fieldValues
      .map((fv) => fv.dynamicFieldId)
      .filter((id) => !validFieldIds.has(id));

    if (fabricatedIds.length > 0) {
      throw new ValidationError(
        `Field IDs do not belong to the item type: ${fabricatedIds.join(', ')}`
      );
    }
  }

  // Create the item
  const created = await createItemRepo(projectId, {
    name: parsed.name,
    slug,
    itemTypeId: parsed.itemTypeId,
    statusId,
    locationId: parsed.locationId,
  });

  // Create field values if provided
  if (parsed.fieldValues && parsed.fieldValues.length > 0) {
    const values = parsed.fieldValues.map((fv) => ({
      dynamicFieldId: fv.dynamicFieldId,
      value: fv.value as unknown,
    }));
    await createItemFieldValues(created.id, values);
  }

  return { item: created };
}

export async function getItem(
  projectId: string,
  itemId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  const item = await findItemByProjectAndId(projectId, itemId, {
    fieldValues: { include: { dynamicField: true } },
    status: true,
    itemType: true,
  });
  if (!item) throw new NotFoundError('Item', itemId);
  return { item };
}

export async function listItems(
  projectId: string,
  filters: Omit<ListItemsFilters, 'itemTypeId'> & { itemTypeId: string },
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const items = await findItemsByProject(projectId, filters);
  return { items };
}

export async function updateItem(
  projectId: string,
  itemId: string,
  input: UpdateItemInput,
  userId: string
) {
  const parsed = updateItemSchema.parse(input);
  await requireProjectOwner(projectId, userId);

  // Find item in project to get itemTypeId
  const existing = await findItemByProjectAndId(projectId, itemId);
  if (!existing) throw new NotFoundError('Item', itemId);

  const updated = await updateItemRepo(projectId, itemId, existing.itemTypeId as string, {
    name: parsed.name,
    statusId: parsed.statusId,
    locationId: parsed.locationId,
  });

  // Update field values if provided
  if (parsed.fieldValues && parsed.fieldValues.length > 0) {
    // Validate that all field IDs belong to the ItemType
    const validFields = await listFieldsByItemType(projectId, existing.itemTypeId as string);
    const validFieldIds = new Set(validFields.map((f) => f.id));

    const fabricatedIds = parsed.fieldValues
      .map((fv) => fv.dynamicFieldId)
      .filter((id) => !validFieldIds.has(id));

    if (fabricatedIds.length > 0) {
      throw new ValidationError(
        `Field IDs do not belong to the item type: ${fabricatedIds.join(', ')}`
      );
    }

    // Delete existing field values and recreate (simple approach)
    await deleteItemFieldValues(itemId);
    const values = parsed.fieldValues.map((fv) => ({
      dynamicFieldId: fv.dynamicFieldId,
      value: fv.value as unknown,
    }));
    await createItemFieldValues(itemId, values);
  }

  return { item: updated };
}

export async function deleteItem(
  projectId: string,
  itemId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  // Find item in project to get itemTypeId
  const existing = await findItemByProjectAndId(projectId, itemId);
  if (!existing) throw new NotFoundError('Item', itemId);

  // Delete field values first (cascade in Prisma handles this, but be explicit)
  await deleteItemFieldValues(itemId);
  await deleteItemRepo(projectId, itemId, existing.itemTypeId as string);
}

export async function transitionStatus(
  projectId: string,
  itemId: string,
  statusId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  // Find item in project to get itemTypeId
  const existingItem = await findItemByProjectAndId(projectId, itemId);
  if (!existingItem) throw new NotFoundError('Item', itemId);

  const itemTypeId = existingItem.itemTypeId as string;

  // Verify target status exists and is active
  const targetStatus = await getStatusById(projectId, statusId, itemTypeId);
  if (!targetStatus) {
    throw new NotFoundError('Status', statusId);
  }

  // Check if current status is final (blocks further transitions)
  if (existingItem.statusId) {
    const currentStatus = await getStatusById(projectId, existingItem.statusId as string, itemTypeId);
    if (currentStatus?.isFinal) {
      throw new ConflictError(
        `Item is in a final status "${currentStatus.name}" and cannot be transitioned`
      );
    }
  }

  const updated = await updateItemRepo(projectId, itemId, itemTypeId, { statusId });

  // Fire-and-forget: generate alert for incident/blocking/final status transitions
  if (targetStatus.isIncident) {
    void generateAlert(projectId, {
      alertType: 'STATUS_INCIDENT',
      severity: 'CRITICAL',
      sourceType: 'item',
      sourceId: itemId,
      title: `Item "${existingItem.name}" moved to incident status "${targetStatus.name}"`,
      message: `Status transitioned to incident. Immediate attention required.`,
      metadata: { statusName: targetStatus.name, statusId: targetStatus.id },
    });
  } else if (targetStatus.isBlocking) {
    void generateAlert(projectId, {
      alertType: 'STATUS_BLOCKING',
      severity: 'WARNING',
      sourceType: 'item',
      sourceId: itemId,
      title: `Item "${existingItem.name}" moved to blocking status "${targetStatus.name}"`,
      message: `Status transitioned to blocking. Workflow may be impacted.`,
      metadata: { statusName: targetStatus.name, statusId: targetStatus.id },
    });
  } else if (targetStatus.isFinal) {
    void generateAlert(projectId, {
      alertType: 'STATUS_FINAL',
      severity: 'INFO',
      sourceType: 'item',
      sourceId: itemId,
      title: `Item "${existingItem.name}" reached final status "${targetStatus.name}"`,
      message: `Item has reached a terminal status.`,
      metadata: { statusName: targetStatus.name, statusId: targetStatus.id },
    });
  }

  return { item: updated };
}
