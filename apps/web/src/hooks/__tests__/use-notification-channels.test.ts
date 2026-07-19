// @vitest-environment jsdom
/**
 * RED tests for notification-channels TanStack Query hooks.
 *
 * These tests verify:
 *   - useChannelConfigs lists configured channels
 *   - useChannelConfigs handles unconfigured state
 *   - useChannelConfigs handles API errors
 *   - useUpsertChannelConfig sends PUT request with channelType + config
 *   - useUpsertChannelConfig handles validation errors
 *   - useDeleteChannelConfig sends DELETE with channelType query param
 *   - useTestChannel sends POST to test endpoint
 *   - useTestChannel handles test failure
 *   - channelKeys factory returns correct keys
 *
 * Spec: openspec/changes/phase-10-external-notifications/specs/channel-configuration/spec.md
 *   "Channel Config CRUD API" — GET/PUT/DELETE notification-channels
 *   "Test Connectivity Endpoint" — POST test
 * Design: openspec/changes/phase-10-external-notifications/design.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useChannelConfigs,
  useUpsertChannelConfig,
  useDeleteChannelConfig,
  useTestChannel,
  channelKeys,
} from '../use-notification-channels';

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

const PROJECT_ID = 'proj-chan-test';

const mockChannels = [
  {
    id: 'chan-1',
    userId: 'user-1',
    channelType: 'slack',
    config: { webhookUrl: 'https://hooks.slack.com/services/TEST/CHAN/1' },
    enabled: true,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'chan-2',
    userId: 'user-1',
    channelType: 'teams',
    config: { webhookUrl: 'https://test.webhook.office.com/webhookb2/abc' },
    enabled: true,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// channelKeys
// ---------------------------------------------------------------------------

describe('channelKeys', () => {
  it('returns correct all key', () => {
    expect(channelKeys.all(PROJECT_ID)).toEqual([
      'notification-channels',
      PROJECT_ID,
    ]);
  });

  it('returns correct single key', () => {
    expect(channelKeys.single(PROJECT_ID, 'slack')).toEqual([
      'notification-channels',
      PROJECT_ID,
      'slack',
    ]);
  });
});

// ---------------------------------------------------------------------------
// useChannelConfigs — query
// ---------------------------------------------------------------------------

describe('useChannelConfigs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches channel configs from the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockChannels }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useChannelConfigs(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/api/projects/${PROJECT_ID}/notification-channels`)
    );
    expect(result.current.data).toEqual(mockChannels);
    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('handles empty list when no channels configured', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useChannelConfigs(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual([]);
  });

  it('returns error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useChannelConfigs(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// useUpsertChannelConfig — mutation
// ---------------------------------------------------------------------------

describe('useUpsertChannelConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends PUT request with channelType, config, and enabled', async () => {
    const saved = { ...mockChannels[0], enabled: true };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: saved }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUpsertChannelConfig(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      channelType: 'slack',
      config: { webhookUrl: 'https://hooks.slack.com/services/TEST/CHAN/1' },
      enabled: true,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/api/projects/${PROJECT_ID}/notification-channels`),
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelType: 'slack',
          config: { webhookUrl: 'https://hooks.slack.com/services/TEST/CHAN/1' },
          enabled: true,
        }),
      })
    );
  });

  it('handles validation error on upsert', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Invalid webhook URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUpsertChannelConfig(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      channelType: 'slack',
      config: { webhookUrl: 'not-a-url' },
      enabled: true,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it('upserts with enabled defaulting to true', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockChannels[1] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useUpsertChannelConfig(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate({
      channelType: 'teams',
      config: { webhookUrl: 'https://test.webhook.office.com/webhookb2/abc' },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = JSON.parse(
      (fetchSpy.mock.calls[0]![1] as Record<string, unknown>).body as string
    );
    expect(body.enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useDeleteChannelConfig — mutation
// ---------------------------------------------------------------------------

describe('useDeleteChannelConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends DELETE request with channelType query param', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'deleted' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDeleteChannelConfig(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate('slack');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain('/notification-channels');
    expect(calledUrl).toContain('type=slack');
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('handles delete error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDeleteChannelConfig(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate('telegram');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// useTestChannel — mutation
// ---------------------------------------------------------------------------

describe('useTestChannel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends POST to test endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useTestChannel(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate('slack');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(`/api/projects/${PROJECT_ID}/notification-channels/test`),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelType: 'slack' }),
      })
    );
  });

  it('handles test failure response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { success: false, error: 'Webhook returned 404' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useTestChannel(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate('teams');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: false, error: 'Webhook returned 404' });
  });

  it('handles network error on test', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(
      () => useTestChannel(PROJECT_ID),
      { wrapper: createWrapper() }
    );

    result.current.mutate('telegram');

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
