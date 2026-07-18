import type { Location, PrismaClient } from '@mantemap/database';
import prisma from '@mantemap/database';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateLocationData = {
  name: string;
  level: number;
  parentId?: string | null;
  order?: number;
};

export type UpdateLocationData = {
  name?: string;
  order?: number;
  active?: boolean;
};

export type FindLocationOptions = {
  includeInactive?: boolean;
};

export type TreeNode = Location & { children: TreeNode[] };

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function createLocation(
  projectId: string,
  data: CreateLocationData,
  client: PrismaClient = prisma
): Promise<Location> {
  return client.location.create({
    data: {
      projectId,
      name: data.name,
      level: data.level,
      order: data.order ?? 0,
      parentId: data.parentId ?? null,
    },
  });
}

export async function findLocationById(
  projectId: string,
  locationId: string,
  options: FindLocationOptions = {},
  client: PrismaClient = prisma
): Promise<Location | null> {
  const where: Record<string, unknown> = {
    id: locationId,
    projectId,
  };

  if (!options.includeInactive) {
    where.active = true;
  }

  return client.location.findFirst({ where });
}

export async function findLocationsByProject(
  projectId: string,
  client: PrismaClient = prisma
): Promise<Location[]> {
  return client.location.findMany({
    where: { projectId, active: true },
    orderBy: [{ level: 'asc' }, { order: 'asc' }],
  });
}

export async function findLocationTree(
  projectId: string,
  client: PrismaClient = prisma
): Promise<TreeNode[]> {
  const locations = await findLocationsByProject(projectId, client);
  return buildTree(locations);
}

export async function updateLocation(
  projectId: string,
  locationId: string,
  data: UpdateLocationData,
  client: PrismaClient = prisma
): Promise<Location> {
  const existing = await findLocationById(projectId, locationId, {}, client);
  if (!existing) {
    throw new NotFoundError('Location', locationId);
  }

  return client.location.update({
    where: { id: locationId },
    data,
  });
}

export async function reorderLocations(
  projectId: string,
  locationIds: string[],
  client: PrismaClient = prisma
): Promise<void> {
  for (let i = 0; i < locationIds.length; i++) {
    await client.location.updateMany({
      where: { id: locationIds[i], projectId },
      data: { order: i },
    });
  }
}

export async function deleteLocation(
  projectId: string,
  locationId: string,
  client: PrismaClient = prisma
): Promise<void> {
  const existing = await findLocationById(projectId, locationId, {}, client);
  if (!existing) {
    throw new NotFoundError('Location', locationId);
  }

  // Soft delete — set active to false
  await client.location.update({
    where: { id: locationId },
    data: { active: false },
  });
}

// ---------------------------------------------------------------------------
// Tree builder (pure function)
// ---------------------------------------------------------------------------

/**
 * Build a nested tree structure from a flat array of locations.
 * Locations must be sorted by level ASC, order ASC for correct nesting.
 * Children are sorted by order field after assembly.
 */
export function buildTree(locations: Location[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // First pass: create nodes
  for (const loc of locations) {
    map.set(loc.id, { ...loc, children: [] });
  }

  // Second pass: link children to parents
  for (const loc of locations) {
    const node = map.get(loc.id)!;
    if (loc.parentId) {
      const parent = map.get(loc.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  // Third pass: sort children by order
  const sortChildren = (nodes: TreeNode[]): void => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        node.children.sort((a, b) => a.order - b.order);
        sortChildren(node.children);
      }
    }
  };
  sortChildren(roots);

  return roots;
}
