import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

// Mock the channel config repository
vi.mock('@/lib/repositories/channel-config-repository', () => ({
  getUserChannelConfig: vi.fn(),
  upsertUserChannelConfig: vi.fn(),
  deleteUserChannelConfig: vi.fn(),
  listUserChannelConfigs: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET, PUT, DELETE } from './route';
import {
  getUserChannelConfig,
  upsertUserChannelConfig,
  deleteUserChannelConfig,
  listUserChannelConfigs,
} from '@/lib/repositories/channel-config-repository';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

// test endpoint
import { POST } from './test/route';

const params = { params: Promise.resolve({ projectId: 'proj-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

function getRequest(url = 'http://localhost/api/projects/proj-1/notification-channels') {
  return new Request(url);
}

function putRequest(body: string) {
  return new Request('http://localhost/api/projects/proj-1/notification-channels', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

function deleteRequest(channelType: string) {
  return new Request(
    `http://localhost/api/projects/proj-1/notification-channels?type=${channelType}`,
    { method: 'DELETE' },
  );
}

function testRequest(body: string) {
  return new Request('http://localhost/api/projects/proj-1/notification-channels/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

// ---------------------------------------------------------------------------
// GET /notification-channels
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/notification-channels', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(401);
  });

  it('returns all configured channels for the user', async () => {
    vi.mocked(listUserChannelConfigs).mockResolvedValue([
      { id: 'c1', userId: 'user-1', channelType: 'slack', config: { webhookUrl: 'https://hooks.slack.com/x' }, enabled: true },
      { id: 'c2', userId: 'user-1', channelType: 'telegram', config: { botToken: 'abc', chatId: '123' }, enabled: true },
    ] as never);

    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].channelType).toBe('slack');
  });

  it('filters by channelType query parameter', async () => {
    vi.mocked(getUserChannelConfig).mockResolvedValue({
      id: 'c1', userId: 'user-1', channelType: 'slack', config: { webhookUrl: 'https://hooks.slack.com/x' }, enabled: true,
    } as never);

    const response = await GET(
      getRequest('http://localhost/api/projects/proj-1/notification-channels?type=slack'),
      params,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.channelType).toBe('slack');
  });

  it('returns configured: false when no config exists', async () => {
    vi.mocked(getUserChannelConfig).mockResolvedValue(null as never);

    const response = await GET(
      getRequest('http://localhost/api/projects/proj-1/notification-channels?type=slack'),
      params,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.configured).toBe(false);
  });

  it('calls listUserChannelConfigs with userId', async () => {
    vi.mocked(listUserChannelConfigs).mockResolvedValue([] as never);

    await GET(getRequest(), params);
    expect(listUserChannelConfigs).toHaveBeenCalledWith('user-1');
  });
});

// ---------------------------------------------------------------------------
// PUT /notification-channels
// ---------------------------------------------------------------------------

describe('PUT /api/projects/[projectId]/notification-channels', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await PUT(
      putRequest(JSON.stringify({ channelType: 'slack', config: { webhookUrl: 'https://hooks.slack.com/x' } })),
      params,
    );
    expect(response.status).toBe(401);
  });

  it('upserts channel config and returns result', async () => {
    vi.mocked(upsertUserChannelConfig).mockResolvedValue({
      id: 'c1', userId: 'user-1', channelType: 'slack', config: { webhookUrl: 'https://hooks.slack.com/x' }, enabled: true,
    } as never);

    const response = await PUT(
      putRequest(JSON.stringify({ channelType: 'slack', config: { webhookUrl: 'https://hooks.slack.com/x' } })),
      params,
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.channelType).toBe('slack');
    expect(body.message).toContain('saved');
  });

  it('validates body with upsertChannelConfigSchema', async () => {
    const response = await PUT(
      putRequest(JSON.stringify({ channelType: 'slack' })), // missing config
      params,
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid channel type', async () => {
    const response = await PUT(
      putRequest(JSON.stringify({ channelType: 'discord', config: {} })),
      params,
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await PUT(putRequest('{broken'), params);
    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /notification-channels
// ---------------------------------------------------------------------------

describe('DELETE /api/projects/[projectId]/notification-channels', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await DELETE(deleteRequest('slack'), params);
    expect(response.status).toBe(401);
  });

  it('deletes channel config and returns success', async () => {
    vi.mocked(deleteUserChannelConfig).mockResolvedValue(undefined as never);

    const response = await DELETE(deleteRequest('slack'), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toContain('deleted');
  });

  it('returns 400 when channelType is missing', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/projects/proj-1/notification-channels', { method: 'DELETE' }),
      params,
    );
    expect(response.status).toBe(400);
  });

  it('calls delete with correct args', async () => {
    vi.mocked(deleteUserChannelConfig).mockResolvedValue(undefined as never);

    await DELETE(deleteRequest('telegram'), params);
    expect(deleteUserChannelConfig).toHaveBeenCalledWith('user-1', 'telegram');
  });
});

// ---------------------------------------------------------------------------
// POST /notification-channels/test
// ---------------------------------------------------------------------------

describe('POST /api/projects/[projectId]/notification-channels/test', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await POST(testRequest(JSON.stringify({ channelType: 'slack' })), params);
    expect(response.status).toBe(401);
  });

  it('returns configured: false error when channel not set up', async () => {
    vi.mocked(getUserChannelConfig).mockResolvedValue(null as never);

    const response = await POST(testRequest(JSON.stringify({ channelType: 'slack' })), params);
    const body = await response.json();
    expect(body.data.success).toBe(false);
    expect(body.data.error).toBe('Channel not configured');
  });

  it('returns 400 for invalid channelType', async () => {
    const response = await POST(
      testRequest(JSON.stringify({ channelType: 'discord' })),
      params,
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for missing body', async () => {
    const response = await POST(
      new Request('http://localhost/api/projects/proj-1/notification-channels/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
      params,
    );
    expect(response.status).toBe(400);
  });
});