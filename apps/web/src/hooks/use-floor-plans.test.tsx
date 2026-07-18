/**
 * Tests for useFloorPlans hook — TanStack Query hooks for floor plans.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "Floor plan CRUD access" — TanStack Query hooks
 * Design: openspec/changes/phase-7-locations/design.md
 *   "TanStack Query hooks for floor plans"
 */

// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal('fetch', mockFetch);

import {
  useFloorPlans,
  useFloorPlan,
  useCreateFloorPlan,
  useDeleteFloorPlan,
  useMarkers,
  useCreateMarker,
  useUpdateMarker,
  useDeleteMarker,
  floorPlanKeys,
} from './use-floor-plans';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const LOCATION_ID = 'clloc1xxxxxxxxxxxxxxxxxx';
const FLOOR_PLAN_ID = 'clfp1xxxxxxxxxxxxxxxxxxx';
const MARKER_ID = 'clmk1xxxxxxxxxxxxxxxxxxx';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify({ data }), { status }));
}

function errorResponse(status: number, error = 'ERROR') {
  return Promise.resolve(
    new Response(JSON.stringify({ error, message: 'Error' }), { status })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

describe('floorPlanKeys', () => {
  it('generates correct keys', () => {
    expect(floorPlanKeys.all(PROJECT_ID, LOCATION_ID)).toEqual([
      'floor-plans',
      PROJECT_ID,
      LOCATION_ID,
    ]);
    expect(floorPlanKeys.list(PROJECT_ID, LOCATION_ID)).toEqual([
      'floor-plans',
      PROJECT_ID,
      LOCATION_ID,
      'list',
    ]);
    expect(floorPlanKeys.detail(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID)).toEqual([
      'floor-plans',
      PROJECT_ID,
      LOCATION_ID,
      'detail',
      FLOOR_PLAN_ID,
    ]);
    expect(floorPlanKeys.markers(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID)).toEqual([
      'floor-plans',
      PROJECT_ID,
      LOCATION_ID,
      'markers',
      FLOOR_PLAN_ID,
    ]);
  });
});

// ---------------------------------------------------------------------------
// useFloorPlans
// ---------------------------------------------------------------------------

describe('useFloorPlans', () => {
  it('fetches floor plans for a location', async () => {
    const floorPlans = [
      { id: FLOOR_PLAN_ID, name: 'Ground Floor', imageUrl: '/plan.png', width: 1920, height: 1080 },
    ];
    mockFetch.mockReturnValue(jsonResponse(floorPlans));

    const { result } = renderHook(
      () => useFloorPlans(PROJECT_ID, LOCATION_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(floorPlans);
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/floor-plans?locationId=${LOCATION_ID}`
    );
  });

  it('handles fetch error', async () => {
    mockFetch.mockReturnValue(errorResponse(500));

    const { result } = renderHook(
      () => useFloorPlans(PROJECT_ID, LOCATION_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useFloorPlan
// ---------------------------------------------------------------------------

describe('useFloorPlan', () => {
  it('fetches a single floor plan', async () => {
    const floorPlan = { id: FLOOR_PLAN_ID, name: 'Ground Floor' };
    mockFetch.mockReturnValue(jsonResponse(floorPlan));

    const { result } = renderHook(
      () => useFloorPlan(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(floorPlan);
  });
});

// ---------------------------------------------------------------------------
// useCreateFloorPlan
// ---------------------------------------------------------------------------

describe('useCreateFloorPlan', () => {
  it('sends FormData to create a floor plan', async () => {
    const floorPlan = { id: FLOOR_PLAN_ID, name: 'New Plan' };
    mockFetch.mockReturnValue(jsonResponse(floorPlan, 201));

    const { result } = renderHook(
      () => useCreateFloorPlan(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    const formData = new FormData();
    formData.append('locationId', LOCATION_ID);
    formData.append('name', 'New Plan');
    formData.append('width', '1920');
    formData.append('height', '1080');

    result.current.mutate(formData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(floorPlan);
  });
});

// ---------------------------------------------------------------------------
// useDeleteFloorPlan
// ---------------------------------------------------------------------------

describe('useDeleteFloorPlan', () => {
  it('deletes a floor plan', async () => {
    mockFetch.mockReturnValue(Promise.resolve(new Response(null, { status: 204 })));

    const { result } = renderHook(
      () => useDeleteFloorPlan(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}`,
      { method: 'DELETE' }
    );
  });
});

// ---------------------------------------------------------------------------
// useMarkers
// ---------------------------------------------------------------------------

describe('useMarkers', () => {
  it('fetches markers for a floor plan', async () => {
    const markers = [
      { id: MARKER_ID, x: 0.5, y: 0.3, label: 'Rack', color: '#ff0000' },
    ];
    mockFetch.mockReturnValue(jsonResponse(markers));

    const { result } = renderHook(
      () => useMarkers(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(markers);
  });
});

// ---------------------------------------------------------------------------
// useCreateMarker
// ---------------------------------------------------------------------------

describe('useCreateMarker', () => {
  it('creates a marker', async () => {
    const marker = { id: MARKER_ID, x: 0.5, y: 0.3, label: 'Rack' };
    mockFetch.mockReturnValue(jsonResponse(marker, 201));

    const { result } = renderHook(
      () => useCreateMarker(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ x: 0.5, y: 0.3, label: 'Rack' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(marker);
  });
});

// ---------------------------------------------------------------------------
// useUpdateMarker
// ---------------------------------------------------------------------------

describe('useUpdateMarker', () => {
  it('updates a marker', async () => {
    const marker = { id: MARKER_ID, x: 0.7, y: 0.8 };
    mockFetch.mockReturnValue(jsonResponse(marker));

    const { result } = renderHook(
      () => useUpdateMarker(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID, MARKER_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ x: 0.7, y: 0.8 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(marker);
  });
});

// ---------------------------------------------------------------------------
// useDeleteMarker
// ---------------------------------------------------------------------------

describe('useDeleteMarker', () => {
  it('deletes a marker', async () => {
    mockFetch.mockReturnValue(Promise.resolve(new Response(null, { status: 204 })));

    const { result } = renderHook(
      () => useDeleteMarker(PROJECT_ID, LOCATION_ID, FLOOR_PLAN_ID, MARKER_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${PROJECT_ID}/floor-plans/${FLOOR_PLAN_ID}/markers/${MARKER_ID}`,
      { method: 'DELETE' }
    );
  });
});
