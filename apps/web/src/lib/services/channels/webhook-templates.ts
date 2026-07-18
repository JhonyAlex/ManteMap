/**
 * Webhook event templates — format payload for each AlertType.
 *
 * Each template returns a JSON-serializable object that is merged
 * into the webhook POST body alongside standard fields (event, timestamp, etc.).
 */

export interface WebhookTemplatePayload {
  event: string;
  timestamp: string;
  alert: {
    id: string;
    severity: string;
    title: string;
    message: string | null;
  };
  project?: string | null;
  appUrl?: string;
  itemId?: string | null;
  documentId?: string | null;
  statusName?: string | null;
  expiryDate?: string | null;
  eventDate?: string | null;
}

/**
 * Build the standard webhook payload envelope.
 */
export function buildWebhookPayload(params: {
  alertType: string;
  alertId: string;
  severity: string;
  title: string;
  message: string | null;
  projectName?: string;
  metadata?: Record<string, unknown> | null;
}): WebhookTemplatePayload {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const meta = params.metadata ?? {};

  const payload: WebhookTemplatePayload = {
    event: params.alertType,
    timestamp: new Date().toISOString(),
    alert: {
      id: params.alertId,
      severity: params.severity,
      title: params.title,
      message: params.message,
    },
    project: params.projectName || null,
    appUrl,
  };

  // Add type-specific fields from metadata
  if (meta.itemId && typeof meta.itemId === 'string') {
    payload.itemId = meta.itemId;
  }
  if (meta.documentId && typeof meta.documentId === 'string') {
    payload.documentId = meta.documentId;
  }
  if (meta.statusName && typeof meta.statusName === 'string') {
    payload.statusName = meta.statusName;
  }
  if (meta.expiryDate && typeof meta.expiryDate === 'string') {
    payload.expiryDate = meta.expiryDate;
  }
  if (meta.eventDate && typeof meta.eventDate === 'string') {
    payload.eventDate = meta.eventDate;
  }

  return payload;
}
