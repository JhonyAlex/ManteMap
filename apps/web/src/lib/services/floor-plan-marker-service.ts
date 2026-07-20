import { createMarkerSchema, updateMarkerSchema, type CreateMarkerInput, type UpdateMarkerInput } from '@mantemap/validation';
import { createMarkerWithAssociation, findMarkersByFloorPlan, updateMarkerWithAssociation, deleteMarker } from '@/lib/repositories/floor-plan-repository';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';
import { assertMarkerItemAssociation, requireProjectFloorPlan, requireProjectMarker } from './floor-plan-ownership-service';
import { ValidationError } from '@mantemap/shared';

export function validateCoordinates(x: number, y: number): void {
  if (x < 0 || x > 1) throw new ValidationError(`x coordinate must be between 0 and 1, got ${x}`);
  if (y < 0 || y > 1) throw new ValidationError(`y coordinate must be between 0 and 1, got ${y}`);
}

export async function addMarker(projectId: string, floorPlanId: string, input: CreateMarkerInput, userId: string) {
  await requireProjectOwner(projectId, userId);
  await requireProjectFloorPlan(projectId, floorPlanId);
  const parsed = createMarkerSchema.parse(input);
  if (parsed.type !== 'POLYGON') validateCoordinates(parsed.x, parsed.y);
  await assertMarkerItemAssociation(projectId, floorPlanId, parsed.itemId);
  return { marker: await createMarkerWithAssociation(floorPlanId, parsed) };
}

export async function getMarker(projectId: string, floorPlanId: string, markerId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  await requireProjectFloorPlan(projectId, floorPlanId);
  return { marker: await requireProjectMarker(projectId, floorPlanId, markerId) };
}

export async function listMarkers(projectId: string, floorPlanId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  await requireProjectFloorPlan(projectId, floorPlanId);
  return { markers: await findMarkersByFloorPlan(floorPlanId) };
}

export async function editMarker(projectId: string, floorPlanId: string, markerId: string, input: UpdateMarkerInput, userId: string) {
  await requireProjectOwner(projectId, userId);
  await requireProjectFloorPlan(projectId, floorPlanId);
  const existing = await requireProjectMarker(projectId, floorPlanId, markerId);
  const parsed = updateMarkerSchema.parse(input);
  if (parsed.x !== undefined || parsed.y !== undefined) validateCoordinates(parsed.x ?? existing.x, parsed.y ?? existing.y);
  await assertMarkerItemAssociation(projectId, floorPlanId, parsed.itemId);
  return { marker: await updateMarkerWithAssociation(floorPlanId, markerId, parsed) };
}

export async function removeMarker(projectId: string, floorPlanId: string, markerId: string, userId: string) {
  await requireProjectOwner(projectId, userId);
  await requireProjectFloorPlan(projectId, floorPlanId);
  await requireProjectMarker(projectId, floorPlanId, markerId);
  await deleteMarker(floorPlanId, markerId);
}
