// @vitest-environment jsdom
/**
 * Tests for items TanStack Query hooks.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns" — useItems returns { data, isLoading, error }
 *   "Item detail page" — useItem returns single item with field values
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "TanStack Query for client-side data fetching"
 *
 * Acceptance criteria:
 *   - useItems passes filters (itemTypeId, statusId, search, page, pageSize) to API
 *   - useItems returns { data, isLoading, error } shape
 *   - useItem fetches single item by projectId + itemId
 *   - useItem returns { data, isLoading, error } shape
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useItems, useItem } from '../use-items';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

const mockItems = [
  {
    id: 'item-1',
    name: 'Pump A',
    slug: 'pump-a',
    itemTypeId: 'type-1',
    statusId: 'status-1',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 'item-2',
    name: 'Pump B',
    slug: 'pump-b',
    itemTypeId: 'type-1',
    statusId: 'status-2',
    createdAt: '2026-07-15T11:00:00Z',
    updatedAt: '2026-07-15T11:00:00Z',
  },
];

const mockItemDetail = {
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
        showInList: true,
        order: 1,
      },
    },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useItems', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches items with required itemTypeId filter', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockItems }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useItems({ projectId: 'proj-1', itemTypeId: 'type-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/items')
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('itemTypeId=type-1')
    );
    expect(result.current.data).toEqual(mockItems);
    expect(result.current.error).toBeNull();
  });

  it('passes optional filters as query params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockItems }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    renderHook(
      () =>
        useItems({
          projectId: 'proj-1',
          itemTypeId: 'type-1',
          statusId: 'status-1',
          search: 'pump',
          page: 2,
          pageSize: 10,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('statusId=status-1');
    expect(calledUrl).toContain('search=pump');
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('pageSize=10');
  });

  it('returns error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useItems({ projectId: 'proj-1', itemTypeId: 'type-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useItem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches single item by projectId and itemId', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockItemDetail }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useItem({ projectId: 'proj-1', itemId: 'item-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/items/item-1')
    );
    expect(result.current.data).toEqual(mockItemDetail);
    expect(result.current.error).toBeNull();
  });

  it('returns error when item not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useItem({ projectId: 'proj-1', itemId: 'nonexistent' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});
