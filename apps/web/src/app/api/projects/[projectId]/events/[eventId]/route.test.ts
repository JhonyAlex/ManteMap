import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/event-service', () => ({
  getEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { GET, PUT, DELETE } from './route';
import { getEvent, updateEvent, deleteEvent } from '@/lib/services/event-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', eventId: 'evt-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const eventRecord = {
  id: 'evt-1',
  projectId: 'project-1',
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

function getRequest() {
  return new Request('http://localhost/api/projects/project-1/events/evt-1');
}

function updateRequest(body?: string) {
  return new Request('http://localhost/api/projects/project-1/events/evt-1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body }),
  });
}

function deleteRequest() {
  return new Request('http://localhost/api/projects/project-1/events/evt-1', {
    method: 'DELETE',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

// ---------------------------------------------------------------------------
// GET — single event
// ---------------------------------------------------------------------------
describe('GET — single event', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(401);
  });

  it('returns event for an authenticated member', async () => {
    vi.mocked(getEvent).mockResolvedValue({ event: eventRecord } as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.id).toBe('evt-1');
    expect(body.data.title).toBe('Monthly maintenance');
  });

  it('returns 404 when event does not exist', async () => {
    vi.mocked(getEvent).mockRejectedValue(new NotFoundError('Event', 'evt-1'));
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(404);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(getEvent).mockRejectedValue(new Error('Prisma secret'));
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });
});

// ---------------------------------------------------------------------------
// PUT — update event
// ---------------------------------------------------------------------------
describe('PUT — update event', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await PUT(updateRequest(JSON.stringify({ title: 'Updated' })), params);
    expect(response.status).toBe(401);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await PUT(updateRequest('{broken'), params);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for empty update body', async () => {
    const response = await PUT(updateRequest(JSON.stringify({})), params);
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid color format', async () => {
    const response = await PUT(updateRequest(JSON.stringify({ color: 'red' })), params);
    expect(response.status).toBe(400);
  });

  it('updates event and returns 200', async () => {
    const updated = { ...eventRecord, title: 'Updated Event' };
    vi.mocked(updateEvent).mockResolvedValue({ event: updated } as never);
    const response = await PUT(updateRequest(JSON.stringify({ title: 'Updated Event' })), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.title).toBe('Updated Event');
    expect(body.message).toContain('updated');
  });

  it('passes validated data to service', async () => {
    vi.mocked(updateEvent).mockResolvedValue({ event: eventRecord } as never);
    await PUT(updateRequest(JSON.stringify({ title: 'Updated', color: '#112233' })), params);
    expect(updateEvent).toHaveBeenCalledWith(
      'project-1',
      'evt-1',
      { title: 'Updated', color: '#112233' },
      'user-1'
    );
  });

  it('returns 404 when event does not exist', async () => {
    vi.mocked(updateEvent).mockRejectedValue(new NotFoundError('Event', 'evt-1'));
    const response = await PUT(updateRequest(JSON.stringify({ title: 'Updated' })), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for non-owner', async () => {
    vi.mocked(updateEvent).mockRejectedValue(new AuthorizationError());
    const response = await PUT(updateRequest(JSON.stringify({ title: 'Updated' })), params);
    expect(response.status).toBe(403);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(updateEvent).mockRejectedValue(new Error('Database connection failed'));
    const response = await PUT(updateRequest(JSON.stringify({ title: 'Updated' })), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Database connection');
  });
});

// ---------------------------------------------------------------------------
// DELETE — delete event
// ---------------------------------------------------------------------------
describe('DELETE — delete event', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await DELETE(deleteRequest(), params);
    expect(response.status).toBe(401);
  });

  it('deletes event and returns 204', async () => {
    vi.mocked(deleteEvent).mockResolvedValue(undefined);
    const response = await DELETE(deleteRequest(), params);
    expect(response.status).toBe(204);
    expect(deleteEvent).toHaveBeenCalledWith('project-1', 'evt-1', 'user-1');
  });

  it('returns 404 when event does not exist', async () => {
    vi.mocked(deleteEvent).mockRejectedValue(new NotFoundError('Event', 'evt-1'));
    const response = await DELETE(deleteRequest(), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for non-owner', async () => {
    vi.mocked(deleteEvent).mockRejectedValue(new AuthorizationError());
    const response = await DELETE(deleteRequest(), params);
    expect(response.status).toBe(403);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(deleteEvent).mockRejectedValue(new Error('Database connection failed'));
    const response = await DELETE(deleteRequest(), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Database connection');
  });
});
