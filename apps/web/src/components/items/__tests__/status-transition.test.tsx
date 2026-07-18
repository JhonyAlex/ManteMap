/**
 * Tests for StatusTransition component.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Status transition UI" — dropdown, isFinal, toast on error
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Status transition as DropdownMenu on detail page"
 *
 * Acceptance criteria:
 *   - Shows available status transitions in a dropdown
 *   - Disabled when current status isFinal
 *   - Shows toast on 409 (conflict) or 404 errors
 *   - Calls useTransitionStatus mutation on selection
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusTransition } from '../status-transition';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockMutateAsync = vi.fn();
const mockMutate = vi.fn();

vi.mock('@/hooks/use-items', () => ({
  useTransitionStatus: () => ({
    mutateAsync: mockMutateAsync,
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@mantemap/ui', async () => {
  const actual = await vi.importActual('@mantemap/ui');
  return {
    ...actual,
    DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuTrigger: ({
      children,
      disabled,
      className,
    }: {
      children: React.ReactNode;
      disabled?: boolean;
      className?: string;
    }) => (
      <button disabled={disabled} className={className}>
        {children}
      </button>
    ),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuItem: ({
      children,
      onClick,
      disabled,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
    }) => (
      <button onClick={onClick} disabled={disabled} data-testid="transition-item">
        {children}
      </button>
    ),
    DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const availableStatuses = [
  { id: 's1', name: 'Open', key: 'open', color: '#22c55e', isFinal: false },
  { id: 's2', name: 'In Progress', key: 'in-progress', color: '#3b82f6', isFinal: false },
  { id: 's3', name: 'Completed', key: 'completed', color: '#6b7280', isFinal: true },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StatusTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockReset();
    mockMutate.mockReset();
  });

  it('renders available transition options', () => {
    render(
      <StatusTransition
        projectId="proj-1"
        itemId="item-1"
        currentStatusId="s1"
        availableStatuses={availableStatuses}
      />
    );

    // The trigger button should be visible
    expect(screen.getByRole('button', { name: /change status/i })).toBeInTheDocument();
  });

  it('is disabled when current status is final', () => {
    render(
      <StatusTransition
        projectId="proj-1"
        itemId="item-1"
        currentStatusId="s3"
        availableStatuses={availableStatuses}
      />
    );

    const trigger = screen.getByRole('button', { name: /change status/i });
    expect(trigger).toBeDisabled();
  });

  it('is enabled when current status is not final', () => {
    render(
      <StatusTransition
        projectId="proj-1"
        itemId="item-1"
        currentStatusId="s1"
        availableStatuses={availableStatuses}
      />
    );

    const trigger = screen.getByRole('button', { name: /change status/i });
    expect(trigger).not.toBeDisabled();
  });

  it('calls transition mutation when a status is selected', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({});

    render(
      <StatusTransition
        projectId="proj-1"
        itemId="item-1"
        currentStatusId="s1"
        availableStatuses={availableStatuses}
      />
    );

    // Click a transition option
    const items = screen.getAllByTestId('transition-item');
    // First item should be "In Progress" (skipping current status "Open")
    await user.click(items[0]!);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('s2');
    });
  });

  it('shows toast error on 409 conflict', async () => {
    const { toast } = await import('sonner');
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(new Error('Item is in a final status'));

    render(
      <StatusTransition
        projectId="proj-1"
        itemId="item-1"
        currentStatusId="s1"
        availableStatuses={availableStatuses}
      />
    );

    const items = screen.getAllByTestId('transition-item');
    await user.click(items[0]!);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('final status')
      );
    });
  });
});
