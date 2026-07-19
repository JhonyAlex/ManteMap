// @vitest-environment jsdom
/**
 * RED tests for ProjectSummaryCard component.
 *
 * Verifies:
 *   - Renders project name and code
 *   - Shows item count, alert count, expiring doc count
 *   - Links to project dashboard
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Cross-Project Summary Dashboard" — per-project summaries
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectSummaryCard } from '../project-summary-card';

describe('ProjectSummaryCard', () => {
  const defaultProps = {
    projectCode: 'ALPHA',
    projectName: 'Alpha Project',
    totalItems: 42,
    activeAlerts: 3,
    documentsExpiringSoon: 2,
  };

  it('renders the project name', () => {
    render(<ProjectSummaryCard {...defaultProps} />);

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
  });

  it('renders the project code', () => {
    render(<ProjectSummaryCard {...defaultProps} />);

    expect(screen.getByText('ALPHA')).toBeInTheDocument();
  });

  it('renders the total items count', () => {
    render(<ProjectSummaryCard {...defaultProps} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/items/i)).toBeInTheDocument();
  });

  it('renders the active alerts count', () => {
    render(<ProjectSummaryCard {...defaultProps} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText(/alerts/i)).toBeInTheDocument();
  });

  it('renders the expiring documents count', () => {
    render(<ProjectSummaryCard {...defaultProps} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/expiring/i)).toBeInTheDocument();
  });

  it('links to the project dashboard', () => {
    render(<ProjectSummaryCard {...defaultProps} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/projects/ALPHA/dashboard');
  });

  it('renders zero counts', () => {
    render(
      <ProjectSummaryCard
        {...defaultProps}
        totalItems={0}
        activeAlerts={0}
        documentsExpiringSoon={0}
      />
    );

    // All three metrics show 0
    const zeros = screen.getAllByText('0');
    expect(zeros).toHaveLength(3);
  });
});
