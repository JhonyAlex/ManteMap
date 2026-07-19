import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/alert-service', () => ({
  scanDocumentExpirations: vi.fn(),
  scanUpcomingEvents: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { POST } from './route';
import { scanDocumentExpirations, scanUpcomingEvents } from '@/lib/services/alert-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'proj-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

function scanRequest() {
  return new Request('http://localhost/api/projects/proj-1/alerts/scan', {
    method: 'POST',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('POST /api/projects/[projectId]/alerts/scan', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await POST(scanRequest(), params);
    expect(response.status).toBe(401);
  });

  it('runs both scans and returns total count', async () => {
    vi.mocked(scanDocumentExpirations).mockResolvedValue(3);
    vi.mocked(scanUpcomingEvents).mockResolvedValue(2);
    const response = await POST(scanRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual({ documentAlerts: 3, eventAlerts: 2, total: 5 });
    expect(body.message).toContain('5');
  });

  it('calls scanDocumentExpirations with projectId', async () => {
    vi.mocked(scanDocumentExpirations).mockResolvedValue(0);
    vi.mocked(scanUpcomingEvents).mockResolvedValue(0);
    await POST(scanRequest(), params);
    expect(scanDocumentExpirations).toHaveBeenCalledWith('proj-1');
  });

  it('calls scanUpcomingEvents with projectId', async () => {
    vi.mocked(scanDocumentExpirations).mockResolvedValue(0);
    vi.mocked(scanUpcomingEvents).mockResolvedValue(0);
    await POST(scanRequest(), params);
    expect(scanUpcomingEvents).toHaveBeenCalledWith('proj-1');
  });

  it('returns 404 when project not found', async () => {
    vi.mocked(scanDocumentExpirations).mockRejectedValue(
      new NotFoundError('Project', 'proj-1')
    );
    const response = await POST(scanRequest(), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for non-member', async () => {
    vi.mocked(scanDocumentExpirations).mockRejectedValue(
      new AuthorizationError()
    );
    const response = await POST(scanRequest(), params);
    expect(response.status).toBe(403);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(scanDocumentExpirations).mockRejectedValue(
      new Error('Prisma secret')
    );
    const response = await POST(scanRequest(), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });
});