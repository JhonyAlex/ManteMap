import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/floor-plan-service', () => ({
  getFloorPlanImage: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET } from './route';
import { getFloorPlanImage } from '@/lib/services/floor-plan-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', floorPlanId: 'fp-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const imageBuffer = Buffer.from('fake-png-data');

function getRequest() {
  return new Request('http://localhost/api/projects/project-1/floor-plans/fp-1/image');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('floor plan image route', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(401);
  });

  it('returns image with correct Content-Type for PNG', async () => {
    vi.mocked(getFloorPlanImage).mockResolvedValue({
      buffer: imageBuffer,
      mimeType: 'image/png',
    });
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Content-Length')).toBe(imageBuffer.length.toString());
  });

  it('returns image with correct Content-Type for SVG', async () => {
    vi.mocked(getFloorPlanImage).mockResolvedValue({
      buffer: Buffer.from('<svg></svg>'),
      mimeType: 'image/svg+xml',
    });
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
  });

  it('returns 404 when floor plan not found', async () => {
    vi.mocked(getFloorPlanImage).mockRejectedValue(new NotFoundError('FloorPlan', 'fp-1'));
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for unauthorized access', async () => {
    vi.mocked(getFloorPlanImage).mockRejectedValue(new AuthorizationError());
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(403);
  });

  it('returns 500 for unexpected errors', async () => {
    vi.mocked(getFloorPlanImage).mockRejectedValue(new Error('Boom'));
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(500);
  });
});