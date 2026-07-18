import { describe, expect, it } from 'vitest';
import {
  createEventSchema,
  updateEventSchema,
  eventFilterSchema,
} from './event';

// ---------------------------------------------------------------------------
// createEventSchema
// ---------------------------------------------------------------------------
describe('createEventSchema', () => {
  const validInput = {
    title: 'Monthly maintenance check',
    startAt: '2026-03-15T10:00:00.000Z',
    endAt: '2026-03-15T12:00:00.000Z',
  };

  it('accepts valid input with required fields only', () => {
    const result = createEventSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Monthly maintenance check');
      expect(result.data.startAt).toBe('2026-03-15T10:00:00.000Z');
      expect(result.data.endAt).toBe('2026-03-15T12:00:00.000Z');
      expect(result.data.allDay).toBe(false);
      expect(result.data.description).toBeUndefined();
      expect(result.data.itemId).toBeUndefined();
      expect(result.data.rrule).toBeUndefined();
      expect(result.data.color).toBeUndefined();
    }
  });

  it('accepts valid input with all optional fields', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      description: 'Check all pumps',
      itemId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      color: '#FF5733',
      allDay: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe('Check all pumps');
      expect(result.data.itemId).toBe('clxxxxxxxxxxxxxxxxxxxxxxxx');
      expect(result.data.rrule).toBe('FREQ=WEEKLY;BYDAY=MO');
      expect(result.data.color).toBe('#FF5733');
      expect(result.data.allDay).toBe(true);
    }
  });

  it('rejects empty title', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      title: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = createEventSchema.safeParse({
      startAt: '2026-03-15T10:00:00.000Z',
      endAt: '2026-03-15T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 200 characters', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      title: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('trims title whitespace', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      title: '  Maintenance  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Maintenance');
    }
  });

  it('rejects missing startAt', () => {
    const result = createEventSchema.safeParse({
      title: 'Event',
      endAt: '2026-03-15T12:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid startAt format', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      startAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('rejects endAt before startAt', () => {
    const result = createEventSchema.safeParse({
      title: 'Event',
      startAt: '2026-03-15T12:00:00.000Z',
      endAt: '2026-03-15T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('accepts event without endAt', () => {
    const result = createEventSchema.safeParse({
      title: 'Event',
      startAt: '2026-03-15T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.endAt).toBeUndefined();
    }
  });

  it('accepts valid hex color', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      color: '#abcdef',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid color format', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      color: 'red',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid rrule string', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      rrule: 'FREQ=WEEKLY;INTERVAL=2',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rrule).toBe('FREQ=WEEKLY;INTERVAL=2');
    }
  });

  it('defaults allDay to false', () => {
    const result = createEventSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allDay).toBe(false);
    }
  });

  it('accepts description up to 2000 characters', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      description: 'A'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it('rejects description exceeding 2000 characters', () => {
    const result = createEventSchema.safeParse({
      ...validInput,
      description: 'A'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateEventSchema
// ---------------------------------------------------------------------------
describe('updateEventSchema', () => {
  it('accepts partial update with title only', () => {
    const result = updateEventSchema.safeParse({ title: 'Updated Event' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Updated Event');
    }
  });

  it('accepts partial update with startAt only', () => {
    const result = updateEventSchema.safeParse({
      startAt: '2026-04-01T09:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with endAt only', () => {
    const result = updateEventSchema.safeParse({
      endAt: '2026-04-01T17:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts update with all fields', () => {
    const result = updateEventSchema.safeParse({
      title: 'Updated',
      description: 'New description',
      startAt: '2026-04-01T09:00:00.000Z',
      endAt: '2026-04-01T17:00:00.000Z',
      color: '#112233',
      rrule: 'FREQ=DAILY',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty update (no fields provided)', () => {
    const result = updateEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty title in update', () => {
    const result = updateEventSchema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid color in update', () => {
    const result = updateEventSchema.safeParse({ color: 'not-hex' });
    expect(result.success).toBe(false);
  });

  it('accepts clearing rrule with null', () => {
    const result = updateEventSchema.safeParse({ rrule: null });
    expect(result.success).toBe(true);
  });

  it('accepts clearing description with null', () => {
    const result = updateEventSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('accepts clearing color with null', () => {
    const result = updateEventSchema.safeParse({ color: null });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// eventFilterSchema
// ---------------------------------------------------------------------------
describe('eventFilterSchema', () => {
  it('accepts valid date range', () => {
    const result = eventFilterSchema.safeParse({
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-31T23:59:59.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start).toBe('2026-03-01T00:00:00.000Z');
      expect(result.data.end).toBe('2026-03-31T23:59:59.000Z');
    }
  });

  it('rejects missing start', () => {
    const result = eventFilterSchema.safeParse({
      end: '2026-03-31T23:59:59.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing end', () => {
    const result = eventFilterSchema.safeParse({
      start: '2026-03-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid start format', () => {
    const result = eventFilterSchema.safeParse({
      start: 'not-a-date',
      end: '2026-03-31T23:59:59.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid end format', () => {
    const result = eventFilterSchema.safeParse({
      start: '2026-03-01T00:00:00.000Z',
      end: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional type filter', () => {
    const result = eventFilterSchema.safeParse({
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-31T23:59:59.000Z',
      type: 'document_expiration',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('document_expiration');
    }
  });

  it('accepts manual type filter', () => {
    const result = eventFilterSchema.safeParse({
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-31T23:59:59.000Z',
      type: 'manual',
    });
    expect(result.success).toBe(true);
  });

  it('defaults type to undefined when omitted', () => {
    const result = eventFilterSchema.safeParse({
      start: '2026-03-01T00:00:00.000Z',
      end: '2026-03-31T23:59:59.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBeUndefined();
    }
  });
});
