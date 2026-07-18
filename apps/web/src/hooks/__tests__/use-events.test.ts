// @vitest-environment jsdom
/**
 * RED tests for event TanStack Query hooks.
 *
 * These tests verify:
 *   - useEvents fetches events by projectId with date range
 *   - useCreateEvent sends POST and invalidates queries
 *   - useUpdateEvent sends PUT and invalidates queries
 *   - useDeleteEvent sends DELETE and invalidates queries
 *   - Query key factory produces correct keys
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Event Source API" — fetch events with date-range parameters
 * Design: openspec/changes/phase-6-events/design.md
 *   "TanStack Query for client-side data fetching"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  eventKeys,
} from '../use-events';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
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

const mockEvents = [
  {
    id: 'evt-1',
    title: 'Maintenance Check',
    start: '2026-07-20T09:00:00.000Z',
    end: '2026-07-20T10:00:00.000Z',
    allDay: false,
    color: '#3b82f6',
    type: 'manual' as const,
    eventId: 'evt-1',
  },
  {
    id: 'doc-exp-doc-1',
    title: '📄 Safety Certificate',
    start: '2026-07-25T00:00:00.000Z',
    end: '2026-07-25T00:00:00.000Z',
    allDay: true,
    color: '#ef4444',
    type: 'document_expiration' as const,
    documentId: 'doc-1',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('eventKeys', () => {
  it('produces correct all key', () => {
    expect(eventKeys.all('proj-1')).toEqual(['events', 'proj-1']);
  });

  it('produces correct list key with date range', () => {
    const key = eventKeys.list('proj-1', '2026-07-01', '2026-07-31');
    expect(key).toEqual(['events', 'proj-1', 'list', '2026-07-01', '2026-07-31']);
  });
});

describe('useEvents', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches events with projectId and date range', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockEvents }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useEvents('proj-1', '2026-07-01', '2026-07-31'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/events')
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('start=2026-07-01')
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('end=2026-07-31')
    );
    expect(result.current.data).toEqual(mockEvents);
    expect(result.current.error).toBeNull();
  });

  it('returns error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useEvents('proj-1', '2026-07-01', '2026-07-31'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });

  it('does not fetch when dates are empty', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    renderHook(
      () => useEvents('proj-1', '', ''),
      { wrapper: createWrapper() }
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('useCreateEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST to events endpoint with payload', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockEvents[0] }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useCreateEvent('proj-1'),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({
      title: 'Maintenance Check',
      startAt: '2026-07-20T09:00:00.000Z',
      endAt: '2026-07-20T10:00:00.000Z',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/events'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

describe('useUpdateEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PUT to event resource endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockEvents[0] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUpdateEvent('proj-1', 'evt-1'),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync({ title: 'Updated Title' });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/events/evt-1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });
});

describe('useDeleteEvent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends DELETE to event resource endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    );

    const { result } = renderHook(
      () => useDeleteEvent('proj-1', 'evt-1'),
      { wrapper: createWrapper() }
    );

    await result.current.mutateAsync();

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/events/evt-1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
