import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    alert: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    notificationPreference: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// Import production code — RED until GREEN
import {
  upsertAlert,
  listAlerts,
  getAlertById,
  acknowledgeAlert,
  dismissAlert,
  countUnreadAlerts,
  getNotificationPreferences,
  upsertNotificationPreference,
} from './alert-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const ALERT_ID = 'clalertxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';

const activeAlert = {
  id: ALERT_ID,
  projectId: PROJECT_ID,
  alertType: 'DOCUMENT_EXPIRING',
  severity: 'WARNING',
  status: 'ACTIVE',
  sourceType: 'document',
  sourceId: 'cldocxxxxxxxxxxxxxxxxxxx',
  title: 'Document expiring in 7 days',
  message: null,
  metadata: null,
  acknowledgedAt: null,
  dismissedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const notificationPref = {
  id: 'clprefxxxxxxxxxxxxxxxxxx',
  userId: USER_ID,
  projectId: PROJECT_ID,
  alertType: 'DOCUMENT_EXPIRING',
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// upsertAlert
// ---------------------------------------------------------------------------
describe('upsertAlert', () => {
  const alertData = {
    alertType: 'DOCUMENT_EXPIRING' as const,
    severity: 'WARNING' as const,
    sourceType: 'document',
    sourceId: 'cldocxxxxxxxxxxxxxxxxxxx',
    title: 'Document expiring in 7 days',
  };

  it('creates a new alert when none exists', async () => {
    (db.alert.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(activeAlert);

    const result = await upsertAlert(PROJECT_ID, alertData);

    expect(db.alert.upsert).toHaveBeenCalledWith({
      where: {
        sourceType_sourceId_alertType: {
          sourceType: 'document',
          sourceId: 'cldocxxxxxxxxxxxxxxxxxxx',
          alertType: 'DOCUMENT_EXPIRING',
        },
      },
      create: {
        projectId: PROJECT_ID,
        alertType: 'DOCUMENT_EXPIRING',
        severity: 'WARNING',
        sourceType: 'document',
        sourceId: 'cldocxxxxxxxxxxxxxxxxxxx',
        title: 'Document expiring in 7 days',
        message: undefined,
        metadata: undefined,
      },
      update: {
        severity: 'WARNING',
        title: 'Document expiring in 7 days',
        message: undefined,
        metadata: undefined,
        status: 'ACTIVE',
        acknowledgedAt: null,
        dismissedAt: null,
      },
    });
    expect(result).toEqual(activeAlert);
  });

  it('updates existing alert when duplicate source reference', async () => {
    const updatedAlert = { ...activeAlert, severity: 'CRITICAL' };
    (db.alert.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(updatedAlert);

    const result = await upsertAlert(PROJECT_ID, { ...alertData, severity: 'CRITICAL' });

    expect(result.severity).toBe('CRITICAL');
  });
});

// ---------------------------------------------------------------------------
// listAlerts
// ---------------------------------------------------------------------------
describe('listAlerts', () => {
  it('returns alerts for a project', async () => {
    (db.alert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeAlert]);

    const result = await listAlerts(PROJECT_ID);

    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(result).toHaveLength(1);
  });

  it('applies alertType filter', async () => {
    (db.alert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([activeAlert]);

    await listAlerts(PROJECT_ID, { alertType: 'DOCUMENT_EXPIRING' });

    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, alertType: 'DOCUMENT_EXPIRING' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('applies severity filter', async () => {
    (db.alert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listAlerts(PROJECT_ID, { severity: 'CRITICAL' });

    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, severity: 'CRITICAL' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('applies status filter', async () => {
    (db.alert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listAlerts(PROJECT_ID, { status: 'ACTIVE' });

    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 20,
    });
  });

  it('applies pagination', async () => {
    (db.alert.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listAlerts(PROJECT_ID, {}, { page: 2, pageSize: 10 });

    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
    });
  });
});

// ---------------------------------------------------------------------------
// getAlertById
// ---------------------------------------------------------------------------
describe('getAlertById', () => {
  it('returns alert by id scoped to project', async () => {
    (db.alert.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(activeAlert);

    const result = await getAlertById(PROJECT_ID, ALERT_ID);

    expect(db.alert.findFirst).toHaveBeenCalledWith({
      where: { id: ALERT_ID, projectId: PROJECT_ID },
    });
    expect(result).toEqual(activeAlert);
  });

  it('returns null when alert does not exist', async () => {
    (db.alert.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getAlertById(PROJECT_ID, 'clalert999xxxxxxxxxxxxxxxx');

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// acknowledgeAlert
// ---------------------------------------------------------------------------
describe('acknowledgeAlert', () => {
  it('marks alert as acknowledged', async () => {
    const ackedAlert = { ...activeAlert, status: 'ACKNOWLEDGED', acknowledgedAt: new Date() };
    (db.alert.update as ReturnType<typeof vi.fn>).mockResolvedValue(ackedAlert);

    const result = await acknowledgeAlert(PROJECT_ID, ALERT_ID);

    expect(db.alert.update).toHaveBeenCalledWith({
      where: { id: ALERT_ID, projectId: PROJECT_ID },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: expect.any(Date),
      },
    });
    expect(result.status).toBe('ACKNOWLEDGED');
  });
});

// ---------------------------------------------------------------------------
// dismissAlert
// ---------------------------------------------------------------------------
describe('dismissAlert', () => {
  it('marks alert as dismissed', async () => {
    const dismissedAlert = { ...activeAlert, status: 'DISMISSED', dismissedAt: new Date() };
    (db.alert.update as ReturnType<typeof vi.fn>).mockResolvedValue(dismissedAlert);

    const result = await dismissAlert(PROJECT_ID, ALERT_ID);

    expect(db.alert.update).toHaveBeenCalledWith({
      where: { id: ALERT_ID, projectId: PROJECT_ID },
      data: {
        status: 'DISMISSED',
        dismissedAt: expect.any(Date),
      },
    });
    expect(result.status).toBe('DISMISSED');
  });
});

// ---------------------------------------------------------------------------
// countUnreadAlerts
// ---------------------------------------------------------------------------
describe('countUnreadAlerts', () => {
  it('returns count of active alerts', async () => {
    (db.alert.count as ReturnType<typeof vi.fn>).mockResolvedValue(5);

    const result = await countUnreadAlerts(PROJECT_ID);

    expect(db.alert.count).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, status: 'ACTIVE' },
    });
    expect(result).toBe(5);
  });

  it('returns 0 when no active alerts', async () => {
    (db.alert.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const result = await countUnreadAlerts(PROJECT_ID);

    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getNotificationPreferences
// ---------------------------------------------------------------------------
describe('getNotificationPreferences', () => {
  it('returns preferences for a user in a project', async () => {
    (db.notificationPreference.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      notificationPref,
    ]);

    const result = await getNotificationPreferences(USER_ID, PROJECT_ID);

    expect(db.notificationPreference.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, projectId: PROJECT_ID },
    });
    expect(result).toHaveLength(1);
  });

  it('returns empty array when no preferences exist', async () => {
    (db.notificationPreference.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await getNotificationPreferences(USER_ID, PROJECT_ID);

    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// upsertNotificationPreference
// ---------------------------------------------------------------------------
describe('upsertNotificationPreference', () => {
  it('creates preference when none exists', async () => {
    (db.notificationPreference.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(
      notificationPref
    );

    const result = await upsertNotificationPreference(USER_ID, PROJECT_ID, {
      alertType: 'DOCUMENT_EXPIRING',
      enabled: true,
    });

    expect(db.notificationPreference.upsert).toHaveBeenCalledWith({
      where: {
        userId_projectId_alertType: {
          userId: USER_ID,
          projectId: PROJECT_ID,
          alertType: 'DOCUMENT_EXPIRING',
        },
      },
      create: {
        userId: USER_ID,
        projectId: PROJECT_ID,
        alertType: 'DOCUMENT_EXPIRING',
        enabled: true,
      },
      update: {
        enabled: true,
      },
    });
    expect(result).toEqual(notificationPref);
  });

  it('updates existing preference', async () => {
    const disabledPref = { ...notificationPref, enabled: false };
    (db.notificationPreference.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(disabledPref);

    const result = await upsertNotificationPreference(USER_ID, PROJECT_ID, {
      alertType: 'DOCUMENT_EXPIRING',
      enabled: false,
    });

    expect(result.enabled).toBe(false);
  });
});
