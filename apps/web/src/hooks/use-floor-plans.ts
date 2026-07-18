/**
 * TanStack Query hooks for floor plans and markers.
 *
 * Provides hooks for listing, fetching, creating, deleting floor plans,
 * and CRUD operations on markers.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "Floor plan CRUD access" — TanStack Query hooks
 * Design: openspec/changes/phase-7-locations/design.md
 *   "TanStack Query hooks for floor plans"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FloorPlanSummary {
  id: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  active: boolean;
}

export interface MarkerSummary {
  id: string;
  floorPlanId: string;
  itemId: string | null;
  x: number;
  y: number;
  label: string | null;
  color: string | null;
}

export interface CreateMarkerData {
  x: number;
  y: number;
  label?: string;
  color?: string;
  itemId?: string;
}

export interface UpdateMarkerData {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  itemId?: string;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  const json = (await res.json()) as ApiResponse<T>;
  return json.data as T;
}

async function mutateJson<T>(
  url: string,
  method: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const json = (await res.json()) as ApiResponse<T>;
  return json.data as T;
}

async function uploadFormData<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? `Request failed with status ${res.status}`);
  }
  const json = (await res.json()) as ApiResponse<T>;
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const floorPlanKeys = {
  all: (projectId: string, locationId: string) =>
    ['floor-plans', projectId, locationId] as const,
  list: (projectId: string, locationId: string) =>
    ['floor-plans', projectId, locationId, 'list'] as const,
  detail: (projectId: string, locationId: string, floorPlanId: string) =>
    ['floor-plans', projectId, locationId, 'detail', floorPlanId] as const,
  markers: (projectId: string, locationId: string, floorPlanId: string) =>
    ['floor-plans', projectId, locationId, 'markers', floorPlanId] as const,
};

// ---------------------------------------------------------------------------
// Floor Plan hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all floor plans for a location.
 */
export function useFloorPlans(projectId: string, locationId: string) {
  return useQuery<FloorPlanSummary[]>({
    queryKey: floorPlanKeys.list(projectId, locationId),
    queryFn: () =>
      fetchJson<FloorPlanSummary[]>(
        `/api/projects/${projectId}/floor-plans?locationId=${locationId}`
      ),
  });
}

/**
 * Fetches a single floor plan by ID.
 */
export function useFloorPlan(
  projectId: string,
  locationId: string,
  floorPlanId: string
) {
  return useQuery<FloorPlanSummary>({
    queryKey: floorPlanKeys.detail(projectId, locationId, floorPlanId),
    queryFn: () =>
      fetchJson<FloorPlanSummary>(
        `/api/projects/${projectId}/floor-plans/${floorPlanId}`
      ),
  });
}

/**
 * Creates a new floor plan via multipart form upload.
 */
export function useCreateFloorPlan(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) =>
      uploadFormData<FloorPlanSummary>(
        `/api/projects/${projectId}/floor-plans`,
        formData
      ),
    onSuccess: (_data, _variables) => {
      // Invalidate all floor plan queries for all locations
      void queryClient.invalidateQueries({
        queryKey: ['floor-plans', projectId],
      });
    },
  });
}

/**
 * Deletes a floor plan.
 */
export function useDeleteFloorPlan(
  projectId: string,
  locationId: string,
  floorPlanId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      mutateJson<void>(
        `/api/projects/${projectId}/floor-plans/${floorPlanId}`,
        'DELETE'
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: floorPlanKeys.all(projectId, locationId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Marker hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all markers for a floor plan.
 */
export function useMarkers(
  projectId: string,
  locationId: string,
  floorPlanId: string
) {
  return useQuery<MarkerSummary[]>({
    queryKey: floorPlanKeys.markers(projectId, locationId, floorPlanId),
    queryFn: () =>
      fetchJson<MarkerSummary[]>(
        `/api/projects/${projectId}/floor-plans/${floorPlanId}/markers`
      ),
  });
}

/**
 * Creates a new marker on a floor plan.
 */
export function useCreateMarker(
  projectId: string,
  locationId: string,
  floorPlanId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMarkerData) =>
      mutateJson<MarkerSummary>(
        `/api/projects/${projectId}/floor-plans/${floorPlanId}/markers`,
        'POST',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: floorPlanKeys.markers(projectId, locationId, floorPlanId),
      });
    },
  });
}

/**
 * Updates an existing marker.
 */
export function useUpdateMarker(
  projectId: string,
  locationId: string,
  floorPlanId: string,
  markerId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateMarkerData) =>
      mutateJson<MarkerSummary>(
        `/api/projects/${projectId}/floor-plans/${floorPlanId}/markers/${markerId}`,
        'PATCH',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: floorPlanKeys.markers(projectId, locationId, floorPlanId),
      });
    },
  });
}

/**
 * Deletes a marker.
 */
export function useDeleteMarker(
  projectId: string,
  locationId: string,
  floorPlanId: string,
  markerId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      mutateJson<void>(
        `/api/projects/${projectId}/floor-plans/${floorPlanId}/markers/${markerId}`,
        'DELETE'
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: floorPlanKeys.markers(projectId, locationId, floorPlanId),
      });
    },
  });
}
