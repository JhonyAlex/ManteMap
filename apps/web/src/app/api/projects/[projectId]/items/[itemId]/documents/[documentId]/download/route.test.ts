import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/document-service', () => ({
  downloadDocument: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { GET } from './route';
import { downloadDocument } from '@/lib/services/document-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemId: 'item-1', documentId: 'doc-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const fileBuffer = Buffer.from('file content');

function getRequest() {
  return new Request('http://localhost/api/projects/project-1/items/item-1/documents/doc-1/download');
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('document download route', () => {
  it('returns 401 without a session', async () => {
    vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(401);
  });

  it('returns file stream with correct headers', async () => {
    vi.mocked(downloadDocument).mockResolvedValue({
      buffer: fileBuffer,
      mimeType: 'application/pdf',
      fileName: 'manual.pdf',
    });
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');
    expect(response.headers.get('Content-Disposition')).toContain('manual.pdf');
    expect(response.headers.get('Content-Length')).toBe(fileBuffer.length.toString());
  });

  it('returns 404 when document not found', async () => {
    vi.mocked(downloadDocument).mockRejectedValue(new NotFoundError('Document', 'doc-1'));
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(404);
  });

  it('returns 403 for cross-project access', async () => {
    vi.mocked(downloadDocument).mockRejectedValue(new AuthorizationError());
    const response = await GET(getRequest(), params);
    expect(response.status).toBe(403);
  });
});