import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/repositories/alert-repository', () => ({
  upsertAlert: vi.fn(),
  listAlerts: vi.fn(),
  getAlertById: vi.fn(),
  acknowledgeAlert: vi.fn(),
  dismissAlert: vi.fn(),
  countUnreadAlerts: vi.fn(),
  getNotificationPreferences: vi.fn(),
  upsertNotificationPreference: vi.fn(),
}));

vi.mock('@/lib/repositories/document-repository', () => ({
  findExpiringDocuments: vi.fn(),
}));

vi.mock('@/lib/repositories/event-repository', () => ({
  findUpcomingEvents: vi.fn(),
}));

vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
  requireProjectOwner: vi.fn(),
}));

import {
  generateAlert,
  scanDocumentExpirations,
  scanUpcomingEvents,
  listAlerts,
  getAlert,
  acknowledgeAlert,
  dismissAlert,
  getUnreadCount,
  getPreferences,
  updatePreference,
  mapDaysToSeverity,
} from './alert-service';
import * as alertRepo from '@/lib/repositories/alert-repository';
import * as documentRepo from '@/lib/repositories/document-repository';
import * as eventRepo from '@/lib/repositories/event-repository';
import * as access from '@/lib/services/project-access-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const ALERT_ID = 'clalertxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';
const DOC_ID = 'cldocxxxxxxxxxxxxxxxxxxx';
const EVENT_ID = 'cleventxxxxxxxxxxxxxxxxx';

const activeAlert = {
  id: ALERT_ID,
  projectId: PROJECT_ID,
  alertType: 'DOCUMENT_EXPIRING' as const,
  severity: 'WARNING' as const,
  status: 'ACTIVE' as const,
  sourceType: 'document',
  sourceId: DOC_ID,
  title: 'Document expiring in 7 days',
  message: null,
  metadata: null,
  acknowledgedAt: null,
  dismissedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(access.requireProjectMember).mockResolvedValue(undefined);
  vi.mocked(access.requireProjectOwner).mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// mapDaysToSeverity
// ---------------------------------------------------------------------------
describe('mapDaysToSeverity', () => {
  it('returns CRITICAL for 0 days (expired)', () => {
    expect(mapDaysToSeverity(0)).toBe('CRITICAL');
  });

  it('returns CRITICAL for 1 day', () => {
    expect(mapDaysToSeverity(1)).toBe('CRITICAL');
  });

  it('returns WARNING for 7 days', () => {
    expect(mapDaysToSeverity(7)).toBe('WARNING');
  });

  it('returns WARNING for 14 days', () => {
    expect(mapDaysToSeverity(14)).toBe('WARNING');
  });

  it('returns INFO for 30 days', () => {
    expect(mapDaysToSeverity(30)).toBe('INFO');
  });

  it('returns INFO for 60 days', () => {
    expect(mapDaysToSeverity(60)).toBe('INFO');
  });
});

// ---------------------------------------------------------------------------
// generateAlert
// ---------------------------------------------------------------------------
describe('generateAlert', () => {
  it('creates an alert via repository upsert', async () => {
    vi.mocked(alertRepo.upsertAlert).mockResolvedValue(activeAlert);

    const result = await generateAlert(PROJECT_ID, {
      alertType: 'DOCUMENT_EXPIRING',
      severity: 'WARNING',
      sourceType: 'document',
      sourceId: DOC_ID,
      title: 'Document expiring in 7 days',
    });

    expect(alertRepo.upsertAlert).toHaveBeenCalledWith(PROJECT_ID, {
      alertType: 'DOCUMENT_EXPIRING',
      severity: 'WARNING',
      sourceType: 'document',
      sourceId: DOC_ID,
      title: 'Document expiring in 7 days',
      message: undefined,
      metadata: undefined,
    });
    expect(result).toEqual(activeAlert);
  });

  it('passes optional message and metadata', async () => {
    vi.mocked(alertRepo.upsertAlert).mockResolvedValue(activeAlert);

    await generateAlert(PROJECT_ID, {
      alertType: 'STATUS_INCIDENT',
      severity: 'CRITICAL',
      sourceType: 'item',
      sourceId: 'clitemxxxxxxxxxxxxxxxxxx',
      title: 'Item in incident status',
      message: 'Pump A is broken',
      metadata: { statusName: 'Incident' },
    });

    expect(alertRepo.upsertAlert).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({
        message: 'Pump A is broken',
        metadata: { statusName: 'Incident' },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// scanDocumentExpirations
// ---------------------------------------------------------------------------
describe('scanDocumentExpirations', () => {
  it('generates alerts for documents expiring within 30 days', async () => {
    const expiringDocs = [
      { id: DOC_ID, name: 'Safety Cert', expiresAt: new Date(Date.now() + 7 * 86400000) },
      { id: 'cldoc2xxxxxxxxxxxxxxxxxx', name: 'License', expiresAt: new Date(Date.now() + 25 * 86400000) },
    ];
    vi.mocked(documentRepo.findExpiringDocuments).mockResolvedValue(expiringDocs as never);
    vi.mocked(alertRepo.upsertAlert).mockResolvedValue(activeAlert);

    const count = await scanDocumentExpirations(PROJECT_ID);

    expect(documentRepo.findExpiringDocuments).toHaveBeenCalledWith(PROJECT_ID, expect.any(Date));
    expect(alertRepo.upsertAlert).toHaveBeenCalledTimes(2);
    expect(count).toBe(2);
  });

  it('returns 0 when no documents are expiring', async () => {
    vi.mocked(documentRepo.findExpiringDocuments).mockResolvedValue([]);

    const count = await scanDocumentExpirations(PROJECT_ID);

    expect(count).toBe(0);
    expect(alertRepo.upsertAlert).not.toHaveBeenCalled();
  });

  it('calculates correct severity based on days until expiry', async () => {
    const expiringDocs = [
      { id: 'doc1', name: 'Doc 1', expiresAt: new Date(Date.now() + 1 * 86400000) },
      { id: 'doc2', name: 'Doc 2', expiresAt: new Date(Date.now() + 10 * 86400000) },
      { id: 'doc3', name: 'Doc 3', expiresAt: new Date(Date.now() + 30 * 86400000) },
    ];
    vi.mocked(documentRepo.findExpiringDocuments).mockResolvedValue(expiringDocs as never);
    vi.mocked(alertRepo.upsertAlert).mockResolvedValue(activeAlert);

    await scanDocumentExpirations(PROJECT_ID);

    // 1 day → CRITICAL
    expect(alertRepo.upsertAlert).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ severity: 'CRITICAL' })
    );
    // 10 days → WARNING
    expect(alertRepo.upsertAlert).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ severity: 'WARNING' })
    );
    // 30 days → INFO
    expect(alertRepo.upsertAlert).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ severity: 'INFO' })
    );
  });
});

// ---------------------------------------------------------------------------
// scanUpcomingEvents
// ---------------------------------------------------------------------------
describe('scanUpcomingEvents', () => {
  it('generates alerts for events within 7 days', async () => {
    const upcomingEvents = [
      { id: EVENT_ID, title: 'Maintenance', startAt: new Date(Date.now() + 3 * 86400000) },
    ];
    vi.mocked(eventRepo.findUpcomingEvents).mockResolvedValue(upcomingEvents as never);
    vi.mocked(alertRepo.upsertAlert).mockResolvedValue(activeAlert);

    const count = await scanUpcomingEvents(PROJECT_ID);

    expect(eventRepo.findUpcomingEvents).toHaveBeenCalledWith(PROJECT_ID, expect.any(Date));
    expect(alertRepo.upsertAlert).toHaveBeenCalledTimes(1);
    expect(count).toBe(1);
  });

  it('returns 0 when no upcoming events', async () => {
    vi.mocked(eventRepo.findUpcomingEvents).mockResolvedValue([]);

    const count = await scanUpcomingEvents(PROJECT_ID);

    expect(count).toBe(0);
    expect(alertRepo.upsertAlert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// listAlerts
// ---------------------------------------------------------------------------
describe('listAlerts service', () => {
  it('requires project membership', async () => {
    vi.mocked(alertRepo.listAlerts).mockResolvedValue([activeAlert]);

    await listAlerts(PROJECT_ID, {}, USER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('returns alerts from repository', async () => {
    vi.mocked(alertRepo.listAlerts).mockResolvedValue([activeAlert]);

    const result = await listAlerts(PROJECT_ID, { severity: 'WARNING' }, USER_ID);

    expect(alertRepo.listAlerts).toHaveBeenCalledWith(
      PROJECT_ID,
      { severity: 'WARNING' },
      {}
    );
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getAlert
// ---------------------------------------------------------------------------
describe('getAlert service', () => {
  it('requires project membership', async () => {
    vi.mocked(alertRepo.getAlertById).mockResolvedValue(activeAlert);

    await getAlert(PROJECT_ID, ALERT_ID, USER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('returns alert from repository', async () => {
    vi.mocked(alertRepo.getAlertById).mockResolvedValue(activeAlert);

    const result = await getAlert(PROJECT_ID, ALERT_ID, USER_ID);

    expect(alertRepo.getAlertById).toHaveBeenCalledWith(PROJECT_ID, ALERT_ID);
    expect(result).toEqual(activeAlert);
  });
});

// ---------------------------------------------------------------------------
// acknowledgeAlert service
// ---------------------------------------------------------------------------
describe('acknowledgeAlert service', () => {
  it('requires project membership', async () => {
    vi.mocked(alertRepo.acknowledgeAlert).mockResolvedValue({
      ...activeAlert,
      status: 'ACKNOWLEDGED' as const,
    });

    await acknowledgeAlert(PROJECT_ID, ALERT_ID, USER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('delegates to repository', async () => {
    const acked = { ...activeAlert, status: 'ACKNOWLEDGED' as const };
    vi.mocked(alertRepo.acknowledgeAlert).mockResolvedValue(acked);

    const result = await acknowledgeAlert(PROJECT_ID, ALERT_ID, USER_ID);

    expect(alertRepo.acknowledgeAlert).toHaveBeenCalledWith(PROJECT_ID, ALERT_ID);
    expect(result.status).toBe('ACKNOWLEDGED');
  });
});

// ---------------------------------------------------------------------------
// dismissAlert service
// ---------------------------------------------------------------------------
describe('dismissAlert service', () => {
  it('requires project membership', async () => {
    vi.mocked(alertRepo.dismissAlert).mockResolvedValue({
      ...activeAlert,
      status: 'DISMISSED' as const,
    });

    await dismissAlert(PROJECT_ID, ALERT_ID, USER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('delegates to repository', async () => {
    const dismissed = { ...activeAlert, status: 'DISMISSED' as const };
    vi.mocked(alertRepo.dismissAlert).mockResolvedValue(dismissed);

    const result = await dismissAlert(PROJECT_ID, ALERT_ID, USER_ID);

    expect(alertRepo.dismissAlert).toHaveBeenCalledWith(PROJECT_ID, ALERT_ID);
    expect(result.status).toBe('DISMISSED');
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------
describe('getUnreadCount', () => {
  it('requires project membership', async () => {
    vi.mocked(alertRepo.countUnreadAlerts).mockResolvedValue(5);

    await getUnreadCount(PROJECT_ID, USER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('returns count from repository', async () => {
    vi.mocked(alertRepo.countUnreadAlerts).mockResolvedValue(5);

    const result = await getUnreadCount(PROJECT_ID, USER_ID);

    expect(result).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getPreferences
// ---------------------------------------------------------------------------
describe('getPreferences', () => {
  it('requires project membership', async () => {
    vi.mocked(alertRepo.getNotificationPreferences).mockResolvedValue([]);

    await getPreferences(PROJECT_ID, USER_ID);

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('returns preferences from repository', async () => {
    const prefs = [
      { id: 'pref1', userId: USER_ID, projectId: PROJECT_ID, alertType: 'DOCUMENT_EXPIRING', enabled: true },
    ];
    vi.mocked(alertRepo.getNotificationPreferences).mockResolvedValue(prefs as never);

    const result = await getPreferences(PROJECT_ID, USER_ID);

    expect(alertRepo.getNotificationPreferences).toHaveBeenCalledWith(USER_ID, PROJECT_ID);
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updatePreference
// ---------------------------------------------------------------------------
describe('updatePreference', () => {
  it('requires project membership', async () => {
    vi.mocked(alertRepo.upsertNotificationPreference).mockResolvedValue({} as never);

    await updatePreference(PROJECT_ID, USER_ID, {
      alertType: 'DOCUMENT_EXPIRING',
      enabled: false,
    });

    expect(access.requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('delegates to repository', async () => {
    const pref = {
      id: 'pref1',
      userId: USER_ID,
      projectId: PROJECT_ID,
      alertType: 'DOCUMENT_EXPIRING',
      enabled: false,
    };
    vi.mocked(alertRepo.upsertNotificationPreference).mockResolvedValue(pref as never);

    const result = await updatePreference(PROJECT_ID, USER_ID, {
      alertType: 'DOCUMENT_EXPIRING',
      enabled: false,
    });

    expect(alertRepo.upsertNotificationPreference).toHaveBeenCalledWith(USER_ID, PROJECT_ID, {
      alertType: 'DOCUMENT_EXPIRING',
      enabled: false,
    });
    expect(result.enabled).toBe(false);
  });
});
