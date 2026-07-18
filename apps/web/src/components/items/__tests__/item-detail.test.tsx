// @vitest-environment jsdom
/**
 * Tests for ItemDetail component.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Item detail page" — field values rendered by type, status badge, actions
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "field value renderer, status badge, actions"
 *
 * Acceptance criteria:
 *   - Renders field values by type using renderCellValue
 *   - Displays status as a Badge with status color
 *   - Provides edit and delete action buttons
 *   - Shows delete confirmation dialog
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ItemDetail } from '../item-detail';
import type { ItemDetail as ItemDetailType } from '@/hooks/use-items';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../cell-renderer', () => ({
  renderCellValue: vi.fn((type: string, value: unknown) => String(value ?? '—')),
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockItem: ItemDetailType = {
  id: 'item-1',
  name: 'Pump A',
  slug: 'pump-a',
  itemTypeId: 'type-1',
  statusId: 'status-1',
  createdAt: '2026-07-15T10:00:00Z',
  updatedAt: '2026-07-15T10:00:00Z',
  status: {
    id: 'status-1',
    name: 'Active',
    key: 'active',
    color: '#22c55e',
    isFinal: false,
  },
  itemType: {
    id: 'type-1',
    name: 'Pump',
    slug: 'pump',
  },
  fieldValues: [
    {
      id: 'fv-1',
      itemId: 'item-1',
      dynamicFieldId: 'df-1',
      value: 'SN-001',
      dynamicField: {
        id: 'df-1',
        name: 'Serial Number',
        key: 'serialNumber',
        type: 'SHORT_TEXT',
      },
    },
    {
      id: 'fv-2',
      itemId: 'item-1',
      dynamicFieldId: 'df-2',
      value: 42,
      dynamicField: {
        id: 'df-2',
        name: 'Quantity',
        key: 'quantity',
        type: 'NUMBER',
      },
    },
    {
      id: 'fv-3',
      itemId: 'item-1',
      dynamicFieldId: 'df-3',
      value: true,
      dynamicField: {
        id: 'df-3',
        name: 'Is Critical',
        key: 'isCritical',
        type: 'BOOLEAN',
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ItemDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders item name', () => {
    render(<ItemDetail item={mockItem} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Pump A')).toBeInTheDocument();
  });

  it('renders status badge with status name', () => {
    render(<ItemDetail item={mockItem} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders field values by type', () => {
    render(<ItemDetail item={mockItem} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Serial Number')).toBeInTheDocument();
    expect(screen.getByText('Quantity')).toBeInTheDocument();
    expect(screen.getByText('Is Critical')).toBeInTheDocument();
  });

  it('renders edit button', () => {
    render(<ItemDetail item={mockItem} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByRole('link', { name: /edit/i })).toBeInTheDocument();
  });

  it('renders delete button', () => {
    render(<ItemDetail item={mockItem} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('renders item type name', () => {
    render(<ItemDetail item={mockItem} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Pump')).toBeInTheDocument();
  });

  it('renders item without status gracefully', () => {
    const itemNoStatus = { ...mockItem, status: null, statusId: null };
    render(<ItemDetail item={itemNoStatus} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Pump A')).toBeInTheDocument();
    expect(screen.getByText(/no status/i)).toBeInTheDocument();
  });

  it('renders item without field values gracefully', () => {
    const itemNoFields = { ...mockItem, fieldValues: [] };
    render(<ItemDetail item={itemNoFields} projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Pump A')).toBeInTheDocument();
    expect(screen.getByText(/no fields/i)).toBeInTheDocument();
  });
});
