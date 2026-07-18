import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
}));

vi.mock('@/lib/repositories/metrics-repository', () => ({
  countItems: vi.fn(),
  countItemsByStatus: vi.fn(),
  countActiveAlerts: vi.fn(),
  countAlertsBySeverity: vi.fn(),
  countDocuments: vi.fn(),
  countDocumentsExpiringSoon: vi.fn(),
  countUpcomingEvents: vi.fn(),
  countActiveLocations: vi.fn(),
  getRecentItems: vi.fn(),
  getRecentDocumentVersions: vi.fn(),
  getRecentAlerts: vi.fn(),
  getRecentEvents: vi.fn(),
  getItemsForExport: vi.fn(),
  getDocumentsForExport: vi.fn(),
  getAlertsForExport: vi.fn(),
}));

vi.mock('@/lib/services/csv-serializer', () => ({
  toCsv: vi.fn(),
}));

import { requireProjectMember } from '@/lib/services/project-access-service';
import {
  countItems,
  countItemsByStatus,
  countActiveAlerts,
  countAlertsBySeverity,
  countDocuments,
  countDocumentsExpiringSoon,
  countUpcomingEvents,
  countActiveLocations,
  getRecentItems,
  getRecentDocumentVersions,
  getRecentAlerts,
  getRecentEvents,
  getItemsForExport,
  getDocumentsForExport,
  getAlertsForExport,
} from '@/lib/repositories/metrics-repository';
import { toCsv } from '@/lib/services/csv-serializer';

import {
  getProjectMetrics,
  getRecentActivity,
  exportProjectCsv,
} from './metrics-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxxx';
const NOW = new Date('2026-07-18T12:00:00.000Z');

const mockMetrics = {
  totalItems: 10,
  statusCounts: [{ statusId: 's1', name: 'Active', count: 10 }],
  unassignedItems: 0,
  activeAlerts: 3,
  alertSeverityCounts: [{ severity: 'WARNING', count: 3 }],
  totalDocuments: 5,
  documentsExpiringSoon: 1,
  upcomingEvents: 2,
  activeLocations: 4,
};

const mockItems = [
  { id: 'i1', name: 'Pump A', createdAt: new Date('2026-07-18T10:00:00Z'), updatedAt: new Date('2026-07-18T11:00:00Z'), itemType: { name: 'Equipment' }, status: { name: 'Active' } },
];

const mockDocVersions = [
  { id: 'v1', documentId: 'd1', version: 1, fileName: 'spec.pdf', createdAt: new Date('2026-07-18T09:00:00Z'), document: { name: 'Spec doc' } },
];

const mockAlerts = [
  { id: 'a1', title: 'Doc expiring', severity: 'WARNING', createdAt: new Date('2026-07-18T08:00:00Z') },
];

const mockEvents = [
  { id: 'e1', title: 'Maintenance', startAt: new Date('2026-07-20T12:00:00Z'), createdAt: new Date('2026-07-18T07:00:00Z') },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// getProjectMetrics
// ---------------------------------------------------------------------------
describe('getProjectMetrics', () => {
  it('requires project membership before fetching metrics', async () => {
    vi.mocked(requireProjectMember).mockRejectedValue(new NotFoundError('Project', PROJECT_ID));

    await expect(getProjectMetrics(PROJECT_ID, USER_ID)).rejects.toThrow(NotFoundError);
    expect(requireProjectMember).toHaveBeenCalledWith(PROJECT_ID, USER_ID);
  });

  it('returns aggregated metrics for an authorized member', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(countItems).mockResolvedValue(mockMetrics.totalItems);
    vi.mocked(countItemsByStatus).mockResolvedValue(mockMetrics.statusCounts);
    vi.mocked(countActiveAlerts).mockResolvedValue(mockMetrics.activeAlerts);
    vi.mocked(countAlertsBySeverity).mockResolvedValue(mockMetrics.alertSeverityCounts);
    vi.mocked(countDocuments).mockResolvedValue(mockMetrics.totalDocuments);
    vi.mocked(countDocumentsExpiringSoon).mockResolvedValue(mockMetrics.documentsExpiringSoon);
    vi.mocked(countUpcomingEvents).mockResolvedValue(mockMetrics.upcomingEvents);
    vi.mocked(countActiveLocations).mockResolvedValue(mockMetrics.activeLocations);

    const result = await getProjectMetrics(PROJECT_ID, USER_ID);

    expect(result.totalItems).toBe(10);
    expect(result.statusCounts).toEqual(mockMetrics.statusCounts);
    expect(result.activeAlerts).toBe(3);
    expect(result.alertSeverityCounts).toEqual(mockMetrics.alertSeverityCounts);
    expect(result.totalDocuments).toBe(5);
    expect(result.documentsExpiringSoon).toBe(1);
    expect(result.upcomingEvents).toBe(2);
    expect(result.activeLocations).toBe(4);
  });

  it('computes unassignedItems as totalItems minus sum of status counts', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(countItems).mockResolvedValue(10);
    vi.mocked(countItemsByStatus).mockResolvedValue([
      { statusId: 's1', name: 'Active', count: 7 },
    ]);
    vi.mocked(countActiveAlerts).mockResolvedValue(0);
    vi.mocked(countAlertsBySeverity).mockResolvedValue([]);
    vi.mocked(countDocuments).mockResolvedValue(0);
    vi.mocked(countDocumentsExpiringSoon).mockResolvedValue(0);
    vi.mocked(countUpcomingEvents).mockResolvedValue(0);
    vi.mocked(countActiveLocations).mockResolvedValue(0);

    const result = await getProjectMetrics(PROJECT_ID, USER_ID);

    // totalItems(10) - sum(statusCounts)(7) = 3 unassigned
    expect(result.unassignedItems).toBe(3);
  });

  it('passes now parameter for time-windowed queries', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(countItems).mockResolvedValue(0);
    vi.mocked(countItemsByStatus).mockResolvedValue([]);
    vi.mocked(countActiveAlerts).mockResolvedValue(0);
    vi.mocked(countAlertsBySeverity).mockResolvedValue([]);
    vi.mocked(countDocuments).mockResolvedValue(0);
    vi.mocked(countDocumentsExpiringSoon).mockResolvedValue(0);
    vi.mocked(countUpcomingEvents).mockResolvedValue(0);
    vi.mocked(countActiveLocations).mockResolvedValue(0);

    await getProjectMetrics(PROJECT_ID, USER_ID);

    expect(countDocumentsExpiringSoon).toHaveBeenCalledWith(PROJECT_ID, NOW);
    expect(countUpcomingEvents).toHaveBeenCalledWith(PROJECT_ID, NOW);
  });
});

// ---------------------------------------------------------------------------
// getRecentActivity
// ---------------------------------------------------------------------------
describe('getRecentActivity', () => {
  it('requires project membership', async () => {
    vi.mocked(requireProjectMember).mockRejectedValue(new NotFoundError('Project', PROJECT_ID));

    await expect(getRecentActivity(PROJECT_ID, USER_ID)).rejects.toThrow(NotFoundError);
  });

  it('merges activity from all four sources, ordered newest-first', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getRecentItems).mockResolvedValue(mockItems);
    vi.mocked(getRecentDocumentVersions).mockResolvedValue(mockDocVersions);
    vi.mocked(getRecentAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(getRecentEvents).mockResolvedValue(mockEvents);

    const result = await getRecentActivity(PROJECT_ID, USER_ID, 10);

    expect(result.length).toBe(4);
    // Should be ordered by timestamp descending
    expect(result[0].kind).toBe('item_created');       // 10:00
    expect(result[1].kind).toBe('document_uploaded');   // 09:00
    expect(result[2].kind).toBe('alert_created');       // 08:00
    expect(result[3].kind).toBe('event_created');       // 07:00
  });

  it('normalizes items as item_created kind', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getRecentItems).mockResolvedValue(mockItems);
    vi.mocked(getRecentDocumentVersions).mockResolvedValue([]);
    vi.mocked(getRecentAlerts).mockResolvedValue([]);
    vi.mocked(getRecentEvents).mockResolvedValue([]);

    const result = await getRecentActivity(PROJECT_ID, USER_ID, 10);

    expect(result[0]).toEqual({
      id: 'i1',
      kind: 'item_created',
      title: 'Pump A',
      href: `/projects/${PROJECT_ID}/items/i1`,
      timestamp: mockItems[0].createdAt,
    });
  });

  it('normalizes document versions as document_uploaded kind', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getRecentItems).mockResolvedValue([]);
    vi.mocked(getRecentDocumentVersions).mockResolvedValue(mockDocVersions);
    vi.mocked(getRecentAlerts).mockResolvedValue([]);
    vi.mocked(getRecentEvents).mockResolvedValue([]);

    const result = await getRecentActivity(PROJECT_ID, USER_ID, 10);

    expect(result[0]).toEqual({
      id: 'v1',
      kind: 'document_uploaded',
      title: 'Spec doc',
      href: `/projects/${PROJECT_ID}/documents/d1`,
      timestamp: mockDocVersions[0].createdAt,
    });
  });

  it('normalizes alerts as alert_created kind', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getRecentItems).mockResolvedValue([]);
    vi.mocked(getRecentDocumentVersions).mockResolvedValue([]);
    vi.mocked(getRecentAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(getRecentEvents).mockResolvedValue([]);

    const result = await getRecentActivity(PROJECT_ID, USER_ID, 10);

    expect(result[0]).toEqual({
      id: 'a1',
      kind: 'alert_created',
      title: 'Doc expiring',
      href: `/projects/${PROJECT_ID}/alerts`,
      timestamp: mockAlerts[0].createdAt,
    });
  });

  it('normalizes events as event_created kind', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getRecentItems).mockResolvedValue([]);
    vi.mocked(getRecentDocumentVersions).mockResolvedValue([]);
    vi.mocked(getRecentAlerts).mockResolvedValue([]);
    vi.mocked(getRecentEvents).mockResolvedValue(mockEvents);

    const result = await getRecentActivity(PROJECT_ID, USER_ID, 10);

    expect(result[0]).toEqual({
      id: 'e1',
      kind: 'event_created',
      title: 'Maintenance',
      href: `/projects/${PROJECT_ID}/events/e1`,
      timestamp: mockEvents[0].createdAt,
    });
  });

  it('caps merged results to the requested limit', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    // Return 5 items per source = 20 total, but cap at 3
    const manyItems = Array.from({ length: 5 }, (_, i) => ({
      ...mockItems[0],
      id: `i${i}`,
      name: `Item ${i}`,
      createdAt: new Date(`2026-07-18T1${i}:00:00Z`),
    }));
    vi.mocked(getRecentItems).mockResolvedValue(manyItems);
    vi.mocked(getRecentDocumentVersions).mockResolvedValue([]);
    vi.mocked(getRecentAlerts).mockResolvedValue([]);
    vi.mocked(getRecentEvents).mockResolvedValue([]);

    const result = await getRecentActivity(PROJECT_ID, USER_ID, 3);

    expect(result.length).toBe(3);
  });

  it('returns empty array when no activity exists', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getRecentItems).mockResolvedValue([]);
    vi.mocked(getRecentDocumentVersions).mockResolvedValue([]);
    vi.mocked(getRecentAlerts).mockResolvedValue([]);
    vi.mocked(getRecentEvents).mockResolvedValue([]);

    const result = await getRecentActivity(PROJECT_ID, USER_ID, 10);

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// exportProjectCsv
// ---------------------------------------------------------------------------
describe('exportProjectCsv', () => {
  it('requires project membership', async () => {
    vi.mocked(requireProjectMember).mockRejectedValue(new NotFoundError('Project', PROJECT_ID));

    await expect(exportProjectCsv(PROJECT_ID, USER_ID, 'items')).rejects.toThrow(NotFoundError);
  });

  it('exports items as CSV', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getItemsForExport).mockResolvedValue([
      { id: 'i1', name: 'Pump A', createdAt: new Date(), itemType: { name: 'Equipment' }, status: { name: 'Active' }, location: { name: 'Building A' } },
    ]);
    vi.mocked(toCsv).mockReturnValue('"Name","Type","Status","Location","Created At"\r\n"Pump A","Equipment","Active","Building A","2026-07-18"');

    const result = await exportProjectCsv(PROJECT_ID, USER_ID, 'items');

    expect(getItemsForExport).toHaveBeenCalledWith(PROJECT_ID);
    expect(toCsv).toHaveBeenCalled();
    expect(result).toContain('Pump A');
  });

  it('exports documents as CSV', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getDocumentsForExport).mockResolvedValue([
      { id: 'd1', name: 'Spec', mimeType: 'application/pdf', sizeBytes: 1024, expiresAt: null, createdAt: new Date(), item: { name: 'Pump A' } },
    ]);
    vi.mocked(toCsv).mockReturnValue('"Name","Item","MIME Type","Size (bytes)","Expires At","Created At"\r\n"Spec","Pump A","application/pdf","1024","","2026-07-18"');

    const result = await exportProjectCsv(PROJECT_ID, USER_ID, 'documents');

    expect(getDocumentsForExport).toHaveBeenCalledWith(PROJECT_ID);
    expect(toCsv).toHaveBeenCalled();
    expect(result).toContain('Spec');
  });

  it('exports alerts as CSV', async () => {
    vi.mocked(requireProjectMember).mockResolvedValue(undefined as never);
    vi.mocked(getAlertsForExport).mockResolvedValue([
      { id: 'a1', alertType: 'DOCUMENT_EXPIRING', severity: 'WARNING', status: 'ACTIVE', title: 'Doc expiring', createdAt: new Date() },
    ]);
    vi.mocked(toCsv).mockReturnValue('"Type","Severity","Status","Title","Created At"\r\n"DOCUMENT_EXPIRING","WARNING","ACTIVE","Doc expiring","2026-07-18"');

    const result = await exportProjectCsv(PROJECT_ID, USER_ID, 'alerts');

    expect(getAlertsForExport).toHaveBeenCalledWith(PROJECT_ID);
    expect(toCsv).toHaveBeenCalled();
    expect(result).toContain('Doc expiring');
  });
});
