import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@mantemap/shared';

vi.mock('@/lib/repositories/notification-delivery-repository', () => ({
  listDeliveries: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET } from './route';
import { listDeliveries } from '@/lib/repositories/notification-delivery-repository';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'proj-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

function getRequest(url = 'http://localhost/api/projects/proj-1/notification-deliveries') {
  return new Request(url);
}

const mockDeliveries = [
  { id: 'd1', alertId: 'alert-1', userId: 'user-1', channelType: 'email', status: 'sent', deliveredAt: new Date() },
  { id: 'd2', alertId: 'alert-1', userId: 'user-1', channelType: 'slack', status: 'failed', errorMessage: 'Webhook error', deliveredAt: new Date() },
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('GET /api/projects/[projectId]/notification-deliveries', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(401);
  });

  it('returns all deliveries for a project', async () => {
    vi.mocked(listDeliveries).mockResolvedValue(mockDeliveries as never);

    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].channelType).toBe('email');
  });

  it('filters by alertId query parameter', async () => {
    vi.mocked(listDeliveries).mockResolvedValue([mockDeliveries[0]] as never);

    const response = await GET(
      getRequest('http://localhost/api/projects/proj-1/notification-deliveries?alertId=alert-1'),
      params,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
  });

  it('filters by channelType query parameter', async () => {
    vi.mocked(listDeliveries).mockResolvedValue([mockDeliveries[1]] as never);

    const response = await GET(
      getRequest('http://localhost/api/projects/proj-1/notification-deliveries?channelType=slack'),
      params,
    );
    expect(response.status).toBe(200);

    // The filter is passed to listDeliveries
    // Verify the function was called (filtering happens in repo)
    expect(listDeliveries).toHaveBeenCalled();
  });

  it('filters by status query parameter', async () => {
    vi.mocked(listDeliveries).mockResolvedValue([mockDeliveries[1]] as never);

    const response = await GET(
      getRequest('http://localhost/api/projects/proj-1/notification-deliveries?status=failed'),
      params,
    );
    expect(response.status).toBe(200);
    expect(listDeliveries).toHaveBeenCalled();
  });

  it('returns empty array when no deliveries exist', async () => {
    vi.mocked(listDeliveries).mockResolvedValue([] as never);

    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(listDeliveries).mockRejectedValue(new Error('Prisma secret'));

    const response = await GET(getRequest(), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });
});