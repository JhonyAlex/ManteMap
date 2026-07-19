// @vitest-environment jsdom
/**
 * RED tests for Breadcrumbs component.
 *
 * Verifies:
 *   - Renders breadcrumb items from pathname segments
 *   - Uses nav landmark with aria-label
 *   - Uses ordered list for breadcrumb items
 *   - Last item is marked as current page
 *   - Handles dashboard-only path
 *
 * Spec: specs/application-shell/spec.md — "Responsive and accessible navigation"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, within } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

import { Breadcrumbs, pathToBreadcrumbs } from './breadcrumbs';
import { usePathname } from 'next/navigation';

const mockUsePathname = usePathname as Mock;

describe('Breadcrumbs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a nav landmark with accessible label', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Breadcrumbs />);

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('renders breadcrumb items for path segments', () => {
    mockUsePathname.mockReturnValue('/projects/proj-1');
    render(<Breadcrumbs />);

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    const listItems = within(nav).getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThanOrEqual(2);
  });

  it('marks the last breadcrumb as the current page', () => {
    mockUsePathname.mockReturnValue('/projects/proj-1');
    render(<Breadcrumbs />);

    const currentItem = screen.getByText('Proj 1');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
  });

  it('renders at least a dashboard root item', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Breadcrumbs />);

    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
  });

  it('uses an ordered list for breadcrumb structure', () => {
    mockUsePathname.mockReturnValue('/projects/proj-1');
    render(<Breadcrumbs />);

    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(nav).getByRole('list')).toBeInTheDocument();
  });

  it('breadcrumb links have focus-visible styling classes', () => {
    mockUsePathname.mockReturnValue('/projects/proj-1');
    render(<Breadcrumbs />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      expect(link.className).toMatch(/focus-visible/);
    });
  });

  it('current page item is not a link', () => {
    mockUsePathname.mockReturnValue('/projects/proj-1');
    render(<Breadcrumbs />);

    const currentItem = screen.getByText('Proj 1');
    expect(currentItem.tagName).toBe('SPAN');
    expect(currentItem).toHaveAttribute('aria-current', 'page');
  });

  it('breadcrumb links include reduced-motion override for transition-colors', () => {
    mockUsePathname.mockReturnValue('/projects/proj-1');
    render(<Breadcrumbs />);

    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      const cls = link.className;
      if (cls.includes('transition-colors')) {
        expect(cls).toContain('motion-reduce:transition-none');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Unit tests: pathToBreadcrumbs with entity maps
// ---------------------------------------------------------------------------

describe('pathToBreadcrumbs — entity map resolution', () => {
  const entityMaps = {
    floorPlans: { 'fp-001': 'Ground Floor', 'fp-002': 'First Floor' },
    items: { 'item-abc': 'Fire Extinguisher A-12', 'item-def': 'Boiler B-3' },
    itemTypes: { 'it-ext': 'Fire Equipment', 'it-hvac': 'HVAC' },
    locations: { 'loc-1': 'Building A', 'loc-2': 'Warehouse' },
    events: { 'ev-100': 'Quarterly Inspection', 'ev-200': 'Maintenance' },
  };

  it('resolves a floor plan segment using floorPlans map', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1/floor-plans/fp-001',
      { 'proj-1': 'My Project' },
      entityMaps
    );

    // 0: Dashboard, 1: My Project, 2: Floor plans, 3: Ground Floor
    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'My Project',
      'Floor plans',
      'Ground Floor',
    ]);
  });

  it('resolves an item segment using items map', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1/items/item-abc',
      { 'proj-1': 'My Project' },
      entityMaps
    );

    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'My Project',
      'Items',
      'Fire Extinguisher A-12',
    ]);
  });

  it('resolves an item type segment using itemTypes map', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1/item-types/it-ext',
      { 'proj-1': 'My Project' },
      entityMaps
    );

    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'My Project',
      'Item types',
      'Fire Equipment',
    ]);
  });

  it('resolves a location segment using locations map', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1/locations/loc-1',
      { 'proj-1': 'My Project' },
      entityMaps
    );

    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'My Project',
      'Locations',
      'Building A',
    ]);
  });

  it('resolves an event segment using events map', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1/calendar/ev-100',
      { 'proj-1': 'My Project' },
      entityMaps
    );

    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'My Project',
      'Calendar',
      'Quarterly Inspection',
    ]);
  });

  it('falls back to raw segment when no map matches', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1/unknown-segment',
      { 'proj-1': 'My Project' },
      entityMaps
    );

    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'My Project',
      'Unknown segment',
    ]);
  });

  it('preserves backward compat without entityMaps (projectNames only)', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1',
      { 'proj-1': 'Alpha Project' }
    );

    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'Alpha Project',
    ]);
  });

  it('falls back to raw segment without any maps', () => {
    const result = pathToBreadcrumbs('/dashboard/settings');

    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'Settings',
    ]);
  });

  it('handles empty entityMaps (no entries in any map)', () => {
    const result = pathToBreadcrumbs(
      '/dashboard/projects/proj-1/items/item-xyz',
      { 'proj-1': 'My Project' },
      { floorPlans: {}, items: {}, itemTypes: {}, locations: {}, events: {} }
    );

    // item-xyz not in empty items map → falls back to raw formatting
    expect(result.map((b) => b.label)[3]).toBe('Item xyz');
  });

  it('projectNames takes priority over entityMaps for same key', () => {
    // Simulate key collision: same ID in both projectNames and items map
    const result = pathToBreadcrumbs(
      '/dashboard/projects/dual-key',
      { 'dual-key': 'Project Alpha' },
      { items: { 'dual-key': 'Some Item' } }
    );

    // projectNames is checked first, so Project Alpha wins
    expect(result.map((b) => b.label)).toEqual([
      'Dashboard',
      'Project Alpha',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Component tests: hideOnProjectRoutes / entityMaps rendering
// ---------------------------------------------------------------------------

describe('Breadcrumbs — hideOnProjectRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders normally on non-project route', () => {
    mockUsePathname.mockReturnValue('/dashboard');
    render(<Breadcrumbs hideOnProjectRoutes />);

    expect(
      screen.getByRole('navigation', { name: /breadcrumb/i })
    ).toBeInTheDocument();
  });

  it('returns null on project route with hideOnProjectRoutes', () => {
    mockUsePathname.mockReturnValue('/dashboard/projects/proj-1');
    const { container } = render(<Breadcrumbs hideOnProjectRoutes />);

    // When hideOnProjectRoutes is set and on a project route, component returns null
    expect(
      screen.queryByRole('navigation', { name: /breadcrumb/i })
    ).toBeNull();
    expect(container.innerHTML).toBe('');
  });

  it('renders on project route when hideOnProjectRoutes is not set', () => {
    mockUsePathname.mockReturnValue('/dashboard/projects/proj-1');
    render(<Breadcrumbs projectNames={{ 'proj-1': 'My Project' }} />);

    expect(
      screen.getByRole('navigation', { name: /breadcrumb/i })
    ).toBeInTheDocument();
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });
});
