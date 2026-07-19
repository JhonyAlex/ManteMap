import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/document-service', () => ({
  getDocument: vi.fn(),
  deleteDocument: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET, DELETE } from './route';
import { getDocument, deleteDocument } from '@/lib/services/document-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemId: 'item-1', documentId: 'doc-1' }) };
const user = { id: 'user-1', email: 'test@example.com', name: 'Test', role: 'ADMIN' };

const document = {
  id: 'doc-1',
  itemId: 'item-1',
  name: 'Manual.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  expiresAt: null,
  currentVersionId: 'ver-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function getRequest() {
  return new Request('http://localhost/api/projects/project-1/items/item-1/documents/doc-1');
}

function deleteRequest() {
  return new Request('http://localhost/api/projects/project-1/items/item-1/documents/doc-1', {
    method: 'DELETE',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('document singleton routes', () => {
  // -------------------------------------------------------------------
  // GET — Get single document
  // -------------------------------------------------------------------
  describe('GET — get document', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(401);
    });

    it('returns document for an authenticated member', async () => {
      vi.mocked(getDocument).mockResolvedValue({ document } as never);
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.id).toBe('doc-1');
    });

    it('returns 404 when document not found', async () => {
      vi.mocked(getDocument).mockRejectedValue(new NotFoundError('Document', 'doc-1'));
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(404);
    });

    it('returns 403 for cross-project access', async () => {
      vi.mocked(getDocument).mockRejectedValue(new AuthorizationError());
      const response = await GET(getRequest(), params);
      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------
  // DELETE — Delete document
  // -------------------------------------------------------------------
  describe('DELETE — delete document', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(401);
    });

    it('deletes document and returns 200', async () => {
      vi.mocked(deleteDocument).mockResolvedValue(undefined);
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.message).toContain('deleted');
    });

    it('returns 404 when document not found', async () => {
      vi.mocked(deleteDocument).mockRejectedValue(new NotFoundError('Document', 'doc-1'));
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(404);
    });

    it('returns 403 for cross-project access', async () => {
      vi.mocked(deleteDocument).mockRejectedValue(new AuthorizationError());
      const response = await DELETE(deleteRequest(), params);
      expect(response.status).toBe(403);
    });
  });
});