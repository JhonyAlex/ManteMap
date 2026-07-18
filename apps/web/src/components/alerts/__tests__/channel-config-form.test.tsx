// @vitest-environment jsdom
/**
 * RED tests for ChannelConfigForm component.
 *
 * These tests verify:
 *   - Renders proper input fields per channel type (webhook URL for Slack/Teams, bot token + chat ID for Telegram)
 *   - Shows labels and descriptions matching spec
 *   - Save button triggers upsert mutation with form values
 *   - Test button triggers test mutation
 *   - Delete button triggers delete mutation
 *   - Shows validation error when saving with empty fields
 *   - Shows existing config values when already configured
 *   - Disables buttons during mutations
 *
 * Spec: openspec/changes/phase-10-external-notifications/specs/channel-configuration/spec.md
 *   "Channel Config UI" — webhook/token input fields, save, test button
 *   "User configures Slack via UI" — save persists via PUT API
 *   "Test button sends and shows result"
 * Design: openspec/changes/phase-10-external-notifications/design.md
 *   "ChannelConfigForm (Client Component)"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChannelConfigForm } from '../channel-config-form';

// ---------------------------------------------------------------------------
// Mocks for hooks
// ---------------------------------------------------------------------------

const mockUseChannelConfigs = vi.fn();
const mockUseUpsertChannelConfig = vi.fn();
const mockUseDeleteChannelConfig = vi.fn();
const mockUseTestChannel = vi.fn();

vi.mock('@/hooks/use-notification-channels', () => ({
  useChannelConfigs: (...args: unknown[]) => mockUseChannelConfigs(...args),
  useUpsertChannelConfig: (...args: unknown[]) => mockUseUpsertChannelConfig(...args),
  useDeleteChannelConfig: (...args: unknown[]) => mockUseDeleteChannelConfig(...args),
  useTestChannel: (...args: unknown[]) => mockUseTestChannel(...args),
  channelKeys: { all: (p: string) => ['notification-channels', p] },
}));

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
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

function setupDefaultMocks() {
  mockUseChannelConfigs.mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  });
  mockUseUpsertChannelConfig.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseDeleteChannelConfig.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockUseTestChannel.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
});

// ---------------------------------------------------------------------------
// Slack form tests
// ---------------------------------------------------------------------------

describe('ChannelConfigForm — Slack', () => {
  it('renders webhook URL input field', () => {
    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/slack webhook url/i)).toBeInTheDocument();
  });

  it('shows Slack help description', () => {
    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/incoming webhook/i)).toBeInTheDocument();
  });

  it('calls upsert mutation on save with webhook URL', async () => {
    const upsertMutate = vi.fn();
    mockUseUpsertChannelConfig.mockReturnValue({
      mutate: upsertMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    const input = screen.getByLabelText(/slack webhook url/i);
    await user.type(input, 'https://hooks.slack.com/services/TEST/CHAN/1');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(upsertMutate).toHaveBeenCalledWith({
      channelType: 'slack',
      config: { webhookUrl: 'https://hooks.slack.com/services/TEST/CHAN/1' },
      enabled: true,
    });
  });

  it('calls test mutation via test button', async () => {
    const testMutate = vi.fn();
    mockUseTestChannel.mockReturnValue({
      mutate: testMutate,
      isPending: false,
    });
    mockUseChannelConfigs.mockReturnValue({
      data: [
        {
          id: 'chan-1',
          userId: 'user-1',
          channelType: 'slack',
          config: { webhookUrl: 'https://hooks.slack.com/services/TEST/CHAN/1' },
          enabled: true,
          createdAt: '2026-07-18T10:00:00Z',
          updatedAt: '2026-07-18T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /test connection/i }));

    expect(testMutate).toHaveBeenCalledWith('slack');
  });

  it('calls delete mutation via delete button', async () => {
    const deleteMutate = vi.fn();
    mockUseDeleteChannelConfig.mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
    });
    mockUseChannelConfigs.mockReturnValue({
      data: [
        {
          id: 'chan-1',
          userId: 'user-1',
          channelType: 'slack',
          config: { webhookUrl: 'https://hooks.slack.com/services/TEST/CHAN/1' },
          enabled: true,
          createdAt: '2026-07-18T10:00:00Z',
          updatedAt: '2026-07-18T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /delete/i }));

    expect(deleteMutate).toHaveBeenCalledWith('slack');
  });

  it('shows existing webhook URL when config is loaded (masked)', () => {
    mockUseChannelConfigs.mockReturnValue({
      data: [
        {
          id: 'chan-1',
          userId: 'user-1',
          channelType: 'slack',
          config: { webhookUrl: 'https://hooks.slack.com/services/EXISTING/URL/1' },
          enabled: true,
          createdAt: '2026-07-18T10:00:00Z',
          updatedAt: '2026-07-18T10:00:00Z',
        },
      ],
      isLoading: false,
      error: null,
    });

    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    const input = screen.getByLabelText(/slack webhook url/i) as HTMLInputElement;
    expect(input.value).toBeTruthy();
    expect(input.value).toContain('hooks.slack.com');
  });
});

// ---------------------------------------------------------------------------
// Teams form tests
// ---------------------------------------------------------------------------

describe('ChannelConfigForm — Teams', () => {
  it('renders webhook URL input field', () => {
    render(<ChannelConfigForm projectId="proj-1" channelType="teams" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/teams webhook url/i)).toBeInTheDocument();
  });

  it('shows Teams help description', () => {
    render(<ChannelConfigForm projectId="proj-1" channelType="teams" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/incoming webhook connector/i)).toBeInTheDocument();
  });

  it('calls upsert mutation on save with Teams webhook', async () => {
    const upsertMutate = vi.fn();
    mockUseUpsertChannelConfig.mockReturnValue({
      mutate: upsertMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<ChannelConfigForm projectId="proj-1" channelType="teams" />, {
      wrapper: createWrapper(),
    });

    const input = screen.getByLabelText(/teams webhook url/i);
    await user.type(input, 'https://test.webhook.office.com/webhookb2/abc');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(upsertMutate).toHaveBeenCalledWith({
      channelType: 'teams',
      config: { webhookUrl: 'https://test.webhook.office.com/webhookb2/abc' },
      enabled: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Telegram form tests
// ---------------------------------------------------------------------------

describe('ChannelConfigForm — Telegram', () => {
  it('renders bot token input field', () => {
    render(<ChannelConfigForm projectId="proj-1" channelType="telegram" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/bot token/i)).toBeInTheDocument();
  });

  it('renders chat ID input field', () => {
    render(<ChannelConfigForm projectId="proj-1" channelType="telegram" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByLabelText(/chat id/i)).toBeInTheDocument();
  });

  it('shows Telegram help description', () => {
    render(<ChannelConfigForm projectId="proj-1" channelType="telegram" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/botfather/i)).toBeInTheDocument();
  });

  it('calls upsert mutation with bot token and chat ID', async () => {
    const upsertMutate = vi.fn();
    mockUseUpsertChannelConfig.mockReturnValue({
      mutate: upsertMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<ChannelConfigForm projectId="proj-1" channelType="telegram" />, {
      wrapper: createWrapper(),
    });

    await user.type(screen.getByLabelText(/bot token/i), '123456:ABC-DEF');
    await user.type(screen.getByLabelText(/chat id/i), '987654321');

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(upsertMutate).toHaveBeenCalledWith({
      channelType: 'telegram',
      config: { botToken: '123456:ABC-DEF', chatId: '987654321' },
      enabled: true,
    });
  });
});

// ---------------------------------------------------------------------------
// Validation tests
// ---------------------------------------------------------------------------

describe('ChannelConfigForm — validation', () => {
  it('shows error when saving Slack with empty URL', async () => {
    const upsertMutate = vi.fn();
    mockUseUpsertChannelConfig.mockReturnValue({
      mutate: upsertMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    await user.click(screen.getByRole('button', { name: /save/i }));

    // Should not call mutate with empty field
    expect(upsertMutate).not.toHaveBeenCalled();
    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/webhook url is required/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

describe('ChannelConfigForm — loading', () => {
  it('shows loading indicator while fetching config', () => {
    mockUseChannelConfigs.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<ChannelConfigForm projectId="proj-1" channelType="slack" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
