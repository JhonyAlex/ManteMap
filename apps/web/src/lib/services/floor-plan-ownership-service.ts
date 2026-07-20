import { NotFoundError } from '@mantemap/shared';
import {
  findProjectFloorPlanById,
  findProjectItemById,
  findProjectLocationById,
  findProjectMarkerById,
} from '@/lib/repositories/floor-plan-repository';

export async function requireProjectLocation(projectId: string, locationId: string) {
  const location = await findProjectLocationById(projectId, locationId);
  if (!location) throw new NotFoundError('Location', locationId);
  return location;
}

export async function requireProjectFloorPlan(projectId: string, floorPlanId: string) {
  const floorPlan = await findProjectFloorPlanById(projectId, floorPlanId);
  if (!floorPlan) throw new NotFoundError('FloorPlan', floorPlanId);
  return floorPlan;
}

export async function requireProjectMarker(
  projectId: string,
  floorPlanId: string,
  markerId: string
) {
  const marker = await findProjectMarkerById(projectId, floorPlanId, markerId);
  if (!marker) throw new NotFoundError('LocationMarker', markerId);
  return marker;
}

export async function assertMarkerItemAssociation(
  projectId: string,
  floorPlanId: string,
  itemId: string | undefined,
) {
  if (!itemId) return;
  const item = await findProjectItemById(projectId, itemId);
  if (!item) throw new NotFoundError('Item', itemId);
}
