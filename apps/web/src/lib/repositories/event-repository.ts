import prisma from '@mantemap/database';
import type { Event, PrismaClient } from '@mantemap/database';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateEventData = {
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
  itemId?: string | null;
  rrule?: string | null;
  color?: string | null;
};

export type UpdateEventData = {
  title?: string;
  description?: string | null;
  startAt?: Date;
  endAt?: Date;
  allDay?: boolean;
  rrule?: string | null;
  color?: string | null;
};

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

export async function createEvent(
  projectId: string,
  data: CreateEventData,
  client: PrismaClient = prisma
): Promise<Event> {
  return client.event.create({
    data: {
      projectId,
      title: data.title,
      description: data.description ?? null,
      startAt: data.startAt,
      endAt: data.endAt ?? data.startAt,
      allDay: data.allDay ?? false,
      itemId: data.itemId ?? null,
      rrule: data.rrule ?? null,
      color: data.color ?? null,
    },
  });
}

export async function findEventById(
  projectId: string,
  eventId: string,
  client: PrismaClient = prisma
): Promise<Event | null> {
  return client.event.findFirst({
    where: { id: eventId, projectId },
  });
}

export async function findEventsByDateRange(
  projectId: string,
  start: Date,
  end: Date,
  client: PrismaClient = prisma
): Promise<Event[]> {
  return client.event.findMany({
    where: {
      projectId,
      startAt: { lte: end },
      endAt: { gte: start },
    },
    orderBy: { startAt: 'asc' },
  });
}

export async function updateEvent(
  projectId: string,
  eventId: string,
  data: UpdateEventData,
  client: PrismaClient = prisma
): Promise<Event> {
  // Verify event exists and belongs to this project
  const existing = await client.event.findFirst({
    where: { id: eventId, projectId },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError('Event', eventId);
  }

  return client.event.update({
    where: { id: eventId },
    data,
  });
}

export async function deleteEvent(
  projectId: string,
  eventId: string,
  client: PrismaClient = prisma
): Promise<void> {
  // Verify event exists and belongs to this project
  const existing = await client.event.findFirst({
    where: { id: eventId, projectId },
    select: { id: true },
  });
  if (!existing) {
    throw new NotFoundError('Event', eventId);
  }

  await client.event.delete({
    where: { id: eventId },
  });
}
