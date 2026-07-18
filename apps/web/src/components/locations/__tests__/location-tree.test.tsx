// @vitest-environment jsdom
/**
 * Tests for LocationTree component.
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Tree endpoint" — renders hierarchical tree with expand/collapse
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Hierarchical location tree component"
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LocationTree } from '../location-tree';
import type { TreeNode } from '@/lib/repositories/location-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const flatTree: TreeNode[] = [
  {
    id: 'loc-1',
    projectId: 'proj-1',
    parentId: null,
    name: 'Center A',
    level: 0,
    order: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    children: [
      {
        id: 'loc-2',
        projectId: 'proj-1',
        parentId: 'loc-1',
        name: 'Building B',
        level: 1,
        order: 0,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [
          {
            id: 'loc-3',
            projectId: 'proj-1',
            parentId: 'loc-2',
            name: 'Floor 1',
            level: 2,
            order: 0,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            children: [],
          },
        ],
      },
      {
        id: 'loc-4',
        projectId: 'proj-1',
        parentId: 'loc-1',
        name: 'Building C',
        level: 1,
        order: 1,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        children: [],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationTree', () => {
  it('renders root locations', () => {
    render(<LocationTree tree={flatTree} projectId="proj-1" />);

    expect(screen.getByText('Center A')).toBeInTheDocument();
  });

  it('renders children when expanded', () => {
    render(<LocationTree tree={flatTree} projectId="proj-1" defaultExpanded />);

    expect(screen.getByText('Building B')).toBeInTheDocument();
    expect(screen.getByText('Building C')).toBeInTheDocument();
  });

  it('renders deeply nested children when expanded', () => {
    render(<LocationTree tree={flatTree} projectId="proj-1" defaultExpanded />);

    expect(screen.getByText('Floor 1')).toBeInTheDocument();
  });

  it('toggles expand/collapse on click', () => {
    render(<LocationTree tree={flatTree} projectId="proj-1" />);

    // Initially collapsed — children not visible
    expect(screen.queryByText('Building B')).not.toBeInTheDocument();

    // Click to expand
    const expandButton = screen.getByLabelText('Expand Center A');
    fireEvent.click(expandButton);

    expect(screen.getByText('Building B')).toBeInTheDocument();
  });

  it('calls onSelect when a location is clicked', () => {
    const onSelect = vi.fn();
    render(<LocationTree tree={flatTree} projectId="proj-1" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Center A'));

    expect(onSelect).toHaveBeenCalledWith(flatTree[0]);
  });

  it('renders empty state when tree is empty', () => {
    render(<LocationTree tree={[]} projectId="proj-1" />);

    expect(screen.getByText('No locations found.')).toBeInTheDocument();
  });

  it('highlights selected location', () => {
    render(<LocationTree tree={flatTree} projectId="proj-1" selectedId="loc-2" defaultExpanded />);

    const selected = screen.getByText('Building B').closest('[data-selected]');
    expect(selected).toHaveAttribute('data-selected', 'true');
  });
});
