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

import { Breadcrumbs } from './breadcrumbs';
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
