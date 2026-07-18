import {
  createLocationSchema,
  updateLocationSchema,
  reorderLocationsSchema,
  type CreateLocationInput,
  type UpdateLocationInput,
  type ReorderLocationsInput,
} from '@mantemap/validation';
import { NotFoundError, ValidationError } from '@mantemap/shared';
import {
  createLocation as createLocationRepo,
  findLocationById,
  findLocationsByProject,
  findLocationTree,
  updateLocation as updateLocationRepo,
  reorderLocations as reorderLocationsRepo,
  deleteLocation as deleteLocationRepo,
} from '@/lib/repositories/location-repository';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LOCATION_LEVEL = 4; // 0=Center, 1=Building, 2=Floor, 3=Room, 4=Zone

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Validate that the location depth does not exceed the maximum (5 levels).
 * Level 0 = root (Center), Level 4 = deepest (Zone).
 */
export function validateDepth(level: number): void {
  if (level > MAX_LOCATION_LEVEL) {
    throw new ValidationError(
      `Maximum location depth exceeded. Locations can have at most 5 levels (0-${MAX_LOCATION_LEVEL}).`
    );
  }
}

/**
 * Validate that the parent exists and belongs to the same project.
 * Also validates that parent.level === child.level - 1.
 */
export async function validateParent(
  projectId: string,
  parentId: string,
  childLevel: number
): Promise<void> {
  const parent = await findLocationById(projectId, parentId);
  if (!parent) {
    throw new NotFoundError('Parent location', parentId);
  }
  if (parent.level !== childLevel - 1) {
    throw new ValidationError(
      `Parent must be level ${childLevel - 1}, got level ${parent.level}.`
    );
  }
}

/**
 * Detect cycles when updating a location's parentId.
 * A cycle exists if the new parent is a descendant of the location being updated.
 */
export async function detectCycle(
  projectId: string,
  locationId: string,
  newParentId: string
): Promise<void> {
  const allLocations = await findLocationsByProject(projectId);
  const descendants = getDescendantIds(locationId, allLocations);

  if (descendants.has(newParentId)) {
    throw new ValidationError(
      'Cannot set parent to a descendant location. This would create a circular reference.'
    );
  }
}

/**
 * Get all descendant IDs for a given location (pure function).
 */
export function getDescendantIds(
  locationId: string,
  locations: Array<{ id: string; parentId: string | null }>
): Set<string> {
  const descendants = new Set<string>();
  const queue = [locationId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const loc of locations) {
      if (loc.parentId === currentId && !descendants.has(loc.id)) {
        descendants.add(loc.id);
        queue.push(loc.id);
      }
    }
  }

  return descendants;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createLocation(
  projectId: string,
  input: CreateLocationInput,
  userId: string
) {
  const parsed = createLocationSchema.parse(input);
  await requireProjectOwner(projectId, userId);

  // Validate depth
  validateDepth(parsed.level);

  // Validate parent if provided
  if (parsed.parentId) {
    await validateParent(projectId, parsed.parentId, parsed.level);
  }

  const location = await createLocationRepo(projectId, {
    name: parsed.name,
    level: parsed.level,
    parentId: parsed.parentId,
    order: parsed.order,
  });

  return { location };
}

export async function getLocation(
  projectId: string,
  locationId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  const location = await findLocationById(projectId, locationId);
  if (!location) {
    throw new NotFoundError('Location', locationId);
  }

  return { location };
}

export async function listLocations(
  projectId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  const locations = await findLocationsByProject(projectId);
  return { locations };
}

export async function getTree(
  projectId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  const tree = await findLocationTree(projectId);
  return { tree };
}

export async function updateLocation(
  projectId: string,
  locationId: string,
  input: UpdateLocationInput & { parentId?: string },
  userId: string
) {
  // Validate input (only name/order/active for Zod, parentId handled separately)
  const { parentId, ...zodInput } = input;
  const parsed = updateLocationSchema.parse(zodInput);

  await requireProjectOwner(projectId, userId);

  // Verify location exists
  const existing = await findLocationById(projectId, locationId);
  if (!existing) {
    throw new NotFoundError('Location', locationId);
  }

  // If parentId is being updated, validate for cycles
  if (parentId !== undefined) {
    if (parentId === locationId) {
      throw new ValidationError('A location cannot be its own parent.');
    }
    if (parentId) {
      const newParent = await findLocationById(projectId, parentId);
      if (!newParent) {
        throw new NotFoundError('Parent location', parentId);
      }
      await detectCycle(projectId, locationId, parentId);
    }
  }

  const updated = await updateLocationRepo(projectId, locationId, parsed);
  return { location: updated };
}

export async function reorderLocations(
  projectId: string,
  input: ReorderLocationsInput,
  userId: string
) {
  const parsed = reorderLocationsSchema.parse(input);
  await requireProjectOwner(projectId, userId);

  await reorderLocationsRepo(projectId, parsed.locationIds);
}

export async function deleteLocation(
  projectId: string,
  locationId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);

  await deleteLocationRepo(projectId, locationId);
}
