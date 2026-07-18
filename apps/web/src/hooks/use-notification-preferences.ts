/**
 * TanStack Query hooks for notification preferences.
 *
 * Provides hooks for fetching and updating per-user, per-project
 * notification preferences.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/notification-preferences/spec.md
 *   "Preferences CRUD API" — GET/PUT notification preferences
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "TanStack Query for client-side data fetching"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationPreference {
  id: string;
  userId: string;
  projectId: string;
  alertType: string;
  enabled: boolean;
  email?: boolean;
  slack?: boolean;
  teams?: boolean;
  telegram?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePreferenceInput {
  alertType: string;
  enabled?: boolean;
  email?: boolean;
  slack?: boolean;
  teams?: boolean;
  telegram?: boolean;
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

export const preferenceKeys = {
  all: (projectId: string) => ['notification-preferences', projectId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches notification preferences for the current user in a project.
 */
export function useNotificationPreferences(projectId: string) {
  return useQuery<NotificationPreference[]>({
    queryKey: preferenceKeys.all(projectId),
    queryFn: () =>
      fetchJson<NotificationPreference[]>(
        `/api/projects/${projectId}/alerts/preferences`
      ),
  });
}

/**
 * Updates a single notification preference (toggle alert type on/off).
 */
export function useUpdateNotificationPreference(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePreferenceInput) =>
      mutateJson<NotificationPreference>(
        `/api/projects/${projectId}/alerts/preferences`,
        'PUT',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: preferenceKeys.all(projectId),
      });
    },
  });
}
