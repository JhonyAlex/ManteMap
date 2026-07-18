// @vitest-environment jsdom
/**
 * Tests for ItemList component.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns" — dynamic columns, pagination, search
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Client Component with Table, search, pagination"
 *
 * Acceptance criteria:
 *   - Renders table columns from showInList fields
 *   - Renders item rows with cell values by type
 *   - Shows search input that filters items
 *   - Shows pagination controls
 *   - Shows loading state
 *   - Shows empty state when no items
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ItemList } from '../item-list';
import type { DynamicFieldDefinition } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../column-builder', () => ({
  buildColumns: vi.fn(() => [
    { key: 'name', label: 'Name', type: 'SHORT_TEXT', order: 0 },
    { key: 'serialNumber', label: 'Serial Number', type: 'SHORT_TEXT', order: 1 },
  ]),
}));

vi.mock('../cell-renderer', () => ({
  renderCellValue: vi.fn((type: string, value: unknown) => String(value ?? '—')),
}));

const mockUseItems = vi.fn();
vi.mock('@/hooks/use-items', () => ({
  useItems: (...args: unknown[]) => mockUseItems(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

const mockFields: DynamicFieldDefinition[] = [
  {
    id: 'df-1',
    name: 'Name',
    key: 'name',
    type: 'SHORT_TEXT',
    required: true,
    order: 0,
    visible: true,
    active: true,
    showInList: true,
    showInSearch: true,
  },
  {
    id: 'df-2',
    name: 'Serial Number',
    key: 'serialNumber',
    type: 'SHORT_TEXT',
    required: false,
    order: 1,
    visible: true,
    active: true,
    showInList: true,
    showInSearch: false,
  },
];

const mockItems = [
  { id: 'item-1', name: 'Pump A', slug: 'pump-a', itemTypeId: 'type-1', statusId: 's1', createdAt: '2026-07-15', updatedAt: '2026-07-15' },
  { id: 'item-2', name: 'Pump B', slug: 'pump-b', itemTypeId: 'type-1', statusId: 's2', createdAt: '2026-07-15', updatedAt: '2026-07-15' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ItemList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseItems.mockReturnValue({
      data: mockItems,
      isLoading: false,
      error: null,
    });
  });

  it('renders table with columns from buildColumns', () => {
    render(
      <ItemList
        projectId="proj-1"
        itemTypeId="type-1"
        fields={mockFields}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Serial Number')).toBeInTheDocument();
  });

  it('renders item rows with cell values', () => {
    render(
      <ItemList
        projectId="proj-1"
        itemTypeId="type-1"
        fields={mockFields}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Pump A')).toBeInTheDocument();
    expect(screen.getByText('Pump B')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <ItemList
        projectId="proj-1"
        itemTypeId="type-1"
        fields={mockFields}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseItems.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <ItemList
        projectId="proj-1"
        itemTypeId="type-1"
        fields={mockFields}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    mockUseItems.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(
      <ItemList
        projectId="proj-1"
        itemTypeId="type-1"
        fields={mockFields}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/no items/i)).toBeInTheDocument();
  });

  it('calls useItems with correct filters', () => {
    render(
      <ItemList
        projectId="proj-1"
        itemTypeId="type-1"
        fields={mockFields}
      />,
      { wrapper: createWrapper() }
    );

    expect(mockUseItems).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        itemTypeId: 'type-1',
      })
    );
  });
});
