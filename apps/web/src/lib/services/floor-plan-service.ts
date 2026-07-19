/**
 * FloorPlan service — business logic for floor plans and markers.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "FloorPlan model with image upload" — upload via StorageDriver
 *   "Reject unsupported format" — format validation
 *   "Reject oversized file" — size validation
 *   "LocationMarker model with normalized coordinates" — coordinate validation
 *   "Floor plan CRUD access" — project-scoped access (owner for mutations, member for reads)
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Upload via StorageDriver, marker coordinate validation, cascade delete"
 */

import {
  createFloorPlanSchema,
  createMarkerSchema,
  updateMarkerSchema,
  ALLOWED_FLOOR_PLAN_EXTENSIONS,
  MAX_FLOOR_PLAN_SIZE_BYTES,
  type CreateMarkerInput,
  type UpdateMarkerInput,
} from '@mantemap/validation';
import { NotFoundError, ValidationError } from '@mantemap/shared';
import {
  createFloorPlan as createFloorPlanRepo,
  findFloorPlanById,
  findFloorPlansByLocation,
  findFloorPlansByProject,
  deleteFloorPlan as deleteFloorPlanRepo,
  createMarker as createMarkerRepo,
  findMarkerById,
  findMarkersByFloorPlan,
  updateMarker as updateMarkerRepo,
  deleteMarker as deleteMarkerRepo,
} from '@/lib/repositories/floor-plan-repository';
import { getStorageDriver } from '@/lib/storage';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Pure validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate that the file extension is in the allowed list.
 * Spec: "Supported formats: PNG, JPG, SVG"
 */
export function validateFileExtension(fileName: string): void {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
  if (!ALLOWED_FLOOR_PLAN_EXTENSIONS.includes(ext)) {
    throw new ValidationError(
      `File extension "${ext}" not allowed. Allowed: ${ALLOWED_FLOOR_PLAN_EXTENSIONS.join(', ')}`
    );
  }
}

/**
 * Validate that the file size does not exceed the maximum.
 * Spec: "Max file size MUST be enforced (default 10MB)"
 */
export function validateFileSize(size: number): void {
  if (size > MAX_FLOOR_PLAN_SIZE_BYTES) {
    throw new ValidationError(
      `File size ${size} bytes exceeds maximum of ${MAX_FLOOR_PLAN_SIZE_BYTES} bytes`
    );
  }
}

/**
 * Validate that marker coordinates are within the normalized 0–1 range.
 * Spec: "Coordinates MUST validate within 0–1 inclusive"
 */
export function validateCoordinates(x: number, y: number): void {
  if (x < 0 || x > 1) {
    throw new ValidationError(`x coordinate must be between 0 and 1, got ${x}`);
  }
  if (y < 0 || y > 1) {
    throw new ValidationError(`y coordinate must be between 0 and 1, got ${y}`);
  }
}

// ---------------------------------------------------------------------------
// FloorPlan service functions
// ---------------------------------------------------------------------------

export async function uploadFloorPlan(
  projectId: string,
  locationId: string,
  file: File,
  input: { name: string; width: number; height: number },
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  // Validate file
  validateFileExtension(file.name);
  validateFileSize(file.size);

  // Parse input (imageUrl comes from storage, not from user)
  const parsed = createFloorPlanSchema.parse({
    ...input,
    locationId,
    imageUrl: 'placeholder', // Will be overwritten by storage path
  });

  // Store file via StorageDriver (same pattern as document-service)
  const storageDriver = getStorageDriver();
  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = `${locationId}/${Date.now()}-${file.name}`;
  const storagePath = await storageDriver.writeFile(buffer, relativePath);

  // Create floor plan record
  const floorPlan = await createFloorPlanRepo(locationId, {
    name: parsed.name,
    imageUrl: storagePath,
    width: parsed.width,
    height: parsed.height,
  });

  return { floorPlan };
}

export async function getFloorPlan(
  projectId: string,
  floorPlanId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  const floorPlan = await findFloorPlanById(floorPlanId);
  if (!floorPlan) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  return { floorPlan };
}

export async function listFloorPlans(
  projectId: string,
  locationId: string | null,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  const floorPlans = locationId
    ? await findFloorPlansByLocation(locationId)
    : await findFloorPlansByProject(projectId);
  return { floorPlans };
}

export async function removeFloorPlan(
  projectId: string,
  floorPlanId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  // Get floor plan to find storage path
  const floorPlan = await findFloorPlanById(floorPlanId);
  if (!floorPlan) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  // Delete storage file (best-effort — don't fail if already missing)
  const storageDriver = getStorageDriver();
  try {
    await storageDriver.deleteFile(floorPlan.imageUrl);
  } catch {
    // Log but don't fail — file may already be missing
  }

  // Delete floor plan (cascade deletes markers)
  await deleteFloorPlanRepo(floorPlanId);
}

// ---------------------------------------------------------------------------
// Marker service functions
// ---------------------------------------------------------------------------

export async function addMarker(
  projectId: string,
  floorPlanId: string,
  input: CreateMarkerInput,
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  // Verify floor plan exists
  const floorPlan = await findFloorPlanById(floorPlanId);
  if (!floorPlan) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  // Validate input
  const parsed = createMarkerSchema.parse(input);

  // Validate coordinates
  if (parsed.type !== 'POLYGON') {
    validateCoordinates(parsed.x, parsed.y);
  }

  const marker = await createMarkerRepo(floorPlanId, {
    x: parsed.x,
    y: parsed.y,
    label: parsed.label,
    color: parsed.color,
    itemId: parsed.itemId,
    type: parsed.type,
    points: parsed.points,
    fillColor: parsed.fillColor,
    strokeColor: parsed.strokeColor,
    strokeWidth: parsed.strokeWidth,
  });

  return { marker };
}

export async function getMarker(
  projectId: string,
  floorPlanId: string,
  markerId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  // Verify floor plan exists
  const floorPlan = await findFloorPlanById(floorPlanId);
  if (!floorPlan) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  const marker = await findMarkerById(floorPlanId, markerId);
  if (!marker) {
    throw new NotFoundError('LocationMarker', markerId);
  }

  return { marker };
}

export async function listMarkers(
  projectId: string,
  floorPlanId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  // Verify floor plan exists
  const floorPlan = await findFloorPlanById(floorPlanId);
  if (!floorPlan) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  const markers = await findMarkersByFloorPlan(floorPlanId);
  return { markers };
}

export async function editMarker(
  projectId: string,
  floorPlanId: string,
  markerId: string,
  input: UpdateMarkerInput,
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  // Verify floor plan exists
  const floorPlan = await findFloorPlanById(floorPlanId);
  if (!floorPlan) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  // Verify marker exists
  const existing = await findMarkerById(floorPlanId, markerId);
  if (!existing) {
    throw new NotFoundError('LocationMarker', markerId);
  }

  // Validate input
  const parsed = updateMarkerSchema.parse(input);

  // Validate coordinates if provided
  if (parsed.x !== undefined || parsed.y !== undefined) {
    validateCoordinates(parsed.x ?? existing.x, parsed.y ?? existing.y);
  }

  const marker = await updateMarkerRepo(floorPlanId, markerId, parsed);
  return { marker };
}

export async function removeMarker(
  projectId: string,
  floorPlanId: string,
  markerId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  // Verify floor plan exists
  const floorPlan = await findFloorPlanById(floorPlanId);
  if (!floorPlan) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  await deleteMarkerRepo(floorPlanId, markerId);
}
