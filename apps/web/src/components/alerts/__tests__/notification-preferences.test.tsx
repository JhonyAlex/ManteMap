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
    alertType: 'STATUS_BLOCKING',
    enabled: true,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-4',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'STATUS_FINAL',
    enabled: false,
    createdAt: '2026-07-18T10:00:00Z',
    updatedAt: '2026-07-18T10:00:00Z',
  },
  {
    id: 'pref-5',
    userId: 'user-1',
    projectId: 'proj-1',
    alertType: 'EVENT_UPCOMING',
    enabled: true,
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
    const switches = screen.getAllByRole('switch');
    const finalSwitch = switches[3]; // Fourth switch = STATUS_FINAL
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

    const switches = screen.getAllByRole('switch');
    await user.click(switches[3]); // Toggle STATUS_FINAL on

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
});
