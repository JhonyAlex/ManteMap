/**
 * FloorPlan and LocationMarker repository — data access layer.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "FloorPlan model with image upload" — CRUD
 *   "LocationMarker model with normalized coordinates" — marker CRUD
 *   "Cascade delete markers" — handled by Prisma onDelete: Cascade
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Data access layer for floor plans"
 */

import type { FloorPlan, LocationMarker, PrismaClient } from '@mantemap/database';
import prisma from '@mantemap/database';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateFloorPlanData = {
  name: string;
  imageUrl: string;
  width: number;
  height: number;
};

export type CreateMarkerData = {
  x: number;
  y: number;
  label?: string;
  color?: string;
  itemId?: string;
  type?: string;
  points?: Array<{ x: number; y: number }>;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

export type UpdateMarkerData = {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  itemId?: string;
  type?: string;
  points?: Array<{ x: number; y: number }>;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
};

// ---------------------------------------------------------------------------
// FloorPlan CRUD
// ---------------------------------------------------------------------------

export async function createFloorPlan(
  locationId: string,
  data: CreateFloorPlanData,
  client: PrismaClient = prisma
): Promise<FloorPlan> {
  return client.floorPlan.create({
    data: {
      locationId,
      name: data.name,
      imageUrl: data.imageUrl,
      width: data.width,
      height: data.height,
    },
  });
}

export async function findFloorPlanById(
  locationId: string,
  floorPlanId: string,
  client?: PrismaClient
): Promise<FloorPlan | null>;
export async function findFloorPlanById(
  floorPlanId: string,
  client?: PrismaClient
): Promise<FloorPlan | null>;
export async function findFloorPlanById(
  locationIdOrFloorPlanId: string,
  floorPlanIdOrClient?: string | PrismaClient,
  maybeClient?: PrismaClient
): Promise<FloorPlan | null> {
  // Overload 1: (floorPlanId, client?)
  if (typeof floorPlanIdOrClient !== 'string') {
    const client = floorPlanIdOrClient ?? prisma;
    return client.floorPlan.findFirst({
      where: { id: locationIdOrFloorPlanId, active: true },
    });
  }
  // Overload 2: (locationId, floorPlanId, client?)
  const client = (maybeClient ?? prisma) as PrismaClient;
  return client.floorPlan.findFirst({
    where: { id: floorPlanIdOrClient as string, locationId: locationIdOrFloorPlanId, active: true },
  });
}

export async function findFloorPlansByLocation(
  locationId: string,
  client: PrismaClient = prisma
): Promise<FloorPlan[]> {
  return client.floorPlan.findMany({
    where: { locationId, active: true },
    orderBy: { createdAt: 'desc' },
    include: { location: { select: { id: true, name: true } } },
  });
}

export async function findFloorPlansByProject(
  projectId: string,
  client: PrismaClient = prisma
): Promise<FloorPlan[]> {
  return client.floorPlan.findMany({
    where: { location: { projectId }, active: true },
    orderBy: { createdAt: 'desc' },
    include: { location: { select: { id: true, name: true } } },
  });
}

export async function deleteFloorPlan(
  floorPlanId: string,
  client: PrismaClient = prisma
): Promise<void> {
  const existing = await client.floorPlan.findUnique({
    where: { id: floorPlanId },
  });
  if (!existing) {
    throw new NotFoundError('FloorPlan', floorPlanId);
  }

  // Hard delete — cascade removes markers via Prisma relation
  await client.floorPlan.delete({
    where: { id: floorPlanId },
  });
}

// ---------------------------------------------------------------------------
// Marker CRUD
// ---------------------------------------------------------------------------

export async function createMarker(
  floorPlanId: string,
  data: CreateMarkerData,
  client: PrismaClient = prisma
): Promise<LocationMarker> {
  return client.locationMarker.create({
    data: {
      floorPlanId,
      x: data.x,
      y: data.y,
      label: data.label,
      color: data.color,
      itemId: data.itemId,
      type: data.type,
      points: data.points as object | undefined,
      fillColor: data.fillColor,
      strokeColor: data.strokeColor,
      strokeWidth: data.strokeWidth,
    },
  });
}

export async function findMarkerById(
  floorPlanId: string,
  markerId: string,
  client: PrismaClient = prisma
): Promise<LocationMarker | null> {
  return client.locationMarker.findFirst({
    where: { id: markerId, floorPlanId },
  });
}

export async function findMarkersByFloorPlan(
  floorPlanId: string,
  client: PrismaClient = prisma
): Promise<LocationMarker[]> {
  return client.locationMarker.findMany({
    where: { floorPlanId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function updateMarker(
  floorPlanId: string,
  markerId: string,
  data: UpdateMarkerData,
  client: PrismaClient = prisma
): Promise<LocationMarker> {
  const existing = await findMarkerById(floorPlanId, markerId, client);
  if (!existing) {
    throw new NotFoundError('LocationMarker', markerId);
  }

  return client.locationMarker.update({
    where: { id: markerId },
    data,
  });
}

export async function deleteMarker(
  floorPlanId: string,
  markerId: string,
  client: PrismaClient = prisma
): Promise<void> {
  const existing = await findMarkerById(floorPlanId, markerId, client);
  if (!existing) {
    throw new NotFoundError('LocationMarker', markerId);
  }

  await client.locationMarker.delete({
    where: { id: markerId },
  });
}
