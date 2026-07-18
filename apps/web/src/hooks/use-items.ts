/**
 * TanStack Query hooks for items CRUD.
 *
 * Provides hooks for listing, fetching, creating, updating, deleting items,
 * and transitioning item statuses.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns" — useItems with filters
 *   "Item detail page" — useItem for single item
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "TanStack Query for client-side data fetching"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseItemsOptions {
  projectId: string;
  itemTypeId: string;
  statusId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface UseItemOptions {
  projectId: string;
  itemId: string;
}

/** Minimal item shape returned by the list API */
export interface ItemSummary {
  id: string;
  name: string;
  slug: string;
  itemTypeId: string;
  statusId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Status embedded in item detail */
export interface ItemStatusSnapshot {
  id: string;
  name: string;
  key: string;
  color: string;
  isFinal: boolean;
}

/** Field value embedded in item detail */
export interface FieldValueSnapshot {
  id: string;
  itemId: string;
  dynamicFieldId: string;
  value: unknown;
  dynamicField?: {
    id: string;
    name: string;
    key: string;
    type: string;
    showInList?: boolean;
    order?: number;
  };
}

/** Full item detail shape returned by the detail API */
export interface ItemDetail extends ItemSummary {
  status?: ItemStatusSnapshot | null;
  itemType?: { id: string; name: string; slug: string };
  fieldValues?: FieldValueSnapshot[];
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

export const itemKeys = {
  all: (projectId: string) => ['items', projectId] as const,
  list: (projectId: string, filters: Record<string, unknown>) =>
    ['items', projectId, 'list', filters] as const,
  detail: (projectId: string, itemId: string) =>
    ['items', projectId, 'detail', itemId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches a paginated list of items for a given ItemType.
 */
export function useItems(options: UseItemsOptions) {
  const { projectId, itemTypeId, statusId, search, page, pageSize } = options;

  const filters: Record<string, string | number> = { itemTypeId };
  if (statusId) filters.statusId = statusId;
  if (search) filters.search = search;
  if (page !== undefined) filters.page = page;
  if (pageSize !== undefined) filters.pageSize = pageSize;

  const queryString = new URLSearchParams(
    Object.entries(filters).map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery<ItemSummary[]>({
    queryKey: itemKeys.list(projectId, filters),
    queryFn: () =>
      fetchJson<ItemSummary[]>(
        `/api/projects/${projectId}/items?${queryString}`
      ),
  });
}

/**
 * Fetches a single item with field values, status, and item type.
 */
export function useItem(options: UseItemOptions) {
  const { projectId, itemId } = options;

  return useQuery<ItemDetail>({
    queryKey: itemKeys.detail(projectId, itemId),
    queryFn: () =>
      fetchJson<ItemDetail>(
        `/api/projects/${projectId}/items/${itemId}`
      ),
  });
}

/**
 * Creates a new item.
 */
export function useCreateItem(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      itemTypeId: string;
      statusId?: string;
      fieldValues?: Array<{ dynamicFieldId: string; value: unknown }>;
    }) =>
      mutateJson<ItemSummary>(
        `/api/projects/${projectId}/items`,
        'POST',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all(projectId),
      });
    },
  });
}

/**
 * Updates an existing item.
 */
export function useUpdateItem(projectId: string, itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      statusId?: string;
      fieldValues?: Array<{ dynamicFieldId: string; value: unknown }>;
    }) =>
      mutateJson<ItemSummary>(
        `/api/projects/${projectId}/items/${itemId}`,
        'PATCH',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all(projectId),
      });
    },
  });
}

/**
 * Deletes an item.
 */
export function useDeleteItem(projectId: string, itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      mutateJson<void>(
        `/api/projects/${projectId}/items/${itemId}`,
        'DELETE'
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all(projectId),
      });
    },
  });
}

/**
 * Transitions an item to a new status.
 */
export function useTransitionStatus(projectId: string, itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statusId: string) =>
      mutateJson<ItemSummary>(
        `/api/projects/${projectId}/items/${itemId}/status`,
        'PATCH',
        { statusId }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: itemKeys.all(projectId),
      });
    },
  });
}
