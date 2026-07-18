/**
 * TanStack Query hooks for locations CRUD.
 *
 * Provides hooks for listing, fetching tree, creating, updating, deleting,
 * and reordering locations.
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Tree endpoint" — TanStack Query hooks for location data
 * Design: openspec/changes/phase-7-locations/design.md
 *   "TanStack Query hooks for locations"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocationSummary {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
  order: number;
  active: boolean;
}

export interface LocationTreeNode {
  id: string;
  name: string;
  level: number;
  children: LocationTreeNode[];
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

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const locationKeys = {
  all: (projectId: string) => ['locations', projectId] as const,
  list: (projectId: string) => ['locations', projectId, 'list'] as const,
  tree: (projectId: string) => ['locations', projectId, 'tree'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all locations for a project (flat list).
 */
export function useLocations(projectId: string) {
  return useQuery<LocationSummary[]>({
    queryKey: locationKeys.list(projectId),
    queryFn: () =>
      fetchJson<LocationSummary[]>(
        `/api/projects/${projectId}/locations`
      ),
  });
}

/**
 * Fetches the location tree for a project.
 */
export function useLocationTree(projectId: string) {
  return useQuery<LocationTreeNode[]>({
    queryKey: locationKeys.tree(projectId),
    queryFn: () =>
      fetchJson<LocationTreeNode[]>(
        `/api/projects/${projectId}/locations/tree`
      ),
  });
}

/**
 * Creates a new location.
 */
export function useCreateLocation(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; level: number; parentId?: string; order?: number }) =>
      mutateJson<LocationSummary>(
        `/api/projects/${projectId}/locations`,
        'POST',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: locationKeys.all(projectId),
      });
    },
  });
}

/**
 * Updates an existing location.
 */
export function useUpdateLocation(projectId: string, locationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; order?: number; active?: boolean }) =>
      mutateJson<LocationSummary>(
        `/api/projects/${projectId}/locations/${locationId}`,
        'PATCH',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: locationKeys.all(projectId),
      });
    },
  });
}

/**
 * Deletes a location.
 */
export function useDeleteLocation(projectId: string, locationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      mutateJson<void>(
        `/api/projects/${projectId}/locations/${locationId}`,
        'DELETE'
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: locationKeys.all(projectId),
      });
    },
  });
}

/**
 * Reorders locations.
 */
export function useReorderLocations(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { locationIds: string[] }) =>
      mutateJson<void>(
        `/api/projects/${projectId}/locations/reorder`,
        'PUT',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: locationKeys.all(projectId),
      });
    },
  });
}
