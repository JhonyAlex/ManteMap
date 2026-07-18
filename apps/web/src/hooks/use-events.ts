/**
 * TanStack Query hooks for events CRUD and calendar data.
 *
 * Provides hooks for fetching events by date range, creating, updating,
 * and deleting events. Follows the same patterns as use-items.ts.
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Event Source API" — fetch events with date-range parameters
 * Design: openspec/changes/phase-6-events/design.md
 *   "TanStack Query for client-side data fetching"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Calendar event shape returned by the API */
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
  type: 'manual' | 'document_expiration';
  eventId?: string;
  documentId?: string;
  itemId?: string;
  rrule?: string | null;
  description?: string | null;
}

/** Payload for creating an event */
export interface CreateEventPayload {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  itemId?: string;
  rrule?: string;
  color?: string;
}

/** Payload for updating an event */
export interface UpdateEventPayload {
  title?: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  rrule?: string;
  color?: string;
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

export const eventKeys = {
  all: (projectId: string) => ['events', projectId] as const,
  list: (projectId: string, start: string, end: string) =>
    ['events', projectId, 'list', start, end] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches calendar events for a date range.
 * Disabled when start or end are empty.
 */
export function useEvents(projectId: string, start: string, end: string) {
  return useQuery<CalendarEvent[]>({
    queryKey: eventKeys.list(projectId, start, end),
    queryFn: () =>
      fetchJson<CalendarEvent[]>(
        `/api/projects/${projectId}/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      ),
    enabled: Boolean(start && end),
  });
}

/**
 * Creates a new event.
 */
export function useCreateEvent(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventPayload) =>
      mutateJson<CalendarEvent>(
        `/api/projects/${projectId}/events`,
        'POST',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: eventKeys.all(projectId),
      });
    },
  });
}

/**
 * Updates an existing event.
 */
export function useUpdateEvent(projectId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateEventPayload) =>
      mutateJson<CalendarEvent>(
        `/api/projects/${projectId}/events/${eventId}`,
        'PUT',
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: eventKeys.all(projectId),
      });
    },
  });
}

/**
 * Deletes an event.
 */
export function useDeleteEvent(projectId: string, eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      mutateJson<void>(
        `/api/projects/${projectId}/events/${eventId}`,
        'DELETE'
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: eventKeys.all(projectId),
      });
    },
  });
}
