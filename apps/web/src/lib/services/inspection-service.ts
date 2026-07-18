import { createInspection, listByItem, listByUser } from '@/lib/repositories/inspection-repository';
import { requireProjectMember } from '@/lib/services/project-access-service';

/**
 * Log a new inspection for an item.
 * Requires project membership.
 */
export async function logInspection(
  projectId: string,
  data: {
    itemId: string;
    userId: string;
    statusId?: string;
    notes?: string;
    photoPath?: string;
  },
) {
  await requireProjectMember(projectId, data.userId);

  const inspection = await createInspection({
    itemId: data.itemId,
    userId: data.userId,
    statusId: data.statusId,
    notes: data.notes,
    photoPath: data.photoPath,
  });

  return { inspection };
}

/**
 * Get all inspections for an item.
 * Requires project membership.
 */
export async function getInspectionsByItem(
  projectId: string,
  itemId: string,
  userId: string,
) {
  await requireProjectMember(projectId, userId);
  const inspections = await listByItem(itemId);
  return { inspections };
}

/**
 * Get all inspections by a user.
 * No project membership required — user queries their own history.
 */
export async function getInspectionsByUser(userId: string) {
  const inspections = await listByUser(userId);
  return { inspections };
}
