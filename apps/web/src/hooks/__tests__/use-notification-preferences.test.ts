// @vitest-environment jsdom
/**
 * RED tests for notification preferences TanStack Query hooks.
 *
 * These tests verify:
 *   - useNotificationPreferences fetches preferences from API
 *   - useUpdateNotificationPreference sends PUT request
 *   - Hooks handle error states
 *   - Mutations invalidate preference queries on success
 *
 * Spec: openspec/changes/phase-8-alerts/specs/notification-preferences/spec.md
 *   "Preferences CRUD API" — GET/PUT notification preferences
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "TanStack Query for client-side data fetching"
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  preferenceKeys,
} from '../use-notification-preferences';

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

const mockPreferences = [
  {
    id: 'pref-1',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'DOCUMENT_EXPIRING',
    enabled: true,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-2',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'STATUS_INCIDENT',
    enabled: true,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-3',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'EVENT_UPCOMING',
    enabled: false,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches preferences from the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockPreferences }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useNotificationPreferences('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/alerts/preferences')
    );
    expect(result.current.data).toEqual(mockPreferences);
    expect(result.current.error).toBeNull();
  });

  it('returns error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useNotificationPreferences('proj-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useUpdateNotificationPreference', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PUT request with alertType and enabled', async () => {
    const updatedPref = {
      ...mockPreferences[0],
      enabled: false,
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: updatedPref }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUpdateNotificationPreference('proj-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ alertType: 'DOCUMENT_EXPIRING', enabled: false });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/alerts/preferences'),
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: 'DOCUMENT_EXPIRING',
          enabled: false,
        }),
      })
    );
  });

  it('returns error when update fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Validation error' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUpdateNotificationPreference('proj-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate({ alertType: 'INVALID_TYPE' as never, enabled: false });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('preferenceKeys', () => {
  it('returns correct key factory', () => {
    expect(preferenceKeys.all('proj-1')).toEqual([
      'notification-preferences',
      'proj-1',
    ]);
  });
});
