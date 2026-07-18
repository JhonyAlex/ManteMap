import type { Prisma } from '@mantemap/database';
import prisma from '@mantemap/database';
import type { Alert, NotificationPreference, PrismaClient, AlertType, AlertSeverity, AlertStatus } from '@mantemap/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateAlertData = {
  alertType: AlertType;
  severity: AlertSeverity;
  sourceType: string;
  sourceId: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export type AlertFilters = {
  alertType?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
};

export type PaginationOptions = {
  page?: number;
  pageSize?: number;
};

export type UpdateNotificationPrefData = {
  alertType: AlertType;
  enabled: boolean;
};

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Upsert an alert using the unique constraint (sourceType, sourceId, alertType).
 * If the alert already exists, update its severity/title/message and reset status to ACTIVE.
 */
export async function upsertAlert(
  projectId: string,
  data: CreateAlertData,
  client: PrismaClient = prisma
): Promise<Alert> {
  return client.alert.upsert({
    where: {
      sourceType_sourceId_alertType: {
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        alertType: data.alertType,
      },
    },
    create: {
      projectId,
      alertType: data.alertType,
      severity: data.severity,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      title: data.title,
      message: data.message,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
    },
    update: {
      severity: data.severity,
      title: data.title,
      message: data.message,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
      status: 'ACTIVE',
      acknowledgedAt: null,
      dismissedAt: null,
    },
  });
}

/**
 * List alerts for a project with optional filters and pagination.
 */
export async function listAlerts(
  projectId: string,
  filters: AlertFilters = {},
  pagination: PaginationOptions = {},
  client: PrismaClient = prisma
): Promise<Alert[]> {
  const where: Prisma.AlertWhereInput = { projectId };

  if (filters.alertType) {
    where.alertType = filters.alertType;
  }
  if (filters.severity) {
    where.severity = filters.severity;
  }
  if (filters.status) {
    where.status = filters.status;
  }

  const page = pagination.page ?? 1;
  const pageSize = pagination.pageSize ?? 20;

  return client.alert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

/**
 * Get a single alert by ID, scoped to project.
 */
export async function getAlertById(
  projectId: string,
  alertId: string,
  client: PrismaClient = prisma
): Promise<Alert | null> {
  return client.alert.findFirst({
    where: { id: alertId, projectId },
  });
}

/**
 * Mark an alert as acknowledged.
 */
export async function acknowledgeAlert(
  projectId: string,
  alertId: string,
  client: PrismaClient = prisma
): Promise<Alert> {
  return client.alert.update({
    where: { id: alertId, projectId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
    },
  });
}

/**
 * Mark an alert as dismissed.
 */
export async function dismissAlert(
  projectId: string,
  alertId: string,
  client: PrismaClient = prisma
): Promise<Alert> {
  return client.alert.update({
    where: { id: alertId, projectId },
    data: {
      status: 'DISMISSED',
      dismissedAt: new Date(),
    },
  });
}

/**
 * Count active (unread) alerts for a project.
 */
export async function countUnreadAlerts(
  projectId: string,
  client: PrismaClient = prisma
): Promise<number> {
  return client.alert.count({
    where: { projectId, status: 'ACTIVE' },
  });
}

/**
 * Get notification preferences for a user in a project.
 */
export async function getNotificationPreferences(
  userId: string,
  projectId: string,
  client: PrismaClient = prisma
): Promise<NotificationPreference[]> {
  return client.notificationPreference.findMany({
    where: { userId, projectId },
  });
}

/**
 * Upsert a notification preference.
 */
export async function upsertNotificationPreference(
  userId: string,
  projectId: string,
  data: UpdateNotificationPrefData,
  client: PrismaClient = prisma
): Promise<NotificationPreference> {
  return client.notificationPreference.upsert({
    where: {
      userId_projectId_alertType: {
        userId,
        projectId,
        alertType: data.alertType,
      },
    },
    create: {
      userId,
      projectId,
      alertType: data.alertType,
      enabled: data.enabled,
    },
    update: {
      enabled: data.enabled,
    },
  });
}
