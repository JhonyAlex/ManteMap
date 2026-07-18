/**
 * Metrics service — access-checked metrics, activity normalization, and CSV generation.
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Interfaces / Contracts" section.
 */

import type {
  ProjectMetrics,
  ActivityEntry,
  ActivityKind,
  ReportType,
} from '@mantemap/shared';
import { requireProjectMember } from '@/lib/services/project-access-service';
import {
  countItems,
  countItemsByStatus,
  countActiveAlerts,
  countAlertsBySeverity,
  countDocuments,
  countDocumentsExpiringSoon,
  countUpcomingEvents,
  countActiveLocations,
  getRecentItems,
  getRecentDocumentVersions,
  getRecentAlerts,
  getRecentEvents,
  getItemsForExport,
  getDocumentsForExport,
  getAlertsForExport,
} from '@/lib/repositories/metrics-repository';
import { toCsv } from '@/lib/services/csv-serializer';

// ---------------------------------------------------------------------------
// getProjectMetrics
// ---------------------------------------------------------------------------

/**
 * Get aggregated project metrics for the dashboard.
 *
 * Independent counts run concurrently for performance.
 * Requires project membership (throws NotFoundError for non-members).
 *
 * @param projectId - the project ID
 * @param userId    - the authenticated user's ID
 * @param now       - injected clock (defaults to Date.now())
 */
export async function getProjectMetrics(
  projectId: string,
  userId: string,
  now: Date = new Date()
): Promise<ProjectMetrics> {
  await requireProjectMember(projectId, userId);

  // Concurrent reads — independent queries
  const [
    totalItems,
    statusCounts,
    activeAlerts,
    alertSeverityCounts,
    totalDocuments,
    documentsExpiringSoon,
    upcomingEvents,
    activeLocations,
  ] = await Promise.all([
    countItems(projectId),
    countItemsByStatus(projectId),
    countActiveAlerts(projectId),
    countAlertsBySeverity(projectId),
    countDocuments(projectId),
    countDocumentsExpiringSoon(projectId, now),
    countUpcomingEvents(projectId, now),
    countActiveLocations(projectId),
  ]);

  // Compute unassigned: items without a status assignment
  const assignedItems = statusCounts.reduce((sum, sc) => sum + sc.count, 0);
  const unassignedItems = Math.max(0, totalItems - assignedItems);

  return {
    totalItems,
    statusCounts,
    unassignedItems,
    activeAlerts,
    alertSeverityCounts,
    totalDocuments,
    documentsExpiringSoon,
    upcomingEvents,
    activeLocations,
  };
}

// ---------------------------------------------------------------------------
// getRecentActivity
// ---------------------------------------------------------------------------

/**
 * Get a bounded recent-activity timeline for a project.
 *
 * Fetches at most `limit` rows per source, normalizes, sorts descending
 * by timestamp, then slices to `limit`.
 *
 * @param projectId - the project ID
 * @param userId    - the authenticated user's ID
 * @param limit     - max entries to return (default: 10)
 */
export async function getRecentActivity(
  projectId: string,
  userId: string,
  limit: number = 10
): Promise<ActivityEntry[]> {
  await requireProjectMember(projectId, userId);

  // Fetch bounded rows per source
  const [items, docVersions, alerts, events] = await Promise.all([
    getRecentItems(projectId, limit),
    getRecentDocumentVersions(projectId, limit),
    getRecentAlerts(projectId, limit),
    getRecentEvents(projectId, limit),
  ]);

  // Normalize to ActivityEntry
  const entries: ActivityEntry[] = [];

  for (const item of items) {
    entries.push({
      id: item.id,
      kind: 'item_created' as ActivityKind,
      title: item.name,
      href: `/projects/${projectId}/items/${item.id}`,
      timestamp: item.createdAt,
    });
  }

  for (const dv of docVersions) {
    entries.push({
      id: dv.id,
      kind: 'document_uploaded' as ActivityKind,
      title: dv.document.name,
      href: `/projects/${projectId}/documents/${dv.documentId}`,
      timestamp: dv.createdAt,
    });
  }

  for (const alert of alerts) {
    entries.push({
      id: alert.id,
      kind: 'alert_created' as ActivityKind,
      title: alert.title,
      href: `/projects/${projectId}/alerts`,
      timestamp: alert.createdAt,
    });
  }

  for (const event of events) {
    entries.push({
      id: event.id,
      kind: 'event_created' as ActivityKind,
      title: event.title,
      href: `/projects/${projectId}/events/${event.id}`,
      timestamp: event.createdAt,
    });
  }

  // Sort descending by timestamp, cap to limit
  entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return entries.slice(0, limit);
}

// ---------------------------------------------------------------------------
// exportProjectCsv
// ---------------------------------------------------------------------------

/**
 * Export project data as CSV for a given report type.
 *
 * Requires project membership. Returns a CSV string with RFC 4180 compliance
 * and formula-injection escaping.
 *
 * @param projectId - the project ID
 * @param userId    - the authenticated user's ID
 * @param type      - report type: 'items' | 'documents' | 'alerts'
 */
export async function exportProjectCsv(
  projectId: string,
  userId: string,
  type: ReportType
): Promise<string> {
  await requireProjectMember(projectId, userId);

  switch (type) {
    case 'items':
      return exportItemsCsv(projectId);
    case 'documents':
      return exportDocumentsCsv(projectId);
    case 'alerts':
      return exportAlertsCsv(projectId);
  }
}

// ---------------------------------------------------------------------------
// Private CSV helpers
// ---------------------------------------------------------------------------

async function exportItemsCsv(projectId: string): Promise<string> {
  const items = await getItemsForExport(projectId);

  const columns = ['Name', 'Type', 'Status', 'Location', 'Created At'];
  const rows = items.map((item: {
    name: string;
    itemType: { name: string };
    status: { name: string } | null;
    location: { name: string } | null;
    createdAt: Date;
  }) => [
    item.name,
    item.itemType.name,
    item.status?.name ?? '',
    item.location?.name ?? '',
    item.createdAt.toISOString(),
  ]);

  return toCsv(columns, rows);
}

async function exportDocumentsCsv(projectId: string): Promise<string> {
  const docs = await getDocumentsForExport(projectId);

  const columns = ['Name', 'Item', 'MIME Type', 'Size (bytes)', 'Expires At', 'Created At'];
  const rows = docs.map((doc: {
    name: string;
    item: { name: string };
    mimeType: string;
    sizeBytes: number;
    expiresAt: Date | null;
    createdAt: Date;
  }) => [
    doc.name,
    doc.item.name,
    doc.mimeType,
    String(doc.sizeBytes),
    doc.expiresAt?.toISOString() ?? '',
    doc.createdAt.toISOString(),
  ]);

  return toCsv(columns, rows);
}

async function exportAlertsCsv(projectId: string): Promise<string> {
  const alerts = await getAlertsForExport(projectId);

  const columns = ['Type', 'Severity', 'Status', 'Title', 'Created At'];
  const rows = alerts.map((alert: {
    alertType: string;
    severity: string;
    status: string;
    title: string;
    createdAt: Date;
  }) => [
    alert.alertType,
    alert.severity,
    alert.status,
    alert.title,
    alert.createdAt.toISOString(),
  ]);

  return toCsv(columns, rows);
}
