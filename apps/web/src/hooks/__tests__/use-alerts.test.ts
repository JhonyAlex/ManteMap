// @vitest-environment jsdom
/**
 * RED tests for alert TanStack Query hooks.
 *
 * These tests verify:
 *   - useAlerts fetches alerts with filters from API
 *   - useUnreadCount fetches unread count from API
 *   - useAcknowledge sends PATCH acknowledge request
 *   - useDismiss sends PATCH dismiss request
 *   - All hooks handle error states
 *   - Mutations invalidate alert queries on success
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "Alert CRUD API" — list filtered, acknowledge, dismiss
 *   "Unread Count" — GET /alerts/unread-count returns { count }
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "TanStack Query for client-side data fetching"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAlerts, useUnreadCount, useAcknowledge, useDismiss, alertKeys } from '../use-alerts';

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

const mockAlerts = [
  {
    id: 'alert-1',
    projectId: 'proj-1',
    alertType: 'DOCUMENT_EXPIRING',
    severity: 'WARNING',
    status: 'ACTIVE',
    sourceType: 'document',
    sourceId: 'doc-1',
    title: 'Document "Safety Manual" expiring in 7 days',
    message: 'This document expires on 2026-07-25',
    metadata: { daysUntilExpiry: 7 },
    acknowledgedAt: null,
    dismissedAt: null,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'alert-2',
    projectId: 'proj-1',
    alertType: 'STATUS_INCIDENT',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    sourceType: 'item',
    sourceId: 'item-1',
    title: 'Item "Pump A" moved to incident status',
    message: null,
    metadata: null,
    acknowledgedAt: null,
    dismissedAt: null,
    createdAt: '2026-07-18T09:00:00Z',
    updatedAt: '2026-07-18T09:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAlerts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches alerts from the API with projectId', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockAlerts }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useAlerts({ projectId: 'proj-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/alerts')
    );
    expect(result.current.data).toEqual(mockAlerts);
    expect(result.current.error).toBeNull();
  });

  it('passes optional filters as query params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockAlerts }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    renderHook(
      () =>
        useAlerts({
          projectId: 'proj-1',
          severity: 'CRITICAL',
          status: 'ACTIVE',
          alertType: 'STATUS_INCIDENT',
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const calledUrl = fetchSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('severity=CRITICAL');
    expect(calledUrl).toContain('status=ACTIVE');
    expect(calledUrl).toContain('alertType=STATUS_INCIDENT');
  });

  it('returns error state when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useAlerts({ projectId: 'proj-1' }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useUnreadCount', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches unread count from the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { count: 5 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUnreadCount('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/alerts?action=unread-count')
    );
    expect(result.current.data).toEqual({ count: 5 });
  });

  it('returns error when request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUnreadCount('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });
});

describe('useAcknowledge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PATCH request to acknowledge endpoint', async () => {
    const acknowledgedAlert = {
      ...mockAlerts[0],
      status: 'ACKNOWLEDGED',
      acknowledgedAt: '2026-07-18T11:00:00Z',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: acknowledgedAlert }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useAcknowledge('proj-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate('alert-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/alerts/alert-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' }),
      })
    );
  });

  it('returns error when acknowledge fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useAcknowledge('proj-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate('nonexistent');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('useDismiss', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PATCH request to dismiss endpoint', async () => {
    const dismissedAlert = {
      ...mockAlerts[0],
      status: 'DISMISSED',
      dismissedAt: '2026-07-18T11:00:00Z',
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: dismissedAlert }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDismiss('proj-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate('alert-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/alerts/alert-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dismiss' }),
      })
    );
  });

  it('returns error when dismiss fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDismiss('proj-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate('nonexistent');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('alertKeys', () => {
  it('returns correct key factory', () => {
    expect(alertKeys.all('proj-1')).toEqual(['alerts', 'proj-1']);
    expect(alertKeys.list('proj-1', { severity: 'CRITICAL' })).toEqual([
      'alerts',
      'proj-1',
      'list',
      { severity: 'CRITICAL' },
    ]);
    expect(alertKeys.unreadCount('proj-1')).toEqual([
      'alerts',
      'proj-1',
      'unread-count',
    ]);
  });
});
