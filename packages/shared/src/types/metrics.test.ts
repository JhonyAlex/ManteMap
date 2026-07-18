/**
 * RED tests for metrics types.
 *
 * These tests verify:
 *   - ActivityKind accepts all five valid values
 *   - ReportType accepts all three valid values
 *   - ActivityEntry object shape compiles and holds values
 *   - ProjectMetrics object shape compiles and holds values
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Interfaces / Contracts" section
 * Tasks: openspec/changes/phase-9-dashboard-reports/tasks.md
 *   1.8 RED+GREEN: packages/shared/src/types/metrics.ts + test
 */

import { describe, it, expect } from 'vitest';
import type {
  ActivityKind,
  ActivityEntry,
  ProjectMetrics,
  ReportType,
} from './metrics';
import { ACTIVITY_KINDS, REPORT_TYPES } from './metrics';

describe('ActivityKind', () => {
  it('accepts all five valid values', () => {
    const kinds: ActivityKind[] = [
      'item_created',
      'item_updated',
      'document_uploaded',
      'alert_created',
      'event_created',
    ];
    expect(kinds).toHaveLength(5);
  });

  it('exports ACTIVITY_KINDS constant with all five values', () => {
    expect(ACTIVITY_KINDS).toEqual([
      'item_created',
      'item_updated',
      'document_uploaded',
      'alert_created',
      'event_created',
    ]);
  });
});

describe('ReportType', () => {
  it('accepts all three valid values', () => {
    const types: ReportType[] = ['items', 'documents', 'alerts'];
    expect(types).toHaveLength(3);
  });

  it('exports REPORT_TYPES constant with all three values', () => {
    expect(REPORT_TYPES).toEqual(['items', 'documents', 'alerts']);
  });
});

describe('ActivityEntry', () => {
  it('holds the expected shape', () => {
    const entry: ActivityEntry = {
      id: 'entry-1',
      kind: 'item_created',
      title: 'New pump installed',
      href: '/projects/proj-1/items/item-1',
      timestamp: new Date('2026-07-18T10:00:00Z'),
    };
    expect(entry.id).toBe('entry-1');
    expect(entry.kind).toBe('item_created');
    expect(entry.title).toBe('New pump installed');
    expect(entry.href).toBe('/projects/proj-1/items/item-1');
    expect(entry.timestamp).toBeInstanceOf(Date);
  });
});

describe('ProjectMetrics', () => {
  it('holds the expected shape with all metric groups', () => {
    const metrics: ProjectMetrics = {
      totalItems: 42,
      statusCounts: [
        { statusId: 's1', name: 'Active', count: 30 },
        { statusId: 's2', name: 'Inactive', count: 12 },
      ],
      unassignedItems: 3,
      activeAlerts: 5,
      alertSeverityCounts: [
        { severity: 'CRITICAL', count: 1 },
        { severity: 'WARNING', count: 4 },
      ],
      totalDocuments: 18,
      documentsExpiringSoon: 2,
      upcomingEvents: 4,
      activeLocations: 7,
    };
    expect(metrics.totalItems).toBe(42);
    expect(metrics.statusCounts).toHaveLength(2);
    expect(metrics.unassignedItems).toBe(3);
    expect(metrics.activeAlerts).toBe(5);
    expect(metrics.alertSeverityCounts).toHaveLength(2);
    expect(metrics.totalDocuments).toBe(18);
    expect(metrics.documentsExpiringSoon).toBe(2);
    expect(metrics.upcomingEvents).toBe(4);
    expect(metrics.activeLocations).toBe(7);
  });
});
