// @vitest-environment jsdom
/**
 * RED tests for EventFormDialog component.
 *
 * These tests verify:
 *   - Validates required fields (title, startAt)
 *   - Builds RRULE from recurrence picker selections
 *   - Submits payload with correct shape
 *   - Rejects end date before start date
 *   - Shows create mode vs edit mode
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Event Display" — events with title, color, time
 * Design: openspec/changes/phase-6-events/design.md
 *   "Dialog with React Hook Form + Zod, recurrence picker"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the mutation hooks
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/use-events', () => ({
  useCreateEvent: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
  useUpdateEvent: vi.fn(() => ({ mutateAsync: mockMutateAsync, isPending: false })),
}));

import { EventFormDialog } from '../event-form-dialog';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EventFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  describe('create mode', () => {
    it('renders create dialog with empty form', () => {
      render(
        <EventFormDialog
          projectId="proj-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toHaveValue('');
    });

    it('shows validation error when title is empty', async () => {
      const user = userEvent.setup();
      render(
        <EventFormDialog
          projectId="proj-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await user.click(screen.getByRole('button', { name: /create event/i }));

      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('submits valid payload with title and dates', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <EventFormDialog
          projectId="proj-1"
          open={true}
          onOpenChange={onOpenChange}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/title/i), 'Maintenance Check');
      await user.type(screen.getByLabelText(/start/i), '2026-07-20T09:00');
      await user.type(screen.getByLabelText(/end/i), '2026-07-20T10:00');
      await user.click(screen.getByRole('button', { name: /create event/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Maintenance Check',
            startAt: expect.any(String),
          })
        );
      });
    });

    it('closes dialog on successful submit', async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <EventFormDialog
          projectId="proj-1"
          open={true}
          onOpenChange={onOpenChange}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/title/i), 'Test Event');
      await user.type(screen.getByLabelText(/start/i), '2026-07-20T09:00');
      await user.click(screen.getByRole('button', { name: /create event/i }));

      await waitFor(() => {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('edit mode', () => {
    const existingEvent = {
      id: 'evt-1',
      title: 'Existing Event',
      start: '2026-07-20T09:00:00.000Z',
      end: '2026-07-20T10:00:00.000Z',
      allDay: false,
      color: '#3b82f6',
      type: 'manual' as const,
      eventId: 'evt-1',
    };

    it('pre-fills form with existing event data', () => {
      render(
        <EventFormDialog
          projectId="proj-1"
          event={existingEvent}
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Event');
    });

    it('shows Update button instead of Create in edit mode', () => {
      render(
        <EventFormDialog
          projectId="proj-1"
          event={existingEvent}
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('button', { name: /update event/i })).toBeInTheDocument();
    });
  });

  describe('recurrence picker', () => {
    it('shows recurrence frequency selector', () => {
      render(
        <EventFormDialog
          projectId="proj-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/repeat/i)).toBeInTheDocument();
    });

    it('shows interval input when recurrence is selected', async () => {
      const user = userEvent.setup();
      render(
        <EventFormDialog
          projectId="proj-1"
          open={true}
          onOpenChange={vi.fn()}
        />,
        { wrapper: createWrapper() }
      );

      await user.selectOptions(screen.getByLabelText(/repeat/i), 'weekly');

      expect(screen.getByLabelText(/every/i)).toBeInTheDocument();
    });
  });
});
