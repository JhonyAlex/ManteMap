import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/alert-service', () => ({
  getPreferences: vi.fn(),
  updatePreference: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET, PUT } from './route';
import { getPreferences, updatePreference } from '@/lib/services/alert-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'proj-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const mockPreferences = [
  { id: 'pref-1', userId: 'user-1', projectId: 'proj-1', alertType: 'DOCUMENT_EXPIRING', enabled: true },
  { id: 'pref-2', userId: 'user-1', projectId: 'proj-1', alertType: 'STATUS_INCIDENT', enabled: true },
];

function getRequest() {
  return new Request('http://localhost/api/projects/proj-1/alerts/preferences');
}

function putRequest(body: string) {
  return new Request('http://localhost/api/projects/proj-1/alerts/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('GET /api/projects/[projectId]/alerts/preferences', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(401);
  });

  it('returns preferences for an authenticated member', async () => {
    vi.mocked(getPreferences).mockResolvedValue(mockPreferences as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].alertType).toBe('DOCUMENT_EXPIRING');
  });

  it('calls getPreferences with projectId and userId', async () => {
    vi.mocked(getPreferences).mockResolvedValue([] as never);
    await GET(getRequest(), params);
    expect(getPreferences).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  it('returns 404 when project not found', async () => {
    vi.mocked(getPreferences).mockRejectedValue(new NotFoundError('Project', 'proj-1'));
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for non-member', async () => {
    vi.mocked(getPreferences).mockRejectedValue(new AuthorizationError());
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(403);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(getPreferences).mockRejectedValue(new Error('Prisma secret'));
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });
});

describe('PUT /api/projects/[projectId]/alerts/preferences', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await PUT(
      putRequest(JSON.stringify({ alertType: 'DOCUMENT_EXPIRING', enabled: false })),
      params
    );
    expect(response.status).toBe(401);
  });

  it('updates a preference and returns the result', async () => {
    const updatedPref = { ...mockPreferences[0], enabled: false };
    vi.mocked(updatePreference).mockResolvedValue(updatedPref as never);
    const response = await PUT(
      putRequest(JSON.stringify({ alertType: 'DOCUMENT_EXPIRING', enabled: false })),
      params
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.enabled).toBe(false);
    expect(body.message).toContain('updated');
  });

  it('calls updatePreference with correct args', async () => {
    vi.mocked(updatePreference).mockResolvedValue({} as never);
    await PUT(
      putRequest(JSON.stringify({ alertType: 'STATUS_INCIDENT', enabled: true })),
      params
    );
    expect(updatePreference).toHaveBeenCalledWith('proj-1', 'user-1', {
      alertType: 'STATUS_INCIDENT',
      enabled: true,
    });
  });

  it('returns 400 for malformed JSON', async () => {
    const response = await PUT(putRequest('{broken'), params);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing alertType', async () => {
    const response = await PUT(
      putRequest(JSON.stringify({ enabled: false })),
      params
    );
    expect(response.status).toBe(400);
  });

  it('returns 400 for missing enabled field', async () => {
    const response = await PUT(
      putRequest(JSON.stringify({ alertType: 'DOCUMENT_EXPIRING' })),
      params
    );
    expect(response.status).toBe(400);
  });

  it('returns 404 when project not found', async () => {
    vi.mocked(updatePreference).mockRejectedValue(
      new NotFoundError('Project', 'proj-1')
    );
    const response = await PUT(
      putRequest(JSON.stringify({ alertType: 'DOCUMENT_EXPIRING', enabled: false })),
      params
    );
    expect(response.status).toBe(404);
  });

  it('returns 403 for non-member', async () => {
    vi.mocked(updatePreference).mockRejectedValue(new AuthorizationError());
    const response = await PUT(
      putRequest(JSON.stringify({ alertType: 'DOCUMENT_EXPIRING', enabled: false })),
      params
    );
    expect(response.status).toBe(403);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(updatePreference).mockRejectedValue(new Error('Prisma secret'));
    const response = await PUT(
      putRequest(JSON.stringify({ alertType: 'DOCUMENT_EXPIRING', enabled: false })),
      params
    );
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });

  // Extended: channel boolean fields
  it('accepts optional email channel boolean', async () => {
    vi.mocked(updatePreference).mockResolvedValue({} as never);
    const response = await PUT(
      putRequest(JSON.stringify({ alertType: 'DOCUMENT_EXPIRING', enabled: true, email: true })),
      params
    );
    expect(response.status).toBe(200);
    expect(updatePreference).toHaveBeenCalledWith('proj-1', 'user-1', {
      alertType: 'DOCUMENT_EXPIRING',
      enabled: true,
      email: true,
    });
  });

  it('passes slack channel boolean to updatePreference', async () => {
    vi.mocked(updatePreference).mockResolvedValue({} as never);
    await PUT(
      putRequest(JSON.stringify({ alertType: 'STATUS_INCIDENT', enabled: true, slack: true })),
      params
    );
    expect(updatePreference).toHaveBeenCalledWith('proj-1', 'user-1', {
      alertType: 'STATUS_INCIDENT',
      enabled: true,
      slack: true,
    });
  });

  it('passes teams and telegram channel booleans', async () => {
    vi.mocked(updatePreference).mockResolvedValue({} as never);
    await PUT(
      putRequest(JSON.stringify({
        alertType: 'STATUS_FINAL',
        enabled: true,
        teams: true,
        telegram: false,
      })),
      params
    );
    expect(updatePreference).toHaveBeenCalledWith('proj-1', 'user-1', {
      alertType: 'STATUS_FINAL',
      enabled: true,
      teams: true,
      telegram: false,
    });
  });

  it('passes all four channel booleans simultaneously', async () => {
    vi.mocked(updatePreference).mockResolvedValue({} as never);
    await PUT(
      putRequest(JSON.stringify({
        alertType: 'EVENT_UPCOMING',
        enabled: true,
        email: true,
        slack: true,
        teams: false,
        telegram: true,
      })),
      params
    );
    expect(updatePreference).toHaveBeenCalledWith('proj-1', 'user-1', {
      alertType: 'EVENT_UPCOMING',
      enabled: true,
      email: true,
      slack: true,
      teams: false,
      telegram: true,
    });
  });
});