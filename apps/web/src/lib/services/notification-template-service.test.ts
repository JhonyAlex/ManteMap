import { describe, expect, it } from 'vitest';

// RED — production code does not exist yet
import {
  formatDocumentExpiring,
  formatStatusIncident,
  formatStatusBlocking,
  formatStatusFinal,
  formatEventUpcoming,
  formatAlertMessage,
} from './notification-template-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_NAME = 'Test Project';
const APP_URL = 'http://localhost:3000';

const baseAlert = {
  id: 'alert-1',
  severity: 'WARNING',
  title: 'Document expiring',
  message: 'A document is about to expire',
  metadata: null,
};

// ---------------------------------------------------------------------------
// DOCUMENT_EXPIRING
// ---------------------------------------------------------------------------

describe('formatDocumentExpiring', () => {
  it('should produce email with subject containing document name', () => {
    const alert = {
      ...baseAlert,
      alertType: 'DOCUMENT_EXPIRING',
      metadata: { daysUntilExpiry: 7, documentName: 'Permit.pdf' },
    };

    const result = formatDocumentExpiring(alert, PROJECT_NAME, APP_URL);

    // Email
    expect(result.email.subject).toContain('Permit.pdf');
    expect(result.email.html).toContain('Permit.pdf');
    expect(result.email.html).toContain('7');
    expect(result.email.html).toContain(APP_URL);
  });

  it('should produce Slack Block Kit message', () => {
    const alert = {
      ...baseAlert,
      alertType: 'DOCUMENT_EXPIRING',
      metadata: { daysUntilExpiry: 30, documentName: 'License.pdf' },
    };

    const result = formatDocumentExpiring(alert, PROJECT_NAME, APP_URL);

    expect(result.slack.blocks).toBeInstanceOf(Array);
    expect(result.slack.blocks.length).toBeGreaterThan(0);
    // Verify block structure
    const blocks = result.slack.blocks as Array<{ type: string; text?: { text: string } }>;
    expect(blocks.some(b => b.type === 'header')).toBe(true);
  });

  it('should produce Teams MessageCard with severity-based themeColor', () => {
    const alert = {
      ...baseAlert,
      alertType: 'DOCUMENT_EXPIRING',
      severity: 'CRITICAL',
      metadata: { daysUntilExpiry: 1, documentName: 'Safety.pdf' },
    };

    const result = formatDocumentExpiring(alert, PROJECT_NAME, APP_URL);

    const card = result.teams as Record<string, unknown>;
    expect(card['@type']).toBe('MessageCard');
    expect(card.themeColor).toBeDefined();
  });

  it('should produce Telegram Markdown text', () => {
    const alert = {
      ...baseAlert,
      alertType: 'DOCUMENT_EXPIRING',
      metadata: { daysUntilExpiry: 7, documentName: 'Report.pdf' },
    };

    const result = formatDocumentExpiring(alert, PROJECT_NAME, APP_URL);

    expect(result.telegram.text).toContain('Report.pdf');
    expect(result.telegram.text).toContain('7');
  });
});

// ---------------------------------------------------------------------------
// STATUS_INCIDENT
// ---------------------------------------------------------------------------

describe('formatStatusIncident', () => {
  it('should include item name and new status in email subject', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_INCIDENT',
      title: 'Item entered incident status',
      metadata: { itemName: 'Pump A', statusName: 'Broken' },
    };

    const result = formatStatusIncident(alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Pump A');
    expect(result.email.html).toContain('Pump A');
    expect(result.email.html).toContain('Broken');
    expect(result.email.html).toContain(APP_URL);
  });

  it('should produce Slack blocks with severity context', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_INCIDENT',
      severity: 'CRITICAL',
      metadata: { itemName: 'Generator G1', statusName: 'Overheated' },
    };

    const result = formatStatusIncident(alert, PROJECT_NAME, APP_URL);

    expect(result.slack.blocks).toBeInstanceOf(Array);
    expect(result.slack.blocks.length).toBeGreaterThan(0);
  });

  it('should produce Telegram text with project context', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_INCIDENT',
      metadata: { itemName: 'HVAC Unit', statusName: 'Failed' },
    };

    const result = formatStatusIncident(alert, PROJECT_NAME, APP_URL);

    expect(result.telegram.text).toContain('HVAC Unit');
    expect(result.telegram.text).toContain('Failed');
    expect(result.telegram.text).toContain(PROJECT_NAME);
  });
});

// ---------------------------------------------------------------------------
// STATUS_BLOCKING
// ---------------------------------------------------------------------------

describe('formatStatusBlocking', () => {
  it('should produce email with blocking context', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_BLOCKING',
      metadata: { itemName: 'Valve V3', statusName: 'Blocked' },
    };

    const result = formatStatusBlocking(alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Valve V3');
    expect(result.email.subject).toContain('Blocked');
    expect(result.email.html).toContain('Blocked');
    expect(result.email.html).toContain(APP_URL);
  });

  it('should produce Slack blocks for blocking status', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_BLOCKING',
      severity: 'WARNING',
      metadata: { itemName: 'Conveyor C2', statusName: 'Jammed' },
    };

    const result = formatStatusBlocking(alert, PROJECT_NAME, APP_URL);

    expect(result.slack.blocks).toBeInstanceOf(Array);
  });
});

// ---------------------------------------------------------------------------
// STATUS_FINAL
// ---------------------------------------------------------------------------

describe('formatStatusFinal', () => {
  it('should produce email with final status context', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_FINAL',
      metadata: { itemName: 'Production Line 1', statusName: 'Completed' },
    };

    const result = formatStatusFinal(alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Production Line 1');
    expect(result.email.html).toContain('Completed');
    expect(result.email.html).toContain(APP_URL);
  });

  it('should produce Teams card for final status', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_FINAL',
      severity: 'INFO',
      metadata: { itemName: 'Task T42', statusName: 'Done' },
    };

    const result = formatStatusFinal(alert, PROJECT_NAME, APP_URL);

    const card = result.teams as Record<string, unknown>;
    expect(card['@type']).toBe('MessageCard');
  });
});

// ---------------------------------------------------------------------------
// EVENT_UPCOMING
// ---------------------------------------------------------------------------

describe('formatEventUpcoming', () => {
  it('should produce email with event details', () => {
    const alert = {
      ...baseAlert,
      alertType: 'EVENT_UPCOMING',
      metadata: { eventName: 'Annual Inspection', eventDate: '2026-08-15', daysUntil: 28 },
    };

    const result = formatEventUpcoming(alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Annual Inspection');
    expect(result.email.html).toContain('2026-08-15');
    expect(result.email.html).toContain('28');
  });

  it('should produce Telegram text with event context', () => {
    const alert = {
      ...baseAlert,
      alertType: 'EVENT_UPCOMING',
      metadata: { eventName: 'Maintenance Window', eventDate: '2026-07-20', daysUntil: 2 },
    };

    const result = formatEventUpcoming(alert, PROJECT_NAME, APP_URL);

    expect(result.telegram.text).toContain('Maintenance Window');
    expect(result.telegram.text).toContain('2026-07-20');
  });
});

// ---------------------------------------------------------------------------
// formatAlertMessage — registry function
// ---------------------------------------------------------------------------

describe('formatAlertMessage', () => {
  it('should delegate to correct formatter based on alertType', () => {
    const alert = {
      ...baseAlert,
      alertType: 'DOCUMENT_EXPIRING',
      metadata: { daysUntilExpiry: 7, documentName: 'Test.pdf' },
    };

    const result = formatAlertMessage('DOCUMENT_EXPIRING', alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Test.pdf');
  });

  it('should handle STATUS_INCIDENT alertType', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_INCIDENT',
      metadata: { itemName: 'Sensor S1', statusName: 'Warning' },
    };

    const result = formatAlertMessage('STATUS_INCIDENT', alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Sensor S1');
  });

  it('should handle STATUS_BLOCKING alertType', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_BLOCKING',
      metadata: { itemName: 'Door D1', statusName: 'Locked' },
    };

    const result = formatAlertMessage('STATUS_BLOCKING', alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Door D1');
  });

  it('should handle STATUS_FINAL alertType', () => {
    const alert = {
      ...baseAlert,
      alertType: 'STATUS_FINAL',
      metadata: { itemName: 'Inspection I1', statusName: 'Passed' },
    };

    const result = formatAlertMessage('STATUS_FINAL', alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Inspection I1');
  });

  it('should handle EVENT_UPCOMING alertType', () => {
    const alert = {
      ...baseAlert,
      alertType: 'EVENT_UPCOMING',
      metadata: { eventName: 'Review Meeting', eventDate: '2026-08-01', daysUntil: 14 },
    };

    const result = formatAlertMessage('EVENT_UPCOMING', alert, PROJECT_NAME, APP_URL);

    expect(result.email.subject).toContain('Review Meeting');
  });
});
