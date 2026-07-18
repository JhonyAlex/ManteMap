// @vitest-environment jsdom
/**
 * Tests for useLocations hooks.
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Tree endpoint" — TanStack Query hooks for location data
 * Design: openspec/changes/phase-7-locations/design.md
 *   "TanStack Query hooks for locations"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useLocations,
  useLocationTree,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useReorderLocations,
  locationKeys,
} from './use-locations';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';

// ---------------------------------------------------------------------------
// Tests — Query key factory
// ---------------------------------------------------------------------------

describe('locationKeys', () => {
  it('generates correct all key', () => {
    expect(locationKeys.all(PROJECT_ID)).toEqual(['locations', PROJECT_ID]);
  });

  it('generates correct list key', () => {
    expect(locationKeys.list(PROJECT_ID)).toEqual(['locations', PROJECT_ID, 'list']);
  });

  it('generates correct tree key', () => {
    expect(locationKeys.tree(PROJECT_ID)).toEqual(['locations', PROJECT_ID, 'tree']);
  });
});

// ---------------------------------------------------------------------------
// Tests — useLocations
// ---------------------------------------------------------------------------

describe('useLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches locations list', async () => {
    const locations = [
      { id: 'loc-1', name: 'Center A', level: 0 },
      { id: 'loc-2', name: 'Building B', level: 1 },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: locations }),
    });

    const { result } = renderHook(() => useLocations(PROJECT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('Center A');
    expect(mockFetch).toHaveBeenCalledWith(`/api/projects/${PROJECT_ID}/locations`);
  });

  it('handles fetch error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    const { result } = renderHook(() => useLocations(PROJECT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// Tests — useLocationTree
// ---------------------------------------------------------------------------

describe('useLocationTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches location tree', async () => {
    const tree = [
      { id: 'loc-1', name: 'Center A', level: 0, children: [] },
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: tree }),
    });

    const { result } = renderHook(() => useLocationTree(PROJECT_ID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledWith(`/api/projects/${PROJECT_ID}/locations/tree`);
  });
});

// ---------------------------------------------------------------------------
// Tests — Mutations
// ---------------------------------------------------------------------------

describe('useCreateLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a location via POST', async () => {
    const newLocation = { id: 'loc-new', name: 'New Location' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: newLocation }),
    });

    const { result } = renderHook(() => useCreateLocation(PROJECT_ID), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: 'New Location', level: 0 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/locations`,
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('useUpdateLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates a location via PATCH', async () => {
    const updated = { id: 'loc-1', name: 'Updated' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: updated }),
    });

    const { result } = renderHook(() => useUpdateLocation(PROJECT_ID, 'loc-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ name: 'Updated' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/locations/loc-1`,
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});

describe('useDeleteLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes a location via DELETE', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.resolve(undefined),
    });

    const { result } = renderHook(() => useDeleteLocation(PROJECT_ID, 'loc-1'), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/locations/loc-1`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('useReorderLocations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reorders locations via PUT', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'Reordered' }),
    });

    const { result } = renderHook(() => useReorderLocations(PROJECT_ID), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ locationIds: ['loc-1', 'loc-2'] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/locations/reorder`,
      expect.objectContaining({ method: 'PUT' })
    );
  });
});
