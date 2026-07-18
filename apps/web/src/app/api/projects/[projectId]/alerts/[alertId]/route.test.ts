import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/alert-service', () => ({
  acknowledgeAlert: vi.fn(),
  dismissAlert: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { PATCH } from './route';
import { acknowledgeAlert, dismissAlert } from '@/lib/services/alert-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = {
  params: Promise.resolve({ projectId: 'proj-1', alertId: 'alert-1' }),
};
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const ackedAlert = {
  id: 'alert-1',
  projectId: 'proj-1',
  alertType: 'DOCUMENT_EXPIRING',
  severity: 'WARNING',
  status: 'ACKNOWLEDGED',
  sourceType: 'document',
  sourceId: 'doc-1',
  title: 'Document expiring in 7 days',
  message: null,
  metadata: null,
  acknowledgedAt: '2026-07-18T10:00:00.000Z',
  dismissedAt: null,
  createdAt: '2026-07-18T09:00:00.000Z',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

const dismissedAlert = {
  ...ackedAlert,
  status: 'DISMISSED',
  acknowledgedAt: null,
  dismissedAt: '2026-07-18T10:00:00.000Z',
};

function ackRequest() {
  return new Request('http://localhost/api/projects/proj-1/alerts/alert-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'acknowledge' }),
  });
}

function dismissRequest() {
  return new Request('http://localhost/api/projects/proj-1/alerts/alert-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'dismiss' }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('PATCH /api/projects/[projectId]/alerts/[alertId]', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await PATCH(ackRequest(), params);
    expect(response.status).toBe(401);
  });

  it('acknowledges an alert and returns updated alert', async () => {
    vi.mocked(acknowledgeAlert).mockResolvedValue(ackedAlert as never);
    const response = await PATCH(ackRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('ACKNOWLEDGED');
    expect(body.message).toContain('acknowledged');
  });

  it('calls acknowledgeAlert service with correct args', async () => {
    vi.mocked(acknowledgeAlert).mockResolvedValue(ackedAlert as never);
    await PATCH(ackRequest(), params);
    expect(acknowledgeAlert).toHaveBeenCalledWith('proj-1', 'alert-1', 'user-1');
  });

  it('dismisses an alert and returns updated alert', async () => {
    vi.mocked(dismissAlert).mockResolvedValue(dismissedAlert as never);
    const response = await PATCH(dismissRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.status).toBe('DISMISSED');
    expect(body.message).toContain('dismissed');
  });

  it('calls dismissAlert service with correct args', async () => {
    vi.mocked(dismissAlert).mockResolvedValue(dismissedAlert as never);
    await PATCH(dismissRequest(), params);
    expect(dismissAlert).toHaveBeenCalledWith('proj-1', 'alert-1', 'user-1');
  });

  it('returns 400 for invalid action', async () => {
    const request = new Request(
      'http://localhost/api/projects/proj-1/alerts/alert-1',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalid' }),
      }
    );
    const response = await PATCH(request, params);
    expect(response.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const request = new Request(
      'http://localhost/api/projects/proj-1/alerts/alert-1',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{broken',
      }
    );
    const response = await PATCH(request, params);
    expect(response.status).toBe(400);
  });

  it('returns 404 when alert not found', async () => {
    vi.mocked(acknowledgeAlert).mockRejectedValue(
      new NotFoundError('Alert', 'alert-1')
    );
    const response = await PATCH(ackRequest(), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for non-member', async () => {
    vi.mocked(acknowledgeAlert).mockRejectedValue(new AuthorizationError());
    const response = await PATCH(ackRequest(), params);
    expect(response.status).toBe(403);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(acknowledgeAlert).mockRejectedValue(new Error('Prisma secret'));
    const response = await PATCH(ackRequest(), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });
});
