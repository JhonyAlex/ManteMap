/**
 * EventFormDialog — Client Component for creating/editing events.
 *
 * Renders a dialog with React Hook Form + Zod validation.
 * Includes a recurrence picker for RRULE generation.
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Event Display" — events with title, color, time
 * Design: openspec/changes/phase-6-events/design.md
 *   "Dialog with React Hook Form + Zod, recurrence picker"
 */

'use client';

import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateEvent, useUpdateEvent } from '@/hooks/use-events';
import type { CalendarEvent } from '@/hooks/use-events';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const eventFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  startAt: z.string().min(1, 'Start date is required'),
  endAt: z.string().optional(),
  allDay: z.boolean().optional(),
  color: z.string().optional(),
  recurrenceFrequency: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']).optional(),
  recurrenceInterval: z.number().min(1).max(99).optional(),
  recurrenceDayOfWeek: z.array(z.string()).optional(),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build an RRULE string from recurrence picker values.
 */
function buildRrule(
  frequency: string,
  interval: number,
  daysOfWeek: string[]
): string | undefined {
  if (frequency === 'none') return undefined;

  const parts: string[] = [`FREQ=${frequency.toUpperCase()}`];

  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }

  if (frequency === 'weekly' && daysOfWeek.length > 0) {
    parts.push(`BYDAY=${daysOfWeek.join(',')}`);
  }

  return parts.join(';');
}

/**
 * Format a Date or ISO string to datetime-local input value.
 */
function toDatetimeLocal(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 16);
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EventFormDialogProps {
  projectId: string;
  event?: CalendarEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EventFormDialog({
  projectId,
  event,
  open,
  onOpenChange,
  defaultDate,
}: EventFormDialogProps) {
  const isEdit = Boolean(event);
  const createMutation = useCreateEvent(projectId);
  const updateMutation = useUpdateEvent(projectId, event?.eventId ?? '');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: event?.title ?? '',
      description: event?.description ?? '',
      startAt: event ? toDatetimeLocal(event.start) : (defaultDate ?? ''),
      endAt: event ? toDatetimeLocal(event.end) : '',
      allDay: event?.allDay ?? false,
      color: event?.color ?? '#3b82f6',
      recurrenceFrequency: 'none',
      recurrenceInterval: 1,
      recurrenceDayOfWeek: [],
    },
  });

  const recurrenceFrequency = watch('recurrenceFrequency');

  const onSubmit = useCallback(
    async (data: EventFormValues) => {
      setSubmitError(null);

      const rrule = buildRrule(
        data.recurrenceFrequency ?? 'none',
        data.recurrenceInterval ?? 1,
        data.recurrenceDayOfWeek ?? []
      );

      const payload = {
        title: data.title,
        description: data.description || undefined,
        startAt: new Date(data.startAt).toISOString(),
        endAt: data.endAt ? new Date(data.endAt).toISOString() : undefined,
        allDay: data.allDay ?? false,
        color: data.color || undefined,
        rrule,
      };

      try {
        if (isEdit) {
          await updateMutation.mutateAsync(payload);
        } else {
          await createMutation.mutateAsync(payload);
        }
        onOpenChange(false);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to save event');
      }
    },
    [createMutation, updateMutation, isEdit, onOpenChange]
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit event' : 'Create event'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">
          {isEdit ? 'Edit Event' : 'Create Event'}
        </h2>

        {submitError && (
          <div className="mb-4 rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <label htmlFor="event-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="event-title"
              type="text"
              {...register('title')}
              placeholder="Event title"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label htmlFor="event-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="event-description"
              {...register('description')}
              placeholder="Optional description"
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="event-start" className="text-sm font-medium">
                Start <span className="text-destructive">*</span>
              </label>
              <input
                id="event-start"
                type="datetime-local"
                {...register('startAt')}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {errors.startAt && (
                <p className="text-sm text-destructive">{errors.startAt.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="event-end" className="text-sm font-medium">
                End
              </label>
              <input
                id="event-end"
                type="datetime-local"
                {...register('endAt')}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* All Day + Color */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                {...register('allDay')}
                className="h-4 w-4 rounded border-input"
              />
              All day
            </label>
            <div className="flex items-center gap-2">
              <label htmlFor="event-color" className="text-sm font-medium">
                Color
              </label>
              <input
                id="event-color"
                type="color"
                {...register('color')}
                className="h-8 w-8 rounded border border-input"
              />
            </div>
          </div>

          {/* Recurrence Picker */}
          <div className="space-y-2 rounded-md border p-3">
            <div className="space-y-1">
              <label htmlFor="event-recurrence" className="text-sm font-medium">
                Repeat
              </label>
              <select
                id="event-recurrence"
                {...register('recurrenceFrequency')}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {recurrenceFrequency && recurrenceFrequency !== 'none' && (
              <>
                <div className="space-y-1">
                  <label htmlFor="event-interval" className="text-sm font-medium">
                    Every
                  </label>
                  <input
                    id="event-interval"
                    type="number"
                    min={1}
                    max={99}
                    {...register('recurrenceInterval', { valueAsNumber: true })}
                    className="h-9 w-20 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <span className="ml-2 text-sm text-muted-foreground">
                    {recurrenceFrequency === 'daily' && 'day(s)'}
                    {recurrenceFrequency === 'weekly' && 'week(s)'}
                    {recurrenceFrequency === 'monthly' && 'month(s)'}
                    {recurrenceFrequency === 'yearly' && 'year(s)'}
                  </span>
                </div>

                {recurrenceFrequency === 'weekly' && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">On days</span>
                    <div className="flex flex-wrap gap-2">
                      {['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'].map((day) => (
                        <label
                          key={day}
                          className="flex items-center gap-1 text-sm"
                        >
                          <input
                            type="checkbox"
                            value={day}
                            {...register('recurrenceDayOfWeek')}
                            className="h-4 w-4 rounded border-input"
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {isEdit ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
