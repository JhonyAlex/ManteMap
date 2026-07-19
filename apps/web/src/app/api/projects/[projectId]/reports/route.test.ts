import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundError, AuthorizationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/lib/services/metrics-service', () => ({
  exportProjectCsv: vi.fn(),
  getProjectMetrics: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET } from './route';
import { exportProjectCsv, getProjectMetrics } from '@/lib/services/metrics-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'proj-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

function csvRequest(type?: string) {
  const url = new URL('http://localhost/api/projects/proj-1/reports');
  if (type) {
    url.searchParams.set('type', type);
  }
  return new Request(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

// ---------------------------------------------------------------------------
// GET /api/projects/[projectId]/reports
// ---------------------------------------------------------------------------
describe('GET /api/projects/[projectId]/reports', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);

    const response = await GET(csvRequest('items'), params);

    expect(response.status).toBe(401);
  });

  it('returns 400 when type parameter is missing', async () => {
    const response = await GET(csvRequest(), params);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('type');
  });

  it('returns 400 when type parameter is invalid', async () => {
    const response = await GET(csvRequest('invalid'), params);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('type');
  });

  it('returns 404 when project not found or user is not a member', async () => {
    vi.mocked(exportProjectCsv).mockRejectedValue(new NotFoundError('Project', 'proj-1'));

    const response = await GET(csvRequest('items'), params);

    expect(response.status).toBe(404);
  });

  it('returns 200 with CSV content for items', async () => {
    const csvContent = '"Name","Type"\r\n"Pump A","Equipment"';
    vi.mocked(exportProjectCsv).mockResolvedValue(csvContent);

    const response = await GET(csvRequest('items'), params);

    expect(response.status).toBe(200);
    expect(exportProjectCsv).toHaveBeenCalledWith('proj-1', 'user-1', 'items');
  });

  it('returns correct Content-Type header', async () => {
    vi.mocked(exportProjectCsv).mockResolvedValue('data');

    const response = await GET(csvRequest('items'), params);

    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
  });

  it('returns correct Content-Disposition header', async () => {
    vi.mocked(exportProjectCsv).mockResolvedValue('data');

    const response = await GET(csvRequest('items'), params);

    const disposition = response.headers.get('Content-Disposition');
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('.csv');
  });

  it('returns Cache-Control: private, no-store', async () => {
    vi.mocked(exportProjectCsv).mockResolvedValue('data');

    const response = await GET(csvRequest('documents'), params);

    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('delegates documents report type correctly', async () => {
    vi.mocked(exportProjectCsv).mockResolvedValue('doc csv');

    await GET(csvRequest('documents'), params);

    expect(exportProjectCsv).toHaveBeenCalledWith('proj-1', 'user-1', 'documents');
  });

  it('delegates alerts report type correctly', async () => {
    vi.mocked(exportProjectCsv).mockResolvedValue('alert csv');

    await GET(csvRequest('alerts'), params);

    expect(exportProjectCsv).toHaveBeenCalledWith('proj-1', 'user-1', 'alerts');
  });

  it('returns CSV body content', async () => {
    const csvContent = '"Name"\r\n"Pump A"';
    vi.mocked(exportProjectCsv).mockResolvedValue(csvContent);

    const response = await GET(csvRequest('items'), params);
    const body = await response.text();

    expect(body).toBe(csvContent);
  });

  it('does not expose unexpected errors', async () => {
    vi.mocked(exportProjectCsv).mockRejectedValue(new Error('Prisma secret'));

    const response = await GET(csvRequest('items'), params);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.message).not.toContain('Prisma secret');
  });
});