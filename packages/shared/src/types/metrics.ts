/**
 * Shared metric types for the Dashboard & Reporting feature.
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Interfaces / Contracts" section
 */

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

/** Source kind for activity timeline entries. */
export type ActivityKind =
  | 'item_created'
  | 'item_updated'
  | 'document_uploaded'
  | 'alert_created'
  | 'event_created';

/** A single entry in the bounded activity timeline. */
export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  title: string;
  href: string;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/** CSV-exportable report types. */
export type ReportType = 'items' | 'documents' | 'alerts';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Per-status count pair. */
export interface StatusCount {
  statusId: string;
  name: string;
  count: number;
}

/** Per-severity alert count pair. */
export interface AlertSeverityCount {
  severity: string;
  count: number;
}

/** Aggregated project metrics for the dashboard. */
export interface ProjectMetrics {
  totalItems: number;
  statusCounts: StatusCount[];
  unassignedItems: number;
  activeAlerts: number;
  alertSeverityCounts: AlertSeverityCount[];
  totalDocuments: number;
  documentsExpiringSoon: number;
  upcomingEvents: number;
  activeLocations: number;
}

// ---------------------------------------------------------------------------
// Runtime constants (for test-time verification that the module loads)
// ---------------------------------------------------------------------------

/** All valid ActivityKind values. */
export const ACTIVITY_KINDS: readonly ActivityKind[] = [
  'item_created',
  'item_updated',
  'document_uploaded',
  'alert_created',
  'event_created',
] as const;

/** All valid ReportType values. */
export const REPORT_TYPES: readonly ReportType[] = [
  'items',
  'documents',
  'alerts',
] as const;
