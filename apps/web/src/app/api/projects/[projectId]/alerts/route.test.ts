import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/alert-service', () => ({
  listAlerts: vi.fn(),
  getUnreadCount: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET } from './route';
import { listAlerts, getUnreadCount } from '@/lib/services/alert-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'proj-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const mockAlert = {
  id: 'alert-1',
  projectId: 'proj-1',
  alertType: 'DOCUMENT_EXPIRING',
  severity: 'WARNING',
  status: 'ACTIVE',
  sourceType: 'document',
  sourceId: 'doc-1',
  title: 'Document expiring in 7 days',
  message: null,
  metadata: null,
  acknowledgedAt: null,
  dismissedAt: null,
  createdAt: '2026-07-18T10:00:00.000Z',
  updatedAt: '2026-07-18T10:00:00.000Z',
};

function listRequest(queryParams?: Record<string, string>) {
  const url = new URL('http://localhost/api/projects/proj-1/alerts');
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new Request(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('GET /api/projects/[projectId]/alerts', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await GET(listRequest(), params);
    expect(response.status).toBe(401);
  });

  it('returns alerts for an authenticated member', async () => {
    vi.mocked(listAlerts).mockResolvedValue([mockAlert] as never);
    const response = await GET(listRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('alert-1');
  });

  it('passes severity filter to service', async () => {
    vi.mocked(listAlerts).mockResolvedValue([] as never);
    await GET(listRequest({ severity: 'WARNING' }), params);
    expect(listAlerts).toHaveBeenCalledWith(
      'proj-1',
      { severity: 'WARNING' },
      'user-1',
      {}
    );
  });

  it('passes alertType filter to service', async () => {
    vi.mocked(listAlerts).mockResolvedValue([] as never);
    await GET(listRequest({ alertType: 'STATUS_INCIDENT' }), params);
    expect(listAlerts).toHaveBeenCalledWith(
      'proj-1',
      { alertType: 'STATUS_INCIDENT' },
      'user-1',
      {}
    );
  });

  it('passes status filter to service', async () => {
    vi.mocked(listAlerts).mockResolvedValue([] as never);
    await GET(listRequest({ status: 'ACTIVE' }), params);
    expect(listAlerts).toHaveBeenCalledWith(
      'proj-1',
      { status: 'ACTIVE' },
      'user-1',
      {}
    );
  });

  it('passes pagination options to service', async () => {
    vi.mocked(listAlerts).mockResolvedValue([] as never);
    await GET(listRequest({ page: '2', pageSize: '10' }), params);
    expect(listAlerts).toHaveBeenCalledWith(
      'proj-1',
      {},
      'user-1',
      { page: 2, pageSize: 10 }
    );
  });

  it('returns 404 when project not found', async () => {
    vi.mocked(listAlerts).mockRejectedValue(new NotFoundError('Project', 'proj-1'));
    const response = await GET(listRequest(), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for non-member', async () => {
    vi.mocked(listAlerts).mockRejectedValue(new AuthorizationError());
    const response = await GET(listRequest(), params);
    expect(response.status).toBe(403);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(listAlerts).mockRejectedValue(new Error('Prisma secret'));
    const response = await GET(listRequest(), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });

  it('returns unread count when action=unread-count', async () => {
    vi.mocked(getUnreadCount).mockResolvedValue(5);
    const response = await GET(listRequest({ action: 'unread-count' }), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ count: 5 });
    expect(getUnreadCount).toHaveBeenCalledWith('proj-1', 'user-1');
  });
});