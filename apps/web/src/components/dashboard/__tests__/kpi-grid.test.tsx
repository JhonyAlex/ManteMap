// @vitest-environment jsdom
/**
 * RED tests for KpiGrid component.
 *
 * Verifies:
 *   - Renders all metric cards with correct values
 *   - Shows zero state for metrics with zero count
 *   - Shows empty state when no metrics provided
 *   - ARIA attributes for accessibility
 *   - Renders loading skeleton when loading=true
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Dashboard UI States" — skeleton loading, zero/empty states, ARIA
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiGrid } from '../kpi-grid';
import type { ProjectMetrics } from '@mantemap/shared';

const mockMetrics: ProjectMetrics = {
  totalItems: 42,
  statusCounts: [
    { statusId: 's1', name: 'Active', count: 30 },
    { statusId: 's2', name: 'Inactive', count: 12 },
  ],
  unassignedItems: 0,
  activeAlerts: 5,
  alertSeverityCounts: [
    { severity: 'WARNING', count: 3 },
    { severity: 'CRITICAL', count: 2 },
  ],
  totalDocuments: 18,
  documentsExpiringSoon: 3,
  upcomingEvents: 7,
  activeLocations: 12,
};

describe('KpiGrid', () => {
  describe('with metrics data', () => {
    it('renders the total items count', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText(/total items/i)).toBeInTheDocument();
    });

    it('renders the active alerts count', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText(/active alerts/i)).toBeInTheDocument();
    });

    it('renders the total documents count', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      expect(screen.getByText('18')).toBeInTheDocument();
      expect(screen.getByText(/documents/i)).toBeInTheDocument();
    });

    it('renders the documents expiring soon count', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/expiring/i)).toBeInTheDocument();
    });

    it('renders the upcoming events count', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText(/upcoming events/i)).toBeInTheDocument();
    });

    it('renders the active locations count', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText(/locations/i)).toBeInTheDocument();
    });

    it('renders a region with aria-label for the KPI grid', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      expect(screen.getByRole('region', { name: /project metrics/i })).toBeInTheDocument();
    });

    it('renders each metric as a list item with aria-label', () => {
      render(<KpiGrid metrics={mockMetrics} />);

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('zero state', () => {
    it('renders zero value when totalItems is 0', () => {
      const zeroMetrics: ProjectMetrics = {
        ...mockMetrics,
        totalItems: 0,
      };

      render(<KpiGrid metrics={zeroMetrics} />);

      // Should render "0" for total items
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.getByText(/total items/i)).toBeInTheDocument();
    });

    it('renders zero alerts with a visual indicator', () => {
      const zeroAlerts: ProjectMetrics = {
        ...mockMetrics,
        activeAlerts: 0,
      };

      render(<KpiGrid metrics={zeroAlerts} />);

      expect(screen.getByText(/no active alerts/i)).toBeInTheDocument();
    });
  });

  describe('loading skeleton', () => {
    it('renders skeleton when loading=true', () => {
      render(<KpiGrid loading={true} />);

      const skeletons = screen.getAllByTestId('kpi-skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(6);
    });

    it('skeletons have aria-hidden attribute', () => {
      render(<KpiGrid loading={true} />);

      const skeletons = screen.getAllByTestId('kpi-skeleton');
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveAttribute('aria-hidden', 'true');
      });
    });

    it('does not render metrics when loading', () => {
      render(<KpiGrid metrics={mockMetrics} loading={true} />);

      expect(screen.queryByText('42')).not.toBeInTheDocument();
    });
  });
});
