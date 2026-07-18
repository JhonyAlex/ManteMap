/**
 * Metrics repository — aggregate queries for the Dashboard & Reporting feature.
 *
 * All functions accept a trusted projectId (service already verified membership).
 * Uses explicit `now` for deterministic time-window queries.
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 */

import type { PrismaClient } from '@mantemap/database';
import prisma from '@mantemap/database';
import type { StatusCount, AlertSeverityCount } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Count aggregations
// ---------------------------------------------------------------------------

/** Count all items belonging to item types of a project. */
export async function countItems(
  projectId: string,
  client: PrismaClient = prisma
): Promise<number> {
  return client.item.count({
    where: { itemType: { projectId } },
  });
}

/** Count items grouped by status, including unassigned (null statusId). */
export async function countItemsByStatus(
  projectId: string,
  client: PrismaClient = prisma
): Promise<StatusCount[]> {
  // Fetch statuses for name lookup
  const statuses = await client.status.findMany({
    where: { itemType: { projectId } },
  });
  const statusMap = new Map(statuses.map((s: { id: string; name: string }) => [s.id, s.name]));

  // Group items by statusId
  const groups = await client.item.groupBy({
    by: ['statusId'],
    where: { itemType: { projectId } },
    _count: { _all: true },
  });

  return groups.map((g: { statusId: string | null; _count: { _all: number } }) => ({
    statusId: g.statusId ?? '__unassigned__',
    name: g.statusId ? (statusMap.get(g.statusId) ?? 'Unknown') : 'Unassigned',
    count: g._count._all,
  }));
}

/** Count active (unread) alerts for a project. */
export async function countActiveAlerts(
  projectId: string,
  client: PrismaClient = prisma
): Promise<number> {
  return client.alert.count({
    where: { projectId, status: 'ACTIVE' },
  });
}

/** Count active alerts grouped by severity. */
export async function countAlertsBySeverity(
  projectId: string,
  client: PrismaClient = prisma
): Promise<AlertSeverityCount[]> {
  const groups = await client.alert.groupBy({
    by: ['severity'],
    where: { projectId, status: 'ACTIVE' },
    _count: { _all: true },
  });

  return groups.map((g: { severity: string; _count: { _all: number } }) => ({
    severity: g.severity,
    count: g._count._all,
  }));
}

/** Count all documents belonging to items of a project. */
export async function countDocuments(
  projectId: string,
  client: PrismaClient = prisma
): Promise<number> {
  return client.document.count({
    where: { item: { itemType: { projectId } } },
  });
}

/** Count documents expiring within 30 days from `now` (not already expired). */
export async function countDocumentsExpiringSoon(
  projectId: string,
  now: Date,
  client: PrismaClient = prisma
): Promise<number> {
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return client.document.count({
    where: {
      item: { itemType: { projectId } },
      expiresAt: { gte: now, lte: thirtyDays },
    },
  });
}

/** Count events starting within 7 days from `now`. */
export async function countUpcomingEvents(
  projectId: string,
  now: Date,
  client: PrismaClient = prisma
): Promise<number> {
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return client.event.count({
    where: {
      projectId,
      startAt: { gte: now, lte: sevenDays },
    },
  });
}

/** Count active locations for a project. */
export async function countActiveLocations(
  projectId: string,
  client: PrismaClient = prisma
): Promise<number> {
  return client.location.count({
    where: { projectId, active: true },
  });
}

// ---------------------------------------------------------------------------
// Status lookup (for status-count name resolution)
// ---------------------------------------------------------------------------

/** Get all statuses for item types of a project. */
export async function getStatusesForProject(
  projectId: string,
  client: PrismaClient = prisma
) {
  return client.status.findMany({
    where: { itemType: { projectId } },
  });
}

// ---------------------------------------------------------------------------
// Bounded activity projections
// ---------------------------------------------------------------------------

/** Get recent items with type and status info. */
export async function getRecentItems(
  projectId: string,
  limit: number,
  client: PrismaClient = prisma
) {
  return client.item.findMany({
    where: { itemType: { projectId } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      itemType: { select: { name: true } },
      status: { select: { name: true } },
    },
  });
}

/** Get recent document versions with document info. */
export async function getRecentDocumentVersions(
  projectId: string,
  limit: number,
  client: PrismaClient = prisma
) {
  return client.documentVersion.findMany({
    where: { document: { item: { itemType: { projectId } } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { document: { select: { name: true } } },
  });
}

/** Get recent alerts for a project. */
export async function getRecentAlerts(
  projectId: string,
  limit: number,
  client: PrismaClient = prisma
) {
  return client.alert.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/** Get recent events for a project. */
export async function getRecentEvents(
  projectId: string,
  limit: number,
  client: PrismaClient = prisma
) {
  return client.event.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// ---------------------------------------------------------------------------
// Report projections (for CSV export)
// ---------------------------------------------------------------------------

/** Get items with type, status, and location for CSV export. */
export async function getItemsForExport(
  projectId: string,
  client: PrismaClient = prisma
) {
  return client.item.findMany({
    where: { itemType: { projectId } },
    include: {
      itemType: { select: { name: true } },
      status: { select: { name: true } },
      location: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/** Get documents with item info for CSV export. */
export async function getDocumentsForExport(
  projectId: string,
  client: PrismaClient = prisma
) {
  return client.document.findMany({
    where: { item: { itemType: { projectId } } },
    include: { item: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Get alerts for CSV export. */
export async function getAlertsForExport(
  projectId: string,
  client: PrismaClient = prisma
) {
  return client.alert.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });
}
