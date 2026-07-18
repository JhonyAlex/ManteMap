import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    event: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

import {
  createEvent,
  findEventById,
  findEventsByDateRange,
  updateEvent,
  deleteEvent,
} from './event-repository';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

const eventRecord = {
  id: 'evt-1',
  projectId: 'project-1',
  itemId: null,
  title: 'Monthly maintenance',
  description: 'Check all pumps',
  startAt: new Date('2026-03-15T10:00:00.000Z'),
  endAt: new Date('2026-03-15T12:00:00.000Z'),
  allDay: false,
  rrule: null,
  color: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const eventRecord2 = {
  ...eventRecord,
  id: 'evt-2',
  title: 'Weekly inspection',
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
};

const eventWithItem = {
  ...eventRecord,
  id: 'evt-3',
  itemId: 'item-1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createEvent
// ---------------------------------------------------------------------------
describe('createEvent', () => {
  const createData = {
    title: 'Monthly maintenance',
    description: 'Check all pumps',
    startAt: new Date('2026-03-15T10:00:00.000Z'),
    endAt: new Date('2026-03-15T12:00:00.000Z'),
    allDay: false,
  };

  it('creates an event scoped to a project', async () => {
    db.event.create.mockResolvedValue(eventRecord);

    const result = await createEvent('project-1', createData);

    expect(db.event.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        title: 'Monthly maintenance',
        description: 'Check all pumps',
        startAt: new Date('2026-03-15T10:00:00.000Z'),
        endAt: new Date('2026-03-15T12:00:00.000Z'),
        allDay: false,
        itemId: null,
        rrule: null,
        color: null,
      },
    });
    expect(result).toEqual(eventRecord);
  });

  it('creates an event with optional fields', async () => {
    const fullData = {
      ...createData,
      itemId: 'item-1',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      color: '#FF5733',
    };
    db.event.create.mockResolvedValue(eventWithItem);

    const result = await createEvent('project-1', fullData);

    expect(db.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        itemId: 'item-1',
        rrule: 'FREQ=WEEKLY;BYDAY=MO',
        color: '#FF5733',
      }),
    });
    expect(result.itemId).toBe('item-1');
  });

  it('accepts optional transaction client', async () => {
    const mockTxEvent = { create: vi.fn() };
    const tx = { event: mockTxEvent } as any;
    mockTxEvent.create.mockResolvedValue(eventRecord);

    const result = await createEvent('project-1', createData, tx);

    expect(mockTxEvent.create).toHaveBeenCalled();
    expect(result).toEqual(eventRecord);
  });
});

// ---------------------------------------------------------------------------
// findEventById
// ---------------------------------------------------------------------------
describe('findEventById', () => {
  it('returns an event by ID scoped to a project', async () => {
    db.event.findFirst.mockResolvedValue(eventRecord);

    const result = await findEventById('project-1', 'evt-1');

    expect(db.event.findFirst).toHaveBeenCalledWith({
      where: { id: 'evt-1', projectId: 'project-1' },
    });
    expect(result).toEqual(eventRecord);
  });

  it('returns null for a non-existent event', async () => {
    db.event.findFirst.mockResolvedValue(null);

    const result = await findEventById('project-1', 'evt-999');

    expect(result).toBeNull();
  });

  it('returns null when event belongs to different project', async () => {
    db.event.findFirst.mockResolvedValue(null);

    const result = await findEventById('project-2', 'evt-1');

    expect(result).toBeNull();
  });

  it('accepts optional transaction client', async () => {
    const mockTxEvent = { findFirst: vi.fn() };
    const tx = { event: mockTxEvent } as any;
    mockTxEvent.findFirst.mockResolvedValue(eventRecord);

    const result = await findEventById('project-1', 'evt-1', tx);

    expect(mockTxEvent.findFirst).toHaveBeenCalled();
    expect(result).toEqual(eventRecord);
  });
});

// ---------------------------------------------------------------------------
// findEventsByDateRange
// ---------------------------------------------------------------------------
describe('findEventsByDateRange', () => {
  const rangeStart = new Date('2026-03-01T00:00:00.000Z');
  const rangeEnd = new Date('2026-03-31T23:59:59.000Z');

  it('returns events within the date range for a project', async () => {
    db.event.findMany.mockResolvedValue([eventRecord, eventRecord2]);

    const result = await findEventsByDateRange('project-1', rangeStart, rangeEnd);

    expect(db.event.findMany).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
        startAt: { lte: rangeEnd },
        endAt: { gte: rangeStart },
      },
      orderBy: { startAt: 'asc' },
    });
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no events match', async () => {
    db.event.findMany.mockResolvedValue([]);

    const result = await findEventsByDateRange('project-1', rangeStart, rangeEnd);

    expect(result).toHaveLength(0);
  });

  it('filters by project — does not return events from other projects', async () => {
    db.event.findMany.mockResolvedValue([eventRecord]);

    await findEventsByDateRange('project-1', rangeStart, rangeEnd);

    expect(db.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectId: 'project-1' }),
      })
    );
  });

  it('accepts optional transaction client', async () => {
    const mockTxEvent = { findMany: vi.fn() };
    const tx = { event: mockTxEvent } as any;
    mockTxEvent.findMany.mockResolvedValue([eventRecord]);

    const result = await findEventsByDateRange('project-1', rangeStart, rangeEnd, tx);

    expect(mockTxEvent.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateEvent
// ---------------------------------------------------------------------------
describe('updateEvent', () => {
  const updateData = { title: 'Updated Event', color: '#112233' };

  it('updates an event scoped to a project', async () => {
    db.event.findFirst.mockResolvedValue({ id: 'evt-1' });
    db.event.update.mockResolvedValue({ ...eventRecord, ...updateData });

    const result = await updateEvent('project-1', 'evt-1', updateData);

    expect(db.event.findFirst).toHaveBeenCalledWith({
      where: { id: 'evt-1', projectId: 'project-1' },
      select: { id: true },
    });
    expect(db.event.update).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: updateData,
    });
    expect(result.title).toBe('Updated Event');
    expect(result.color).toBe('#112233');
  });

  it('throws NotFoundError when event does not exist', async () => {
    db.event.findFirst.mockResolvedValue(null);

    await expect(
      updateEvent('project-1', 'evt-999', updateData)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(db.event.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when event belongs to different project', async () => {
    db.event.findFirst.mockResolvedValue(null);

    await expect(
      updateEvent('project-2', 'evt-1', updateData)
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(db.event.update).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxEvent = { findFirst: vi.fn(), update: vi.fn() };
    const tx = { event: mockTxEvent } as any;
    mockTxEvent.findFirst.mockResolvedValue({ id: 'evt-1' });
    mockTxEvent.update.mockResolvedValue({ ...eventRecord, ...updateData });

    const result = await updateEvent('project-1', 'evt-1', updateData, tx);

    expect(mockTxEvent.findFirst).toHaveBeenCalled();
    expect(mockTxEvent.update).toHaveBeenCalled();
    expect(result.title).toBe('Updated Event');
  });
});

// ---------------------------------------------------------------------------
// deleteEvent
// ---------------------------------------------------------------------------
describe('deleteEvent', () => {
  it('deletes an event scoped to a project', async () => {
    db.event.findFirst.mockResolvedValue({ id: 'evt-1' });
    db.event.delete.mockResolvedValue(eventRecord);

    await deleteEvent('project-1', 'evt-1');

    expect(db.event.findFirst).toHaveBeenCalledWith({
      where: { id: 'evt-1', projectId: 'project-1' },
      select: { id: true },
    });
    expect(db.event.delete).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
    });
  });

  it('throws NotFoundError when event does not exist', async () => {
    db.event.findFirst.mockResolvedValue(null);

    await expect(
      deleteEvent('project-1', 'evt-999')
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(db.event.delete).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when event belongs to different project', async () => {
    db.event.findFirst.mockResolvedValue(null);

    await expect(
      deleteEvent('project-2', 'evt-1')
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(db.event.delete).not.toHaveBeenCalled();
  });

  it('accepts optional transaction client', async () => {
    const mockTxEvent = { findFirst: vi.fn(), delete: vi.fn() };
    const tx = { event: mockTxEvent } as any;
    mockTxEvent.findFirst.mockResolvedValue({ id: 'evt-1' });
    mockTxEvent.delete.mockResolvedValue(eventRecord);

    await deleteEvent('project-1', 'evt-1', tx);

    expect(mockTxEvent.findFirst).toHaveBeenCalled();
    expect(mockTxEvent.delete).toHaveBeenCalled();
  });
});
