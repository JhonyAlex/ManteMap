import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared enums (match Prisma enums)
// ---------------------------------------------------------------------------

export const alertTypeEnum = z.enum([
  'DOCUMENT_EXPIRING',
  'STATUS_INCIDENT',
  'STATUS_BLOCKING',
  'STATUS_FINAL',
  'EVENT_UPCOMING',
]);

export const alertSeverityEnum = z.enum(['CRITICAL', 'WARNING', 'INFO']);

export const alertStatusEnum = z.enum(['ACTIVE', 'ACKNOWLEDGED', 'DISMISSED']);

// ---------------------------------------------------------------------------
// createAlertSchema
// ---------------------------------------------------------------------------

export const createAlertSchema = z.object({
  projectId: z.string().cuid(),
  alertType: alertTypeEnum,
  severity: alertSeverityEnum,
  sourceType: z.string().trim().min(1, 'sourceType is required'),
  sourceId: z.string().trim().min(1, 'sourceId is required'),
  title: z.string().trim().min(1, 'Title is required'),
  message: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;

// ---------------------------------------------------------------------------
// alertFilterSchema
// ---------------------------------------------------------------------------

export const alertFilterSchema = z.object({
  alertType: alertTypeEnum.optional(),
  severity: alertSeverityEnum.optional(),
  status: alertStatusEnum.optional(),
});

export type AlertFilterInput = z.infer<typeof alertFilterSchema>;

// ---------------------------------------------------------------------------
// acknowledgeAlertSchema
// ---------------------------------------------------------------------------

export const acknowledgeAlertSchema = z.object({
  alertId: z.string().cuid(),
});

export type AcknowledgeAlertInput = z.infer<typeof acknowledgeAlertSchema>;

// ---------------------------------------------------------------------------
// dismissAlertSchema
// ---------------------------------------------------------------------------

export const dismissAlertSchema = z.object({
  alertId: z.string().cuid(),
});

export type DismissAlertInput = z.infer<typeof dismissAlertSchema>;

// ---------------------------------------------------------------------------
// notificationPrefSchema
// ---------------------------------------------------------------------------

export const notificationPrefSchema = z.object({
  userId: z.string().cuid(),
  projectId: z.string().cuid(),
  alertType: alertTypeEnum,
  enabled: z.boolean().default(true),
});

export type NotificationPrefInput = z.infer<typeof notificationPrefSchema>;

// ---------------------------------------------------------------------------
// updateNotificationPrefSchema
// ---------------------------------------------------------------------------

export const updateNotificationPrefSchema = z
  .object({
    enabled: z.boolean(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateNotificationPrefInput = z.infer<typeof updateNotificationPrefSchema>;
