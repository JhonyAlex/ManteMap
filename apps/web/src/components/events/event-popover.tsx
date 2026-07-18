/**
 * EventPopover — displays event details on click.
 *
 * Shows title, dates, type. Document expiration events are read-only
 * (no edit/delete actions).
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Event Display" — clicking event shows detail popover
 * Design: openspec/changes/phase-6-events/design.md
 *   "Click event popover showing title, dates, type"
 */

'use client';

import React from 'react';
import type { CalendarEvent } from '@/hooks/use-events';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EventPopoverProps {
  event: CalendarEvent;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventPopover({
  event,
  onEdit,
  onDelete,
  onClose,
}: EventPopoverProps) {
  const isDocumentExpiration = event.type === 'document_expiration';
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);

  const formatDate = (date: Date) => {
    if (event.allDay) {
      return date.toLocaleDateString();
    }
    return date.toLocaleString();
  };

  return (
    <div
      role="dialog"
      aria-label="Event details"
      className="w-72 rounded-lg border bg-background p-4 shadow-lg"
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-sm font-semibold leading-tight">{event.title}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Type badge */}
      <div className="mb-2">
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
            isDocumentExpiration
              ? 'bg-amber-100 text-amber-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {isDocumentExpiration ? '📄 Document Expiration' : '📅 Event'}
        </span>
      </div>

      {/* Dates */}
      <div className="mb-3 space-y-1 text-sm text-muted-foreground">
        <p>
          <span className="font-medium">Start:</span> {formatDate(startDate)}
        </p>
        {!event.allDay && (
          <p>
            <span className="font-medium">End:</span> {formatDate(endDate)}
          </p>
        )}
        {event.allDay && <p className="text-xs">All day</p>}
      </div>

      {/* Description */}
      {event.description && (
        <p className="mb-3 text-sm text-muted-foreground">{event.description}</p>
      )}

      {/* RRULE indicator */}
      {event.rrule && (
        <p className="mb-3 text-xs text-muted-foreground">
          🔁 Recurring: {event.rrule}
        </p>
      )}

      {/* Actions — hidden for document expirations */}
      {!isDocumentExpiration && (
        <div className="flex gap-2 border-t pt-3">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(event)}
              className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Edit
            </button>
          )}
          {onDelete && event.eventId && (
            <button
              type="button"
              onClick={() => onDelete(event.eventId!)}
              className="inline-flex h-8 items-center justify-center rounded-md border border-destructive bg-background px-3 text-xs font-medium text-destructive ring-offset-background transition-colors hover:bg-destructive/10"
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Read-only notice for document expirations */}
      {isDocumentExpiration && (
        <p className="border-t pt-3 text-xs text-muted-foreground">
          This is an auto-generated document expiration event.
        </p>
      )}
    </div>
  );
}
