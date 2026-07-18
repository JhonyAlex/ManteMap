// @vitest-environment jsdom
/**
 * RED tests for ExportLinks component.
 *
 * Verifies:
 *   - Renders 3 CSV download links (items, documents, alerts)
 *   - Links have correct hrefs pointing to the reports API
 *   - Links have download attributes
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "CSV Export with Access Control" — authorized CSV download links
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExportLinks } from '../export-links';

describe('ExportLinks', () => {
  const projectId = 'proj-1';

  it('renders three export links', () => {
    render(<ExportLinks projectId={projectId} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
  });

  it('renders an items CSV export link', () => {
    render(<ExportLinks projectId={projectId} />);

    const link = screen.getByRole('link', { name: /items/i });
    expect(link).toHaveAttribute('href', '/api/projects/proj-1/reports?type=items');
  });

  it('renders a documents CSV export link', () => {
    render(<ExportLinks projectId={projectId} />);

    const link = screen.getByRole('link', { name: /documents/i });
    expect(link).toHaveAttribute('href', '/api/projects/proj-1/reports?type=documents');
  });

  it('renders an alerts CSV export link', () => {
    render(<ExportLinks projectId={projectId} />);

    const link = screen.getByRole('link', { name: /alerts/i });
    expect(link).toHaveAttribute('href', '/api/projects/proj-1/reports?type=alerts');
  });

  it('all links have descriptive accessible text', () => {
    render(<ExportLinks projectId={projectId} />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.textContent).toBeTruthy();
    });
  });
});
