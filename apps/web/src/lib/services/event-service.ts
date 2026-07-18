import { RRule } from 'rrule';
import { createEventSchema, updateEventSchema } from '@mantemap/validation';
import { NotFoundError } from '@mantemap/shared';
import type { CreateEventInput, UpdateEventInput } from '@mantemap/validation';
import {
  createEvent as createEventRepo,
  findEventById,
  findEventsByDateRange,
  updateEvent as updateEventRepo,
  deleteEvent as deleteEventRepo,
  type CreateEventData,
  type UpdateEventData,
} from '@/lib/repositories/event-repository';
import prisma from '@mantemap/database';
import type { PrismaClient } from '@mantemap/database';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';
import { getExpirationColor } from '@/lib/utils/expiration-color';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  color?: string;
  type: 'manual' | 'document_expiration';
  eventId?: string;
  documentId?: string;
  itemId?: string;
  rrule?: string | null;
  description?: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Expand a recurring event into individual occurrences within a date range.
 * Non-recurring events are returned as-is.
 */
export function expandRecurringEvents(
  events: Array<{
    id: string;
    projectId: string;
    itemId: string | null;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    allDay: boolean;
    rrule: string | null;
    color: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const result: CalendarEvent[] = [];

  for (const event of events) {
    if (!event.rrule) {
      // Non-recurring: return as single event
      result.push({
        id: event.id,
        title: event.title,
        start: event.startAt.toISOString(),
        end: event.endAt.toISOString(),
        allDay: event.allDay,
        color: event.color ?? undefined,
        type: 'manual',
        eventId: event.id,
        itemId: event.itemId ?? undefined,
        rrule: event.rrule,
        description: event.description,
      });
      continue;
    }

    // Recurring: parse RRULE and expand
    try {
      const rule = RRule.fromString(`DTSTART:${event.startAt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}\nRRULE:${event.rrule}`);
      const occurrences = rule.between(rangeStart, rangeEnd, true);

      const durationMs = event.endAt.getTime() - event.startAt.getTime();

      for (const occurrence of occurrences) {
        const occEnd = new Date(occurrence.getTime() + durationMs);
        result.push({
          id: `${event.id}_${occurrence.toISOString()}`,
          title: event.title,
          start: occurrence.toISOString(),
          end: occEnd.toISOString(),
          allDay: event.allDay,
          color: event.color ?? undefined,
          type: 'manual',
          eventId: event.id,
          itemId: event.itemId ?? undefined,
          rrule: event.rrule,
          description: event.description,
        });
      }
    } catch {
      // Invalid RRULE — treat as non-recurring
      result.push({
        id: event.id,
        title: event.title,
        start: event.startAt.toISOString(),
        end: event.endAt.toISOString(),
        allDay: event.allDay,
        color: event.color ?? undefined,
        type: 'manual',
        eventId: event.id,
        itemId: event.itemId ?? undefined,
        rrule: event.rrule,
        description: event.description,
      });
    }
  }

  return result;
}

/**
 * Generate virtual calendar events from documents with expiresAt
 * that fall within the date range, scoped to items in the project.
 */
export async function generateExpirationEvents(
  projectId: string,
  rangeStart: Date,
  rangeEnd: Date,
  client: PrismaClient = prisma,
  now: Date = new Date()
): Promise<CalendarEvent[]> {
  // Find documents with expiresAt in range, belonging to items in this project
  const documents = await client.document.findMany({
    where: {
      expiresAt: {
        not: null,
        gte: rangeStart,
        lte: rangeEnd,
      },
      item: {
        itemType: {
          projectId,
        },
      },
    },
    include: {
      item: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return documents.map((doc) => ({
    id: `doc-exp-${doc.id}`,
    title: `📄 ${doc.name}`,
    start: doc.expiresAt!.toISOString(),
    end: doc.expiresAt!.toISOString(),
    allDay: true,
    color: getExpirationColor(doc.expiresAt!, now),
    type: 'document_expiration' as const,
    documentId: doc.id,
    itemId: doc.itemId,
    description: `Document expires: ${doc.name}`,
  }));
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createEvent(
  projectId: string,
  input: CreateEventInput,
  userId: string
) {
  const parsed = createEventSchema.parse(input);
  await requireProjectOwner(projectId, userId);

  const createData: CreateEventData = {
    title: parsed.title,
    description: parsed.description ?? null,
    startAt: new Date(parsed.startAt),
    endAt: parsed.endAt ? new Date(parsed.endAt) : new Date(parsed.startAt),
    allDay: parsed.allDay,
    itemId: parsed.itemId ?? null,
    rrule: parsed.rrule ?? null,
    color: parsed.color ?? null,
  };

  const event = await createEventRepo(projectId, createData);
  return { event };
}

export async function getEvent(
  projectId: string,
  eventId: string,
  userId: string
) {
  await requireProjectMember(projectId, userId);

  const event = await findEventById(projectId, eventId);
  if (!event) throw new NotFoundError('Event', eventId);
  return { event };
}

export async function getEventsInRange(
  projectId: string,
  rangeStart: Date,
  rangeEnd: Date,
  userId: string,
  typeFilter?: 'manual' | 'document_expiration'
) {
  await requireProjectMember(projectId, userId);

  const allEvents: CalendarEvent[] = [];

  // Fetch manual events (unless filtering for document_expiration only)
  if (typeFilter !== 'document_expiration') {
    const manualEvents = await findEventsByDateRange(projectId, rangeStart, rangeEnd);
    const expanded = expandRecurringEvents(manualEvents, rangeStart, rangeEnd);
    allEvents.push(...expanded);
  }

  // Fetch document expiration events (unless filtering for manual only)
  if (typeFilter !== 'manual') {
    const expirationEvents = await generateExpirationEvents(projectId, rangeStart, rangeEnd);
    allEvents.push(...expirationEvents);
  }

  // Sort by start date
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return { events: allEvents };
}

export async function updateEvent(
  projectId: string,
  eventId: string,
  input: UpdateEventInput,
  userId: string
) {
  const parsed = updateEventSchema.parse(input);
  await requireProjectOwner(projectId, userId);

  const updateData: UpdateEventData = {};
  if (parsed.title !== undefined) updateData.title = parsed.title;
  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.startAt !== undefined) updateData.startAt = new Date(parsed.startAt);
  if (parsed.endAt !== undefined && parsed.endAt !== null) updateData.endAt = new Date(parsed.endAt);
  if (parsed.allDay !== undefined) updateData.allDay = parsed.allDay;
  if (parsed.rrule !== undefined) updateData.rrule = parsed.rrule;
  if (parsed.color !== undefined) updateData.color = parsed.color;

  const event = await updateEventRepo(projectId, eventId, updateData);
  return { event };
}

export async function deleteEvent(
  projectId: string,
  eventId: string,
  userId: string
) {
  await requireProjectOwner(projectId, userId);
  await deleteEventRepo(projectId, eventId);
}
