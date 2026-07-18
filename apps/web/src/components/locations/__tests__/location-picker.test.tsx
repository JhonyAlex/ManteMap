// @vitest-environment jsdom
/**
 * Tests for LocationPicker component.
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-assignment/spec.md
 *   "LocationPicker component" — searchable tree-select, display path, clear
 * Design: openspec/changes/phase-7-locations/design.md
 *   "LocationPicker for forms"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocationPicker } from '../location-picker';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockUseLocationTree } = vi.hoisted(() => ({
  mockUseLocationTree: vi.fn(),
}));

vi.mock('@/hooks/use-locations', () => ({
  useLocationTree: mockUseLocationTree,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockTree = [
  {
    id: 'loc-1',
    name: 'Center A',
    level: 0,
    children: [
      {
        id: 'loc-2',
        name: 'Building B',
        level: 1,
        children: [
          { id: 'loc-3', name: 'Room 101', level: 2, children: [] },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocationTree.mockReturnValue({
      data: mockTree,
      isLoading: false,
      error: null,
    });
  });

  it('renders with placeholder when no selection', () => {
    render(<LocationPicker projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Select location...')).toBeInTheDocument();
  });

  it('displays selected location path', () => {
    render(
      <LocationPicker projectId="proj-1" value="loc-3" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Center A > Building B > Room 101')).toBeInTheDocument();
  });

  it('opens dropdown on click and shows tree', () => {
    render(<LocationPicker projectId="proj-1" />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Center A')).toBeInTheDocument();
  });

  it('calls onChange when a location is selected', () => {
    const onChange = vi.fn();
    render(
      <LocationPicker projectId="proj-1" onChange={onChange} />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Center A'));

    expect(onChange).toHaveBeenCalledWith('loc-1');
  });

  it('clears selection when clear button is clicked', () => {
    const onChange = vi.fn();
    render(
      <LocationPicker projectId="proj-1" value="loc-1" onChange={onChange} />,
      { wrapper: createWrapper() }
    );

    fireEvent.click(screen.getByLabelText('Clear location'));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('filters locations by search text', () => {
    render(<LocationPicker projectId="proj-1" />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('combobox'));
    const searchInput = screen.getByPlaceholderText('Search locations...');
    fireEvent.change(searchInput, { target: { value: 'Room' } });

    // Room 101 matches directly
    expect(screen.getByText('Room 101')).toBeInTheDocument();
    // Center A doesn't match but is an ancestor of Room 101
    // In tree view, ancestors of matching nodes are shown for context
    expect(screen.getByText('Center A')).toBeInTheDocument();
    // Building B is an ancestor of Room 101
    expect(screen.getByText('Building B')).toBeInTheDocument();
    // Building C doesn't match and has no matching descendants
    expect(screen.queryByText('Building C')).not.toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseLocationTree.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<LocationPicker projectId="proj-1" />, { wrapper: createWrapper() });

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Loading locations...')).toBeInTheDocument();
  });
});
