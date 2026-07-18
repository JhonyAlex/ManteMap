// @vitest-environment jsdom
/**
 * RED tests for AlertBell component.
 *
 * These tests verify:
 *   - Renders bell icon with unread count badge
 *   - Shows zero state when no unread alerts
 *   - Opens dropdown with recent alerts on click
 *   - Shows loading state while fetching count
 *   - Badge displays correct count
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "Unread Count" — GET /alerts/unread-count returns { count }
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Header bell icon with unread badge (TanStack Query)"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertBell } from '../alert-bell';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseUnreadCount = vi.fn();
const mockUseAlerts = vi.fn();
const mockUseAcknowledge = vi.fn();
const mockUseDismiss = vi.fn();

vi.mock('@/hooks/use-alerts', () => ({
  useUnreadCount: (...args: unknown[]) => mockUseUnreadCount(...args),
  useAlerts: (...args: unknown[]) => mockUseAlerts(...args),
  useAcknowledge: (...args: unknown[]) => mockUseAcknowledge(...args),
  useDismiss: (...args: unknown[]) => mockUseDismiss(...args),
  alertKeys: {
    all: (projectId: string) => ['alerts', projectId],
    list: (projectId: string, filters: Record<string, unknown>) => ['alerts', projectId, 'list', filters],
    unreadCount: (projectId: string) => ['alerts', projectId, 'unread-count'],
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
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

const mockAlertsList = [
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

describe('AlertBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUnreadCount.mockReturnValue({
      data: { count: 3 },
      isLoading: false,
      error: null,
    });
    mockUseAlerts.mockReturnValue({
      data: mockAlertsList,
      isLoading: false,
      error: null,
    });
    mockUseAcknowledge.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseDismiss.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('renders bell icon button', () => {
    render(<AlertBell projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByRole('button', { name: /alerts/i })).toBeInTheDocument();
  });

  it('displays unread count badge when count > 0', () => {
    render(<AlertBell projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not display badge when count is 0', () => {
    mockUseUnreadCount.mockReturnValue({
      data: { count: 0 },
      isLoading: false,
      error: null,
    });

    render(<AlertBell projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('opens dropdown with recent alerts on click', async () => {
    const user = userEvent.setup();
    render(<AlertBell projectId="proj-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /alerts/i }));

    await waitFor(() => {
      expect(screen.getByText(/safety manual/i)).toBeInTheDocument();
      expect(screen.getByText(/pump a/i)).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching count', () => {
    mockUseUnreadCount.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<AlertBell projectId="proj-1" />, { wrapper: createWrapper() });

    // Bell should still render, just without count
    expect(screen.getByRole('button', { name: /alerts/i })).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('shows "View all alerts" link in dropdown', async () => {
    const user = userEvent.setup();
    render(<AlertBell projectId="proj-1" />, { wrapper: createWrapper() });

    await user.click(screen.getByRole('button', { name: /alerts/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view all/i })).toBeInTheDocument();
    });
  });
});
