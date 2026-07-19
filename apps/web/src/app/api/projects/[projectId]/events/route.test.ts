import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/event-service', () => ({
  createEvent: vi.fn(),
  getEventsInRange: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn(),
}));

import { GET, POST } from './route';
import { createEvent, getEventsInRange } from '@/lib/services/event-service';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const eventRecord = {
  id: 'evt-1',
  projectId: 'project-1',
  title: 'Monthly maintenance',
  startAt: '2026-03-15T10:00:00.000Z',
  endAt: '2026-03-15T12:00:00.000Z',
  allDay: false,
  type: 'manual',
};

function listRequest(queryParams?: Record<string, string>) {
  const url = new URL('http://localhost/api/projects/project-1/events');
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new Request(url.toString());
}

function createRequest(body?: string) {
  return new Request('http://localhost/api/projects/project-1/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
  vi.mocked(resolveProjectId).mockImplementation((identifier: string) =>
    Promise.resolve(identifier === 'PIGMEA-ED1' ? 'project-1' : identifier)
  );
});

describe('events collection routes', () => {
  // -------------------------------------------------------------------
  // GET — List events by date range
  // -------------------------------------------------------------------
  describe('GET — list events', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await GET(listRequest(), params);
      expect(response.status).toBe(401);
    });

    it('returns events for an authenticated member', async () => {
      vi.mocked(getEventsInRange).mockResolvedValue({ events: [eventRecord] } as never);
      const response = await GET(
        listRequest({ start: '2026-03-01T00:00:00.000Z', end: '2026-03-31T23:59:59.000Z' }),
        params
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe('evt-1');
    });

    it('returns 400 when start or end are missing', async () => {
      const response = await GET(listRequest({ start: '2026-03-01T00:00:00.000Z' }), params);
      expect(response.status).toBe(400);
    });

    it('returns 400 when start or end have invalid format', async () => {
      const response = await GET(
        listRequest({ start: 'not-a-date', end: '2026-03-31T23:59:59.000Z' }),
        params
      );
      expect(response.status).toBe(400);
    });

    it('passes date range and type filter to service', async () => {
      vi.mocked(getEventsInRange).mockResolvedValue({ events: [] } as never);
      await GET(
        listRequest({
          start: '2026-03-01T00:00:00.000Z',
          end: '2026-03-31T23:59:59.000Z',
          type: 'document_expiration',
        }),
        params
      );
      expect(getEventsInRange).toHaveBeenCalledWith(
        'project-1',
        expect.any(Date),
        expect.any(Date),
        'user-1',
        'document_expiration'
      );
    });

    it('resolves a project code before querying another domain', async () => {
      vi.mocked(getEventsInRange).mockResolvedValue({ events: [] } as never);
      await GET(
        listRequest({ start: '2026-03-01T00:00:00.000Z', end: '2026-03-31T23:59:59.000Z' }),
        { params: Promise.resolve({ projectId: 'PIGMEA-ED1' }) }
      );

      expect(resolveProjectId).toHaveBeenCalledWith('PIGMEA-ED1');
      expect(getEventsInRange).toHaveBeenCalledWith(
        'project-1',
        expect.any(Date),
        expect.any(Date),
        'user-1',
        undefined
      );
    });

    it('returns 404 when project not found', async () => {
      vi.mocked(getEventsInRange).mockRejectedValue(new NotFoundError('Project', 'project-1'));
      const response = await GET(
        listRequest({ start: '2026-03-01T00:00:00.000Z', end: '2026-03-31T23:59:59.000Z' }),
        params
      );
      expect(response.status).toBe(404);
    });

    it('does not expose unexpected errors', async () => {
      vi.mocked(getEventsInRange).mockRejectedValue(new Error('Prisma secret'));
      const response = await GET(
        listRequest({ start: '2026-03-01T00:00:00.000Z', end: '2026-03-31T23:59:59.000Z' }),
        params
      );
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Prisma secret');
    });
  });

  // -------------------------------------------------------------------
  // POST — Create event
  // -------------------------------------------------------------------
  describe('POST — create event', () => {
    const validBody = {
      title: 'Monthly maintenance',
      startAt: '2026-03-15T10:00:00.000Z',
      endAt: '2026-03-15T12:00:00.000Z',
    };

    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await POST(createRequest(JSON.stringify(validBody)), params);
      expect(response.status).toBe(401);
    });

    it('returns 400 for malformed JSON', async () => {
      const response = await POST(createRequest('{broken'), params);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for missing required fields', async () => {
      const response = await POST(createRequest(JSON.stringify({ title: '' })), params);
      expect(response.status).toBe(400);
    });

    it('returns 400 for invalid date range (end before start)', async () => {
      const response = await POST(
        createRequest(
          JSON.stringify({
            title: 'Event',
            startAt: '2026-03-15T12:00:00.000Z',
            endAt: '2026-03-15T10:00:00.000Z',
          })
        ),
        params
      );
      expect(response.status).toBe(400);
    });

    it('creates an event and returns 201', async () => {
      vi.mocked(createEvent).mockResolvedValue({ event: eventRecord } as never);
      const response = await POST(createRequest(JSON.stringify(validBody)), params);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.id).toBe('evt-1');
      expect(body.message).toContain('created');
    });

    it('passes validated data to service', async () => {
      vi.mocked(createEvent).mockResolvedValue({ event: eventRecord } as never);
      await POST(createRequest(JSON.stringify(validBody)), params);
      expect(createEvent).toHaveBeenCalledWith(
        'project-1',
        { ...validBody, allDay: false },
        'user-1'
      );
    });

    it('returns 404 for non-existent project', async () => {
      vi.mocked(createEvent).mockRejectedValue(new NotFoundError('Project', 'project-1'));
      const response = await POST(createRequest(JSON.stringify(validBody)), params);
      expect(response.status).toBe(404);
    });

    it('returns 403 for non-owner', async () => {
      vi.mocked(createEvent).mockRejectedValue(new AuthorizationError());
      const response = await POST(createRequest(JSON.stringify(validBody)), params);
      expect(response.status).toBe(403);
    });

    it('does not expose unexpected errors', async () => {
      vi.mocked(createEvent).mockRejectedValue(new Error('Database connection failed'));
      const response = await POST(createRequest(JSON.stringify(validBody)), params);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Database connection');
    });
  });
});
