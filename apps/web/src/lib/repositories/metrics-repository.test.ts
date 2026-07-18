import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    item: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    document: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    documentVersion: {
      findMany: vi.fn(),
    },
    alert: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    event: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    location: {
      count: vi.fn(),
    },
    status: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// Import production code — RED until GREEN
import {
  countItems,
  countItemsByStatus,
  countActiveAlerts,
  countAlertsBySeverity,
  countDocuments,
  countDocumentsExpiringSoon,
  countUpcomingEvents,
  countActiveLocations,
  getStatusesForProject,
  getRecentItems,
  getRecentDocumentVersions,
  getRecentAlerts,
  getRecentEvents,
  getItemsForExport,
  getDocumentsForExport,
  getAlertsForExport,
} from './metrics-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const NOW = new Date('2026-07-18T12:00:00.000Z');

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// countItems
// ---------------------------------------------------------------------------
describe('countItems', () => {
  it('counts items belonging to item types of a project', async () => {
    db.item.count.mockResolvedValue(42);

    const result = await countItems(PROJECT_ID);

    expect(db.item.count).toHaveBeenCalledWith({
      where: { itemType: { projectId: PROJECT_ID } },
    });
    expect(result).toBe(42);
  });

  it('returns 0 when no items exist', async () => {
    db.item.count.mockResolvedValue(0);

    const result = await countItems(PROJECT_ID);

    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// countItemsByStatus
// ---------------------------------------------------------------------------
describe('countItemsByStatus', () => {
  it('returns grouped status counts with status names', async () => {
    db.status.findMany.mockResolvedValue([
      { id: 's1', name: 'Active' },
      { id: 's2', name: 'Inactive' },
    ]);
    db.item.groupBy.mockResolvedValue([
      { statusId: 's1', _count: { _all: 10 } },
      { statusId: 's2', _count: { _all: 5 } },
    ]);

    const result = await countItemsByStatus(PROJECT_ID);

    expect(result).toEqual([
      { statusId: 's1', name: 'Active', count: 10 },
      { statusId: 's2', name: 'Inactive', count: 5 },
    ]);
  });

  it('includes items with null statusId as unassigned', async () => {
    db.status.findMany.mockResolvedValue([{ id: 's1', name: 'Active' }]);
    db.item.groupBy.mockResolvedValue([
      { statusId: 's1', _count: { _all: 10 } },
      { statusId: null, _count: { _all: 3 } },
    ]);

    const result = await countItemsByStatus(PROJECT_ID);

    expect(result).toContainEqual({ statusId: '__unassigned__', name: 'Unassigned', count: 3 });
  });

  it('returns empty array when no items exist', async () => {
    db.status.findMany.mockResolvedValue([]);
    db.item.groupBy.mockResolvedValue([]);

    const result = await countItemsByStatus(PROJECT_ID);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// countActiveAlerts
// ---------------------------------------------------------------------------
describe('countActiveAlerts', () => {
  it('counts alerts with ACTIVE status for the project', async () => {
    db.alert.count.mockResolvedValue(7);

    const result = await countActiveAlerts(PROJECT_ID);

    expect(db.alert.count).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, status: 'ACTIVE' },
    });
    expect(result).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// countAlertsBySeverity
// ---------------------------------------------------------------------------
describe('countAlertsBySeverity', () => {
  it('returns grouped severity counts for active alerts', async () => {
    db.alert.groupBy.mockResolvedValue([
      { severity: 'CRITICAL', _count: { _all: 2 } },
      { severity: 'WARNING', _count: { _all: 5 } },
    ]);

    const result = await countAlertsBySeverity(PROJECT_ID);

    expect(db.alert.groupBy).toHaveBeenCalledWith({
      by: ['severity'],
      where: { projectId: PROJECT_ID, status: 'ACTIVE' },
      _count: { _all: true },
    });
    expect(result).toEqual([
      { severity: 'CRITICAL', count: 2 },
      { severity: 'WARNING', count: 5 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// countDocuments
// ---------------------------------------------------------------------------
describe('countDocuments', () => {
  it('counts documents belonging to items of a project', async () => {
    db.document.count.mockResolvedValue(15);

    const result = await countDocuments(PROJECT_ID);

    expect(db.document.count).toHaveBeenCalledWith({
      where: { item: { itemType: { projectId: PROJECT_ID } } },
    });
    expect(result).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// countDocumentsExpiringSoon
// ---------------------------------------------------------------------------
describe('countDocumentsExpiringSoon', () => {
  it('counts documents expiring within 30 days from now', async () => {
    db.document.count.mockResolvedValue(3);

    const result = await countDocumentsExpiringSoon(PROJECT_ID, NOW);

    expect(db.document.count).toHaveBeenCalledWith({
      where: {
        item: { itemType: { projectId: PROJECT_ID } },
        expiresAt: { gte: NOW, lte: expect.any(Date) },
      },
    });
    expect(result).toBe(3);
  });

  it('excludes already expired documents', async () => {
    db.document.count.mockResolvedValue(0);

    await countDocumentsExpiringSoon(PROJECT_ID, NOW);

    const callArgs = db.document.count.mock.calls[0][0];
    expect(callArgs.where.expiresAt.gte).toEqual(NOW);
  });
});

// ---------------------------------------------------------------------------
// countUpcomingEvents
// ---------------------------------------------------------------------------
describe('countUpcomingEvents', () => {
  it('counts events starting within 7 days from now', async () => {
    db.event.count.mockResolvedValue(4);

    const result = await countUpcomingEvents(PROJECT_ID, NOW);

    expect(db.event.count).toHaveBeenCalledWith({
      where: {
        projectId: PROJECT_ID,
        startAt: { gte: NOW, lte: expect.any(Date) },
      },
    });
    expect(result).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// countActiveLocations
// ---------------------------------------------------------------------------
describe('countActiveLocations', () => {
  it('counts active locations for the project', async () => {
    db.location.count.mockResolvedValue(8);

    const result = await countActiveLocations(PROJECT_ID);

    expect(db.location.count).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID, active: true },
    });
    expect(result).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// getStatusesForProject
// ---------------------------------------------------------------------------
describe('getStatusesForProject', () => {
  it('returns all statuses for item types of the project', async () => {
    db.status.findMany.mockResolvedValue([
      { id: 's1', name: 'Active' },
      { id: 's2', name: 'Inactive' },
    ]);

    const result = await getStatusesForProject(PROJECT_ID);

    expect(db.status.findMany).toHaveBeenCalledWith({
      where: { itemType: { projectId: PROJECT_ID } },
    });
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Activity projections: getRecentItems, getRecentDocumentVersions, getRecentAlerts, getRecentEvents
// ---------------------------------------------------------------------------
describe('getRecentItems', () => {
  it('returns recent items with type and status info', async () => {
    const items = [
      { id: 'i1', name: 'Pump A', createdAt: new Date(), updatedAt: new Date(), itemType: { name: 'Equipment' }, status: { name: 'Active' } },
    ];
    db.item.findMany.mockResolvedValue(items);

    const result = await getRecentItems(PROJECT_ID, 5);

    expect(db.item.findMany).toHaveBeenCalledWith({
      where: { itemType: { projectId: PROJECT_ID } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { itemType: { select: { name: true } }, status: { select: { name: true } } },
    });
    expect(result).toEqual(items);
  });
});

describe('getRecentDocumentVersions', () => {
  it('returns recent document versions with document info', async () => {
    const versions = [
      { id: 'v1', documentId: 'd1', version: 1, fileName: 'spec.pdf', createdAt: new Date(), document: { name: 'Spec doc' } },
    ];
    db.documentVersion.findMany.mockResolvedValue(versions);

    const result = await getRecentDocumentVersions(PROJECT_ID, 5);

    expect(db.documentVersion.findMany).toHaveBeenCalledWith({
      where: { document: { item: { itemType: { projectId: PROJECT_ID } } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { document: { select: { name: true } } },
    });
    expect(result).toEqual(versions);
  });
});

describe('getRecentAlerts', () => {
  it('returns recent alerts for the project', async () => {
    const alerts = [
      { id: 'a1', title: 'Doc expiring', severity: 'WARNING', createdAt: new Date() },
    ];
    db.alert.findMany.mockResolvedValue(alerts);

    const result = await getRecentAlerts(PROJECT_ID, 5);

    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    expect(result).toEqual(alerts);
  });
});

describe('getRecentEvents', () => {
  it('returns recent events for the project', async () => {
    const events = [
      { id: 'e1', title: 'Maintenance', startAt: new Date(), createdAt: new Date() },
    ];
    db.event.findMany.mockResolvedValue(events);

    const result = await getRecentEvents(PROJECT_ID, 5);

    expect(db.event.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    expect(result).toEqual(events);
  });
});

// ---------------------------------------------------------------------------
// Report projections: getItemsForExport, getDocumentsForExport, getAlertsForExport
// ---------------------------------------------------------------------------
describe('getItemsForExport', () => {
  it('returns items with type, status, and location for export', async () => {
    const items = [
      { id: 'i1', name: 'Pump A', createdAt: new Date(), itemType: { name: 'Equipment' }, status: { name: 'Active' }, location: { name: 'Building A' } },
    ];
    db.item.findMany.mockResolvedValue(items);

    const result = await getItemsForExport(PROJECT_ID);

    expect(db.item.findMany).toHaveBeenCalledWith({
      where: { itemType: { projectId: PROJECT_ID } },
      include: {
        itemType: { select: { name: true } },
        status: { select: { name: true } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(items);
  });
});

describe('getDocumentsForExport', () => {
  it('returns documents with item info for export', async () => {
    const docs = [
      { id: 'd1', name: 'Spec', mimeType: 'application/pdf', sizeBytes: 1024, expiresAt: null, createdAt: new Date(), item: { name: 'Pump A' } },
    ];
    db.document.findMany.mockResolvedValue(docs);

    const result = await getDocumentsForExport(PROJECT_ID);

    expect(db.document.findMany).toHaveBeenCalledWith({
      where: { item: { itemType: { projectId: PROJECT_ID } } },
      include: { item: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(docs);
  });
});

describe('getAlertsForExport', () => {
  it('returns alerts for export', async () => {
    const alerts = [
      { id: 'a1', alertType: 'DOCUMENT_EXPIRING', severity: 'WARNING', status: 'ACTIVE', title: 'Doc expiring', createdAt: new Date() },
    ];
    db.alert.findMany.mockResolvedValue(alerts);

    const result = await getAlertsForExport(PROJECT_ID);

    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { projectId: PROJECT_ID },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(alerts);
  });
});
