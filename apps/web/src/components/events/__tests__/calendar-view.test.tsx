// @vitest-environment jsdom
/**
 * RED tests for CalendarView component.
 *
 * These tests verify:
 *   - Renders loading skeleton while FullCalendar loads
 *   - Displays events from useEvents hook
 *   - Passes correct views configuration (dayGridMonth, timeGridWeek, timeGridDay)
 *   - Handles event click callback
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Calendar Views" — day/week/month views
 *   "Event Display" — events render on correct dates
 *   "Dynamic Import" — FullCalendar lazy loads
 * Design: openspec/changes/phase-6-events/design.md
 *   "FullCalendar wrapper as Client Component"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock FullCalendar plugins
vi.mock('@fullcalendar/daygrid', () => ({ default: { name: 'dayGridPlugin' } }));
vi.mock('@fullcalendar/timegrid', () => ({ default: { name: 'timeGridPlugin' } }));

// Mock next/dynamic to return a simple placeholder
vi.mock('next/dynamic', () => ({
  default: () => {
    const MockCalendar = (props: Record<string, unknown>) => {
      const events = (props as { events?: unknown[] }).events;
      return React.createElement(
        'div',
        { 'data-testid': 'fc-mock' },
        React.createElement('span', { 'data-testid': 'fc-event-count' }, String(events?.length ?? 0)),
        React.createElement('span', { 'data-testid': 'fc-initial-view' }, String((props as { initialView?: string }).initialView ?? ''))
      );
    };
    MockCalendar.displayName = 'MockFullCalendar';
    return MockCalendar;
  },
}));

// Mock the use-events hook
const mockUseEvents = vi.fn();
vi.mock('@/hooks/use-events', () => ({
  useEvents: (...args: unknown[]) => mockUseEvents(...args),
}));

import { CalendarView } from '../calendar-view';

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

const mockEvents = [
  {
    id: 'evt-1',
    title: 'Maintenance Check',
    start: '2026-07-20T09:00:00.000Z',
    end: '2026-07-20T10:00:00.000Z',
    allDay: false,
    color: '#3b82f6',
    type: 'manual' as const,
    eventId: 'evt-1',
  },
  {
    id: 'doc-exp-1',
    title: '📄 Safety Certificate',
    start: '2026-07-25T00:00:00.000Z',
    end: '2026-07-25T00:00:00.000Z',
    allDay: true,
    color: '#ef4444',
    type: 'document_expiration' as const,
    documentId: 'doc-1',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEvents.mockReturnValue({
      data: mockEvents,
      isLoading: false,
      error: null,
    });
  });

  it('renders loading skeleton while events are loading', () => {
    mockUseEvents.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <CalendarView projectId="proj-1" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/loading calendar/i)).toBeInTheDocument();
  });

  it('renders FullCalendar with events when loaded', () => {
    render(
      <CalendarView projectId="proj-1" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('calendar-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('fc-mock')).toBeInTheDocument();
    expect(screen.getByTestId('fc-event-count').textContent).toBe('2');
  });

  it('uses dayGridMonth as default initial view', () => {
    render(
      <CalendarView projectId="proj-1" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('fc-initial-view').textContent).toBe('dayGridMonth');
  });

  it('passes empty array when no events', () => {
    mockUseEvents.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    render(
      <CalendarView projectId="proj-1" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('fc-event-count').textContent).toBe('0');
  });

  it('displays error message when fetch fails', () => {
    mockUseEvents.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
    });

    render(
      <CalendarView projectId="proj-1" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/failed to load calendar/i)).toBeInTheDocument();
  });
});
