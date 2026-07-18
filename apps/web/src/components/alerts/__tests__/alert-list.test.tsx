// @vitest-environment jsdom
/**
 * RED tests for AlertList component.
 *
 * These tests verify:
 *   - Renders list of alerts
 *   - Shows empty state when no alerts
 *   - Shows loading state while fetching
 *   - Filters by severity
 *   - Filters by status
 *   - Filters by alert type
 *   - Shows filter controls
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "List filtered by severity" — GET /alerts?severity=warning
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Filterable alert list with severity indicators"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AlertList } from '../alert-list';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUseAlerts = vi.fn();
const mockUseAcknowledge = vi.fn();
const mockUseDismiss = vi.fn();

vi.mock('@/hooks/use-alerts', () => ({
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
  {
    id: 'alert-3',
    projectId: 'proj-1',
    alertType: 'EVENT_UPCOMING',
    severity: 'INFO',
    status: 'ACKNOWLEDGED',
    sourceType: 'event',
    sourceId: 'event-1',
    title: 'Upcoming event: Safety Inspection',
    message: 'Event starts in 3 days',
    metadata: { daysUntilEvent: 3 },
    acknowledgedAt: '2026-07-18T11:00:00Z',
    dismissedAt: null,
    createdAt: '2026-07-18T08:00:00Z',
    updatedAt: '2026-07-18T11:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AlertList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAlerts.mockReturnValue({
      data: mockAlerts,
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

  it('renders list of alerts', () => {
    render(<AlertList projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/safety manual/i)).toBeInTheDocument();
    expect(screen.getByText(/pump a/i)).toBeInTheDocument();
    expect(screen.getByText(/safety inspection/i)).toBeInTheDocument();
  });

  it('shows empty state when no alerts', () => {
    mockUseAlerts.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(<AlertList projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/no alerts/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    mockUseAlerts.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<AlertList projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders severity filter controls', () => {
    render(<AlertList projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByRole('combobox', { name: /severity/i })).toBeInTheDocument();
  });

  it('renders status filter controls', () => {
    render(<AlertList projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
  });

  it('calls useAlerts with default filters (no severity/status/type)', () => {
    render(<AlertList projectId="proj-1" />, { wrapper: createWrapper() });

    // Default call should have only projectId, no filters
    expect(mockUseAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
      })
    );
    expect(mockUseAlerts).not.toHaveBeenCalledWith(
      expect.objectContaining({
        severity: expect.any(String),
      })
    );
  });

  it('shows error state when fetch fails', () => {
    mockUseAlerts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(<AlertList projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
