/**
 * CalendarView — Client Component wrapping FullCalendar.
 *
 * Loads FullCalendar via next/dynamic to keep the ~200KB bundle out of
 * the main chunk. Fetches events from the API via useEvents hook.
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Calendar Views" — day/week/month views
 *   "Event Display" — events render with color
 *   "Dynamic Import" — FullCalendar lazy loads
 * Design: openspec/changes/phase-6-events/design.md
 *   "FullCalendar wrapper as Client Component with dynamic import"
 */

'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import type { DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core';
import { useEvents } from '@/hooks/use-events';
import type { CalendarEvent } from '@/hooks/use-events';

// ---------------------------------------------------------------------------
// Dynamic import — FullCalendar loaded client-side only
// ---------------------------------------------------------------------------

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <p className="text-muted-foreground">Loading calendar...</p>
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert CalendarEvent from the API to FullCalendar EventInput format.
 */
function toEventInput(event: CalendarEvent): EventInput {
  return {
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    backgroundColor: event.color ?? undefined,
    borderColor: event.color ?? undefined,
    extendedProps: {
      type: event.type,
      eventId: event.eventId,
      documentId: event.documentId,
      itemId: event.itemId,
      rrule: event.rrule,
      description: event.description,
    },
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CalendarViewProps {
  projectId: string;
  onEventClick?: (event: CalendarEvent) => void;
  onDateRangeChange?: (start: string, end: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CalendarView({
  projectId,
  onEventClick,
  onDateRangeChange,
}: CalendarViewProps) {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const { data: events, isLoading, error } = useEvents(
    projectId,
    dateRange.start,
    dateRange.end
  );

  const handleDatesSet = useCallback(
    (info: DatesSetArg) => {
      const start = info.startStr;
      const end = info.endStr;
      setDateRange({ start, end });
      onDateRangeChange?.(start, end);
    },
    [onDateRangeChange]
  );

  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      if (!onEventClick) return;
      const { extendedProps } = info.event;
      onEventClick({
        id: String(extendedProps.eventId ?? info.event.id),
        title: info.event.title,
        start: info.event.startStr,
        end: info.event.endStr,
        allDay: info.event.allDay,
        color: info.event.backgroundColor ?? undefined,
        type: extendedProps.type as 'manual' | 'document_expiration',
        eventId: extendedProps.eventId as string | undefined,
        documentId: extendedProps.documentId as string | undefined,
        itemId: extendedProps.itemId as string | undefined,
        rrule: extendedProps.rrule as string | null | undefined,
        description: extendedProps.description as string | null | undefined,
      });
    },
    [onEventClick]
  );

  const calendarEvents: EventInput[] = (events ?? []).map(toEventInput);

  // Loading state (initial load before date range is set)
  if (isLoading && !dateRange.start) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">
          Failed to load calendar: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-4" data-testid="calendar-wrapper">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={calendarEvents}
        datesSet={handleDatesSet}
        eventClick={handleEventClick}
        height="auto"
        nowIndicator={true}
        editable={false}
        dayMaxEvents={3}
      />
    </div>
  );
}
