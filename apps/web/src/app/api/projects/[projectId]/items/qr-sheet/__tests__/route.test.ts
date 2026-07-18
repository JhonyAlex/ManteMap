/**
 * Integration tests for POST /api/projects/[projectId]/items/qr-sheet
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-002 Batch QR sheet generation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetAuthUser = vi.fn();
const mockRequireProjectMember = vi.fn();
const mockFindItemByProjectAndId = vi.fn();
const mockFindProjectById = vi.fn();
const mockGenerateQRSheet = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: (...args: unknown[]) => mockRequireProjectMember(...args),
}));

vi.mock('@/lib/repositories/item-repository', () => ({
  findItemByProjectAndId: (...args: unknown[]) => mockFindItemByProjectAndId(...args),
}));

vi.mock('@/lib/repositories/project-repository', () => ({
  findProjectById: (...args: unknown[]) => mockFindProjectById(...args),
}));

vi.mock('@/lib/services/qr-code-service', () => ({
  QRCodeService: {
    generateQRSheet: (...args: unknown[]) => mockGenerateQRSheet(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callQrSheetRoute(
  projectId: string,
  body: { itemIds: string[] }
): Promise<Response> {
  const { POST } = await import('../route');
  const request = new Request(
    `http://localhost/api/projects/${projectId}/items/qr-sheet`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const params = Promise.resolve({ projectId });
  return POST(request, { params });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/projects/[projectId]/items/qr-sheet', () => {
  const projectId = 'proj-1';
  const items = [
    { id: 'item-1', slug: 'pump-a', projectSlug: 'plant-1' },
    { id: 'item-2', slug: 'valve-b', projectSlug: 'plant-1' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
    mockRequireProjectMember.mockResolvedValue(undefined);
    mockFindItemByProjectAndId.mockResolvedValue({
      id: 'item-1',
      slug: 'pump-a',
      itemType: { projectId: 'proj-1' },
    });
    mockFindProjectById.mockResolvedValue({ id: 'proj-1', code: 'plant-1' });
    mockGenerateQRSheet.mockResolvedValue(
      '<!DOCTYPE html><html><body><p>QR Sheet</p></body></html>'
    );
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response('Unauthorized', { status: 401 }) });

    const response = await callQrSheetRoute(projectId, { itemIds: ['item-1'] });
    expect(response.status).toBe(401);
  });

  it('returns 400 when body is not valid JSON', async () => {
    const { POST } = await import('../route');
    const request = new Request(
      `http://localhost/api/projects/${projectId}/items/qr-sheet`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json',
      }
    );
    const params = Promise.resolve({ projectId });
    const response = await POST(request, { params });
    expect(response.status).toBe(400);
  });

  it('returns 400 when itemIds is not an array', async () => {
    const response = await callQrSheetRoute(projectId, { itemIds: 'not-array' as unknown as string[] });
    expect(response.status).toBe(400);
  });

  it('returns 400 when itemIds array is empty', async () => {
    const response = await callQrSheetRoute(projectId, { itemIds: [] });
    expect(response.status).toBe(400);
  });

  it('returns HTML content for a valid request with 2 items', async () => {
    const response = await callQrSheetRoute(projectId, { itemIds: ['item-1', 'item-2'] });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');

    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('QR Sheet');
  });

  it('silently skips non-existent items (partial batch)', async () => {
    // First call returns item, second returns null (not found)
    mockFindItemByProjectAndId
      .mockResolvedValueOnce({ id: 'item-1', slug: 'pump-a', itemType: { projectId: 'proj-1' } })
      .mockResolvedValueOnce(null);

    const response = await callQrSheetRoute(projectId, {
      itemIds: ['item-1', 'nonexistent'],
    });

    expect(response.status).toBe(200);
    expect(mockGenerateQRSheet).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'item-1', slug: 'pump-a' }),
      ])
    );
    // Only pump-a should be in the items passed to generateQRSheet
    const calledItems = mockGenerateQRSheet.mock.calls[0][0];
    expect(calledItems).toHaveLength(1);
    expect(calledItems[0].slug).toBe('pump-a');
  });

  it('calls requireProjectMember for authorization', async () => {
    await callQrSheetRoute(projectId, { itemIds: ['item-1'] });
    expect(mockRequireProjectMember).toHaveBeenCalledWith(projectId, 'user-1');
  });
});
