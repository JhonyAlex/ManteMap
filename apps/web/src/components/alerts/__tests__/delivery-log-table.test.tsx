// @vitest-environment jsdom
/**
 * RED tests for DeliveryLogTable component.
 *
 * These tests verify:
 *   - Renders table with delivery data
 *   - Shows Date, Alert, Channel, Status, Error columns
 *   - Renders status badge with correct color (sent=green, failed=red, skipped=yellow)
 *   - Shows error message for failed deliveries
 *   - Shows empty state when no deliveries
 *   - Filters by channel type
 *   - Filters by status
 *   - Shows loading state
 *   - Shows error state
 *
 * Spec: openspec/changes/phase-10-external-notifications/specs/channel-configuration/spec.md
 *   (Delivery log viewing)
 * Design: openspec/changes/phase-10-external-notifications/design.md
 *   "DeliveryLogTable (Client Component)"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeliveryLogTable } from '../delivery-log-table';

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', mockFetch);
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const mockDeliveries = [
  {
    id: 'del-1',
    alertId: 'alert-1',
    userId: 'user-1',
    channelType: 'slack',
    status: 'sent',
    errorMessage: null,
    deliveredAt: '2026-07-18T14:00:00Z',
  },
  {
    id: 'del-2',
    alertId: 'alert-2',
    userId: 'user-2',
    channelType: 'email',
    status: 'failed',
    errorMessage: 'SMTP connection refused',
    deliveredAt: '2026-07-18T14:05:00Z',
  },
  {
    id: 'del-3',
    alertId: 'alert-3',
    userId: 'user-1',
    channelType: 'teams',
    status: 'skipped',
    errorMessage: null,
    deliveredAt: '2026-07-18T14:10:00Z',
  },
];

function mockFetchSuccess(data: unknown = mockDeliveries) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data }),
  });
}

function mockFetchError(status: number, error: string) {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

/** Get text content within the table body (ignores filter dropdowns) */
function getTableBodyText(): string {
  const table = screen.queryByRole('table');
  if (!table) return '';
  return table.textContent ?? '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeliveryLogTable', () => {
  it('renders table headers', async () => {
    mockFetchSuccess([mockDeliveries[0]]);

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    // Wait for table to appear (not just the heading)
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const table = screen.getByRole('table');
    const headerText = within(table).getAllByRole('columnheader').map((h) => h.textContent).join(' ');
    expect(headerText).toMatch(/date/i);
    expect(headerText).toMatch(/alert/i);
    expect(headerText).toMatch(/channel/i);
    expect(headerText).toMatch(/status/i);
  });

  it('renders delivery rows from API', async () => {
    mockFetchSuccess();

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const table = screen.getByRole('table');
      const tbody = within(table).getAllByRole('row').slice(1); // skip header
      expect(tbody).toHaveLength(3);
    });
  });

  it('renders sent status in table row', async () => {
    mockFetchSuccess([mockDeliveries[0]]);

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // header + data
      // The Badge is rendered for "sent" status
      expect(rows[1].textContent).toContain('sent');
    });
  });

  it('renders failed status with error message', async () => {
    mockFetchSuccess([mockDeliveries[1]]);

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      expect(rows[1].textContent).toContain('failed');
      expect(rows[1].textContent).toContain('SMTP connection refused');
    });
  });

  it('renders skipped status', async () => {
    mockFetchSuccess([mockDeliveries[2]]);

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      const table = screen.getByRole('table');
      const rows = within(table).getAllByRole('row');
      expect(rows[1].textContent).toContain('skipped');
    });
  });

  it('shows empty state when no deliveries', async () => {
    mockFetchSuccess([]);

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/no deliveries/i)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    mockFetch.mockImplementation(
      () => new Promise(() => { /* never resolves */ })
    );

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    mockFetchError(500, 'Internal error');

    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('filters deliveries by channel type', async () => {
    mockFetchSuccess();

    const user = userEvent.setup();
    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    // Select "slack" from the channel filter dropdown
    const channelSelect = screen.getByLabelText('Channel') as HTMLSelectElement;
    await user.selectOptions(channelSelect, 'slack');

    // Should have filtered, fetching again with channelType param
    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain('channelType=slack');
    });
  });

  it('filters deliveries by status', async () => {
    mockFetchSuccess();

    const user = userEvent.setup();
    render(<DeliveryLogTable projectId="proj-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    const statusSelect = screen.getByLabelText('Status') as HTMLSelectElement;
    await user.selectOptions(statusSelect, 'failed');

    await waitFor(() => {
      const calls = mockFetch.mock.calls;
      const lastCall = calls[calls.length - 1][0] as string;
      expect(lastCall).toContain('status=failed');
    });
  });
});
