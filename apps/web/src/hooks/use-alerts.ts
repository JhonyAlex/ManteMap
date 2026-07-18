/**
 * TanStack Query hooks for alerts CRUD.
 *
 * Provides hooks for listing alerts, fetching unread count,
 * acknowledging, and dismissing alerts.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "Alert CRUD API" — list filtered, acknowledge, dismiss
 *   "Unread Count" — GET /alerts/unread-count returns { count }
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "TanStack Query for client-side data fetching"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Alert {
  id: string;
  projectId: string;
  alertType: string;
  severity: string;
  status: string;
  sourceType: string;
  sourceId: string;
  title: string;
  message: string | null;
  metadata: Record<string, unknown> | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseAlertsOptions {
  projectId: string;
  alertType?: string;
  severity?: string;
  status?: string;
}

export interface UnreadCount {
  count: number;
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

export const alertKeys = {
  all: (projectId: string) => ['alerts', projectId] as const,
  list: (projectId: string, filters: Record<string, unknown>) =>
    ['alerts', projectId, 'list', filters] as const,
  unreadCount: (projectId: string) =>
    ['alerts', projectId, 'unread-count'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches a list of alerts for a project with optional filters.
 */
export function useAlerts(options: UseAlertsOptions) {
  const { projectId, alertType, severity, status } = options;

  const filters: Record<string, string> = {};
  if (alertType) filters.alertType = alertType;
  if (severity) filters.severity = severity;
  if (status) filters.status = status;

  const queryString = new URLSearchParams(filters).toString();
  const url = queryString
    ? `/api/projects/${projectId}/alerts?${queryString}`
    : `/api/projects/${projectId}/alerts`;

  return useQuery<Alert[]>({
    queryKey: alertKeys.list(projectId, filters),
    queryFn: () => fetchJson<Alert[]>(url),
  });
}

/**
 * Fetches the unread alert count for a project.
 */
export function useUnreadCount(projectId: string) {
  return useQuery<UnreadCount>({
    queryKey: alertKeys.unreadCount(projectId),
    queryFn: () =>
      fetchJson<UnreadCount>(
        `/api/projects/${projectId}/alerts?action=unread-count`
      ),
  });
}

/**
 * Acknowledges an alert.
 */
export function useAcknowledge(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) =>
      mutateJson<Alert>(
        `/api/projects/${projectId}/alerts/${alertId}`,
        'PATCH',
        { action: 'acknowledge' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: alertKeys.all(projectId),
      });
    },
  });
}

/**
 * Dismisses an alert.
 */
export function useDismiss(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) =>
      mutateJson<Alert>(
        `/api/projects/${projectId}/alerts/${alertId}`,
        'PATCH',
        { action: 'dismiss' }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: alertKeys.all(projectId),
      });
    },
  });
}
