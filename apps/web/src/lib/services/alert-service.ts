import { NotFoundError } from '@mantemap/shared';
import {
  upsertAlert,
  listAlerts as listAlertsRepo,
  getAlertById,
  acknowledgeAlert as acknowledgeAlertRepo,
  dismissAlert as dismissAlertRepo,
  countUnreadAlerts,
  getNotificationPreferences,
  upsertNotificationPreference,
  type CreateAlertData,
  type AlertFilters,
  type PaginationOptions,
  type UpdateNotificationPrefData,
} from '@/lib/repositories/alert-repository';
import { findExpiringDocuments } from '@/lib/repositories/document-repository';
import { findUpcomingEvents } from '@/lib/repositories/event-repository';
import { requireProjectMember } from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCAN_WINDOW_DAYS = 30;
const EVENT_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map days until expiry to severity level.
 * - 0-1 days: CRITICAL
 * - 2-14 days: WARNING
 * - 15+ days: INFO
 */
export function mapDaysToSeverity(days: number): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (days <= 1) return 'CRITICAL';
  if (days <= 14) return 'WARNING';
  return 'INFO';
}

/**
 * Calculate days between now and a target date.
 */
function daysUntil(target: Date): number {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / 86400000));
}

// ---------------------------------------------------------------------------
// Alert Generation
// ---------------------------------------------------------------------------

/**
 * Generate or update an alert. Idempotent via unique constraint upsert.
 */
export async function generateAlert(
  projectId: string,
  data: CreateAlertData
) {
  return upsertAlert(projectId, data);
}

/**
 * Scan for documents expiring within the scan window (30 days).
 * Returns count of alerts generated/updated.
 */
export async function scanDocumentExpirations(projectId: string): Promise<number> {
  const windowEnd = new Date(Date.now() + SCAN_WINDOW_DAYS * 86400000);
  const docs = await findExpiringDocuments(projectId, windowEnd);

  for (const doc of docs) {
    if (!doc.expiresAt) continue;
    const days = daysUntil(doc.expiresAt);
    const severity = mapDaysToSeverity(days);

    await upsertAlert(projectId, {
      alertType: 'DOCUMENT_EXPIRING',
      severity,
      sourceType: 'document',
      sourceId: doc.id,
      title: `Document "${doc.name}" expiring in ${days} day${days !== 1 ? 's' : ''}`,
      message: `This document expires on ${doc.expiresAt.toISOString().split('T')[0]}`,
      metadata: { daysUntilExpiry: days },
    });
  }

  return docs.length;
}

/**
 * Scan for upcoming events within the event window (7 days).
 * Returns count of alerts generated/updated.
 */
export async function scanUpcomingEvents(projectId: string): Promise<number> {
  const windowEnd = new Date(Date.now() + EVENT_WINDOW_DAYS * 86400000);
  const events = await findUpcomingEvents(projectId, windowEnd);

  for (const event of events) {
    const days = daysUntil(event.startAt);

    await upsertAlert(projectId, {
      alertType: 'EVENT_UPCOMING',
      severity: 'INFO',
      sourceType: 'event',
      sourceId: event.id,
      title: `Upcoming event: ${event.title}`,
      message: `Event starts in ${days} day${days !== 1 ? 's' : ''}`,
      metadata: { daysUntilEvent: days },
    });
  }

  return events.length;
}

// ---------------------------------------------------------------------------
// Alert CRUD
// ---------------------------------------------------------------------------

/**
 * List alerts for a project with optional filters.
 */
export async function listAlerts(
  projectId: string,
  filters: AlertFilters = {},
  userId: string,
  pagination: PaginationOptions = {}
) {
  await requireProjectMember(projectId, userId);
  return listAlertsRepo(projectId, filters, pagination);
}

/**
 * Get a single alert by ID.
 */
export async function getAlert(
  projectId: string,
  alertId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  const alert = await getAlertById(projectId, alertId);
  if (!alert) throw new NotFoundError('Alert', alertId);
  return alert;
}

/**
 * Acknowledge an alert.
 */
export async function acknowledgeAlert(
  projectId: string,
  alertId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  return acknowledgeAlertRepo(projectId, alertId);
}

/**
 * Dismiss an alert.
 */
export async function dismissAlert(
  projectId: string,
  alertId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);
  return dismissAlertRepo(projectId, alertId);
}

/**
 * Get unread alert count for a project.
 */
export async function getUnreadCount(projectId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  return countUnreadAlerts(projectId);
}

// ---------------------------------------------------------------------------
// Notification Preferences
// ---------------------------------------------------------------------------

/**
 * Get notification preferences for the current user in a project.
 */
export async function getPreferences(projectId: string, userId: string) {
  await requireProjectMember(projectId, userId);
  return getNotificationPreferences(userId, projectId);
}

/**
 * Update a notification preference for the current user.
 */
export async function updatePreference(
  projectId: string,
  userId: string,
  data: UpdateNotificationPrefData
) {
  await requireProjectMember(projectId, userId);
  return upsertNotificationPreference(userId, projectId, data);
}
