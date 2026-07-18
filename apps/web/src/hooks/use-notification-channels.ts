/**
 * TanStack Query hooks for notification channel configuration.
 *
 * Provides hooks for fetching, upserting, deleting, and testing
 * per-user notification channel configs (Slack, Teams, Telegram).
 *
 * Spec: openspec/changes/phase-10-external-notifications/specs/channel-configuration/spec.md
 *   "Channel Config CRUD API" — GET/PUT/DELETE notification-channels
 *   "Test Connectivity Endpoint" — POST test
 * Design: openspec/changes/phase-10-external-notifications/design.md
 *   "TanStack Query for client-side data fetching"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserChannelConfig {
  id: string;
  userId: string;
  channelType: string; // "slack" | "teams" | "telegram"
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertChannelConfigInput {
  channelType: string;
  config: Record<string, unknown>;
  enabled?: boolean;
}

export interface ChannelTestResult {
  success: boolean;
  error?: string;
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

export const channelKeys = {
  all: (projectId: string) =>
    ['notification-channels', projectId] as const,
  single: (projectId: string, channelType: string) =>
    ['notification-channels', projectId, channelType] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all configured notification channels for the current user in a project.
 */
export function useChannelConfigs(projectId: string) {
  return useQuery<UserChannelConfig[]>({
    queryKey: channelKeys.all(projectId),
    queryFn: () =>
      fetchJson<UserChannelConfig[]>(
        `/api/projects/${projectId}/notification-channels`
      ),
  });
}

/**
 * Creates or updates a notification channel config.
 */
export function useUpsertChannelConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertChannelConfigInput) =>
      mutateJson<UserChannelConfig>(
        `/api/projects/${projectId}/notification-channels`,
        'PUT',
        {
          channelType: data.channelType,
          config: data.config,
          enabled: data.enabled ?? true,
        }
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: channelKeys.all(projectId),
      });
    },
  });
}

/**
 * Deletes a notification channel config by channel type.
 */
export function useDeleteChannelConfig(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (channelType: string) =>
      mutateJson<void>(
        `/api/projects/${projectId}/notification-channels?type=${encodeURIComponent(channelType)}`,
        'DELETE'
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: channelKeys.all(projectId),
      });
    },
  });
}

/**
 * Tests a channel's connectivity by sending a test message.
 */
export function useTestChannel(projectId: string) {
  return useMutation({
    mutationFn: (channelType: string) =>
      mutateJson<ChannelTestResult>(
        `/api/projects/${projectId}/notification-channels/test`,
        'POST',
        { channelType }
      ),
  });
}
