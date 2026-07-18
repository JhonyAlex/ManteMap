// @vitest-environment jsdom
/**
 * RED tests for NotificationPreferences component.
 *
 * These tests verify:
 *   - Renders toggle for each alert type
 *   - Toggle off sends update request
 *   - Toggle on sends update request
 *   - Shows loading state while fetching
 *   - Shows current enabled/disabled state for each type
 *
 * Spec: openspec/changes/phase-8-alerts/specs/notification-preferences/spec.md
 *   "Toggle alert type off" — user disables toggle, saves as false
 *   "Preferences CRUD API" — GET/PUT notification preferences
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Per-project toggle UI"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationPreferences } from '../notification-preferences';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseNotificationPreferences = vi.fn();
const mockUseUpdateNotificationPreference = vi.fn();

vi.mock('@/hooks/use-notification-preferences', () => ({
  useNotificationPreferences: (...args: unknown[]) => mockUseNotificationPreferences(...args),
  useUpdateNotificationPreference: (...args: unknown[]) => mockUseUpdateNotificationPreference(...args),
  preferenceKeys: {
    all: (projectId: string) => ['notification-preferences', projectId],
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
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
    email: false,
    slack: true,
    teams: false,
    telegram: false,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-2',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'STATUS_INCIDENT',
    enabled: true,
    email: true,
    slack: false,
    teams: false,
    telegram: false,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-3',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'STATUS_BLOCKING',
    enabled: true,
    email: false,
    slack: false,
    teams: true,
    telegram: false,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-4',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'STATUS_FINAL',
    enabled: false,
    email: false,
    slack: false,
    teams: false,
    telegram: false,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-5',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'EVENT_UPCOMING',
    enabled: true,
    email: false,
    slack: false,
    teams: false,
    telegram: true,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNotificationPreferences.mockReturnValue({
      data: mockPreferences,
      isLoading: false,
      error: null,
    });
    mockUseUpdateNotificationPreference.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('renders toggle for each alert type', () => {
    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/document expiring/i)).toBeInTheDocument();
    expect(screen.getByText(/status incident/i)).toBeInTheDocument();
    expect(screen.getByText(/status blocking/i)).toBeInTheDocument();
    expect(screen.getByText(/status final/i)).toBeInTheDocument();
    expect(screen.getByText(/event upcoming/i)).toBeInTheDocument();
  });

  it('shows enabled state for enabled preferences', () => {
    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    // Document Expiring is enabled - its switch should be checked
    const switches = screen.getAllByRole('switch');
    const docSwitch = switches[0]; // First switch = DOCUMENT_EXPIRING
    expect(docSwitch).toBeChecked();
  });

  it('shows disabled state for disabled preferences', () => {
    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    // STATUS_FINAL is disabled (enabled: false)
    // Each row has 5 switches: [in-app, email, slack, teams, telegram]
    // STATUS_FINAL is row 3, in-app switch is at index 3*5+0 = 15
    const switches = screen.getAllByRole('switch');
    const finalSwitch = switches[15];
    expect(finalSwitch).not.toBeChecked();
  });

  it('calls update mutation when toggle is clicked off', async () => {
    const mutate = vi.fn();
    mockUseUpdateNotificationPreference.mockReturnValue({
      mutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    const switches = screen.getAllByRole('switch');
    await user.click(switches[0]); // Toggle DOCUMENT_EXPIRING off

    expect(mutate).toHaveBeenCalledWith({
      alertType: 'DOCUMENT_EXPIRING',
      enabled: false,
    });
  });

  it('calls update mutation when toggle is clicked on', async () => {
    const mutate = vi.fn();
    mockUseUpdateNotificationPreference.mockReturnValue({
      mutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    // STATUS_FINAL is row 3, in-app switch is at index 3*5+0 = 15
    const switches = screen.getAllByRole('switch');
    await user.click(switches[15]); // Toggle STATUS_FINAL in-app on

    expect(mutate).toHaveBeenCalledWith({
      alertType: 'STATUS_FINAL',
      enabled: true,
    });
  });

  it('shows loading state while fetching', () => {
    mockUseNotificationPreferences.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state when fetch fails', () => {
    mockUseNotificationPreferences.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  // -----------------------------------------------------------------------
  // Channel toggle tests (Phase 10 — External Notifications)
  // -----------------------------------------------------------------------

  it('renders channel toggle heading', () => {
    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/notification channels/i)).toBeInTheDocument();
  });

  it('renders channel toggle column headers', () => {
    render(<NotificationPreferences projectId="proj-1" />, { wrapper: createWrapper() });

    // Channel labels should be visible
    expect(screen.getByText(/in-app/i)).toBeInTheDocument();
    expect(screen.getAllByText(/email/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/slack/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/teams/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/telegram/i).length).toBeGreaterThanOrEqual(1);
  });

  it('sends channel toggle update for slack', async () => {
    const mutate = vi.fn();
    mockUseUpdateNotificationPreference.mockReturnValue({
      mutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(
      <NotificationPreferences
        projectId="proj-1"
        channelConfigs={[
          {
            id: 'chan-1',
            userId: 'user-1',
            channelType: 'slack',
            config: { webhookUrl: 'https://hooks.slack.com/test' },
            enabled: true,
            createdAt: '2026-07-18T10:00:00Z',
            updatedAt: '2026-07-18T10:00:00Z',
          },
          {
            id: 'chan-2',
            userId: 'user-1',
            channelType: 'email' as never,
            config: {},
            enabled: true,
            createdAt: '2026-07-18T10:00:00Z',
            updatedAt: '2026-07-18T10:00:00Z',
          },
        ]}
      />,
      { wrapper: createWrapper() }
    );

    // DOCUMENT_EXPIRING has slack: true. Click to toggle off.
    // Row layout: [in-app, email, slack, teams, telegram] per row
    // Row 0 (DOCUMENT_EXPIRING): slack switch is at index 2
    const allSwitches = screen.getAllByRole('switch');
    const slackSwitch = allSwitches[2]; // Row 0, col 2 (slack)
    await user.click(slackSwitch);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: 'DOCUMENT_EXPIRING',
        slack: false,
      })
    );
  });

  it('sends channel toggle update for email', async () => {
    const mutate = vi.fn();
    mockUseUpdateNotificationPreference.mockReturnValue({
      mutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(<NotificationPreferences projectId="proj-1" channelConfigs={[]} />, {
      wrapper: createWrapper(),
    });

    // Email is always "configured" (uses SMTP env, not per-user config)
    // Row 0 (DOCUMENT_EXPIRING): email switch is at index 1
    const allSwitches = screen.getAllByRole('switch');
    const emailSwitch = allSwitches[1]; // Row 0, col 1 (email)
    await user.click(emailSwitch);

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: 'DOCUMENT_EXPIRING',
        email: true,
      })
    );
  });
});
