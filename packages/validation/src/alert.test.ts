import { describe, expect, it } from 'vitest';
import {
  createAlertSchema,
  alertFilterSchema,
  acknowledgeAlertSchema,
  dismissAlertSchema,
  notificationPrefSchema,
  updateNotificationPrefSchema,
} from './alert';

// ---------------------------------------------------------------------------
// createAlertSchema
// ---------------------------------------------------------------------------
describe('createAlertSchema', () => {
  const validInput = {
    projectId: 'clprojxxxxxxxxxxxxxxxxxx',
    alertType: 'DOCUMENT_EXPIRING',
    severity: 'WARNING',
    sourceType: 'document',
    sourceId: 'cldocxxxxxxxxxxxxxxxxxxx',
    title: 'Document expiring in 7 days',
  };

  it('accepts valid input with required fields only', () => {
    const result = createAlertSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBe('clprojxxxxxxxxxxxxxxxxxx');
      expect(result.data.alertType).toBe('DOCUMENT_EXPIRING');
      expect(result.data.severity).toBe('WARNING');
      expect(result.data.sourceType).toBe('document');
      expect(result.data.sourceId).toBe('cldocxxxxxxxxxxxxxxxxxxx');
      expect(result.data.title).toBe('Document expiring in 7 days');
      expect(result.data.message).toBeUndefined();
      expect(result.data.metadata).toBeUndefined();
    }
  });

  it('accepts valid input with all optional fields', () => {
    const result = createAlertSchema.safeParse({
      ...validInput,
      message: 'Your document expires soon',
      metadata: { daysUntilExpiry: 7 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe('Your document expires soon');
      expect(result.data.metadata).toEqual({ daysUntilExpiry: 7 });
    }
  });

  it('rejects missing projectId', () => {
    const { projectId, ...input } = validInput;
    const result = createAlertSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing alertType', () => {
    const { alertType, ...input } = validInput;
    const result = createAlertSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid alertType', () => {
    const result = createAlertSchema.safeParse({
      ...validInput,
      alertType: 'INVALID_TYPE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing severity', () => {
    const { severity, ...input } = validInput;
    const result = createAlertSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const result = createAlertSchema.safeParse({
      ...validInput,
      severity: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing sourceType', () => {
    const { sourceType, ...input } = validInput;
    const result = createAlertSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing sourceId', () => {
    const { sourceId, ...input } = validInput;
    const result = createAlertSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const { title, ...input } = validInput;
    const result = createAlertSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = createAlertSchema.safeParse({
      ...validInput,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid alertType values', () => {
    const types = [
      'DOCUMENT_EXPIRING',
      'STATUS_INCIDENT',
      'STATUS_BLOCKING',
      'STATUS_FINAL',
      'EVENT_UPCOMING',
    ];
    for (const alertType of types) {
      const result = createAlertSchema.safeParse({ ...validInput, alertType });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid severity values', () => {
    const severities = ['CRITICAL', 'WARNING', 'INFO'];
    for (const severity of severities) {
      const result = createAlertSchema.safeParse({ ...validInput, severity });
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// alertFilterSchema
// ---------------------------------------------------------------------------
describe('alertFilterSchema', () => {
  it('accepts empty filter (all optional)', () => {
    const result = alertFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts filter with alertType', () => {
    const result = alertFilterSchema.safeParse({ alertType: 'DOCUMENT_EXPIRING' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alertType).toBe('DOCUMENT_EXPIRING');
    }
  });

  it('accepts filter with severity', () => {
    const result = alertFilterSchema.safeParse({ severity: 'CRITICAL' });
    expect(result.success).toBe(true);
  });

  it('accepts filter with status', () => {
    const result = alertFilterSchema.safeParse({ status: 'ACTIVE' });
    expect(result.success).toBe(true);
  });

  it('accepts filter with all fields combined', () => {
    const result = alertFilterSchema.safeParse({
      alertType: 'STATUS_INCIDENT',
      severity: 'CRITICAL',
      status: 'ACTIVE',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid alertType', () => {
    const result = alertFilterSchema.safeParse({ alertType: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const result = alertFilterSchema.safeParse({ severity: 'INVALID' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = alertFilterSchema.safeParse({ status: 'INVALID' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// acknowledgeAlertSchema
// ---------------------------------------------------------------------------
describe('acknowledgeAlertSchema', () => {
  it('accepts valid alertId', () => {
    const result = acknowledgeAlertSchema.safeParse({ alertId: 'clalertxxxxxxxxxxxxxxxxx' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alertId).toBe('clalertxxxxxxxxxxxxxxxxx');
    }
  });

  it('rejects missing alertId', () => {
    const result = acknowledgeAlertSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty alertId', () => {
    const result = acknowledgeAlertSchema.safeParse({ alertId: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// dismissAlertSchema
// ---------------------------------------------------------------------------
describe('dismissAlertSchema', () => {
  it('accepts valid alertId', () => {
    const result = dismissAlertSchema.safeParse({ alertId: 'clalertxxxxxxxxxxxxxxxxx' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.alertId).toBe('clalertxxxxxxxxxxxxxxxxx');
    }
  });

  it('rejects missing alertId', () => {
    const result = dismissAlertSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty alertId', () => {
    const result = dismissAlertSchema.safeParse({ alertId: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// notificationPrefSchema
// ---------------------------------------------------------------------------
describe('notificationPrefSchema', () => {
  const validInput = {
    userId: 'cluserxxxxxxxxxxxxxxxxxx',
    projectId: 'clprojxxxxxxxxxxxxxxxxxx',
    alertType: 'DOCUMENT_EXPIRING',
  };

  it('accepts valid input with required fields only', () => {
    const result = notificationPrefSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true); // default
    }
  });

  it('accepts explicit enabled=true', () => {
    const result = notificationPrefSchema.safeParse({ ...validInput, enabled: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
    }
  });

  it('accepts explicit enabled=false', () => {
    const result = notificationPrefSchema.safeParse({ ...validInput, enabled: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });

  it('rejects missing userId', () => {
    const { userId, ...input } = validInput;
    const result = notificationPrefSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing projectId', () => {
    const { projectId, ...input } = validInput;
    const result = notificationPrefSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing alertType', () => {
    const { alertType, ...input } = validInput;
    const result = notificationPrefSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid alertType', () => {
    const result = notificationPrefSchema.safeParse({
      ...validInput,
      alertType: 'INVALID',
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid alertType values', () => {
    const types = [
      'DOCUMENT_EXPIRING',
      'STATUS_INCIDENT',
      'STATUS_BLOCKING',
      'STATUS_FINAL',
      'EVENT_UPCOMING',
    ];
    for (const alertType of types) {
      const result = notificationPrefSchema.safeParse({ ...validInput, alertType });
      expect(result.success).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// updateNotificationPrefSchema
// ---------------------------------------------------------------------------
describe('updateNotificationPrefSchema', () => {
  it('accepts update with enabled only', () => {
    const result = updateNotificationPrefSchema.safeParse({ enabled: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });

  it('rejects empty update', () => {
    const result = updateNotificationPrefSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
