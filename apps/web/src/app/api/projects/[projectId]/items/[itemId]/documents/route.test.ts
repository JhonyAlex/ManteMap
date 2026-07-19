import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';

vi.mock('@/lib/services/document-service', () => ({
  uploadDocument: vi.fn(),
  listDocuments: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
}));

import { GET, POST } from './route';
import { uploadDocument, listDocuments } from '@/lib/services/document-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = { params: Promise.resolve({ projectId: 'project-1', itemId: 'item-1' }) };
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

const documentVersion = {
  id: 'ver-1',
  documentId: 'doc-1',
  version: 1,
  fileName: 'manual.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024,
  storagePath: 'project-1/item-1/ver-1-manual.pdf',
  uploadedBy: 'user-1',
  createdAt: new Date(),
};

function listRequest() {
  return new Request('http://localhost/api/projects/project-1/items/item-1/documents');
}

function uploadRequest(formData?: FormData) {
  const fd = formData || new FormData();
  if (!fd.has('file')) {
    const blob = new Blob(['file content'], { type: 'application/pdf' });
    const file = new File([blob], 'manual.pdf', { type: 'application/pdf' });
    fd.append('file', file);
  }
  if (!fd.has('name')) {
    fd.append('name', 'Manual.pdf');
  }
  return new Request('http://localhost/api/projects/project-1/items/item-1/documents', {
    method: 'POST',
    body: fd,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('documents collection routes', () => {
  // -------------------------------------------------------------------
  // GET — List documents
  // -------------------------------------------------------------------
  describe('GET — list documents', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await GET(listRequest(), params);
      expect(response.status).toBe(401);
    });

    it('returns documents for an authenticated member', async () => {
      vi.mocked(listDocuments).mockResolvedValue({ documents: [document] } as never);
      const response = await GET(listRequest(), params);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].id).toBe('doc-1');
    });

    it('returns 404 when item not found', async () => {
      vi.mocked(listDocuments).mockRejectedValue(new NotFoundError('Item', 'item-1'));
      const response = await GET(listRequest(), params);
      expect(response.status).toBe(404);
    });

    it('returns 403 for cross-project access', async () => {
      vi.mocked(listDocuments).mockRejectedValue(new AuthorizationError());
      const response = await GET(listRequest(), params);
      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------
  // POST — Upload document
  // -------------------------------------------------------------------
  describe('POST — upload document', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await POST(uploadRequest(), params);
      expect(response.status).toBe(401);
    });

    it('returns 400 for missing file', async () => {
      const fd = new FormData();
      fd.append('name', 'Manual.pdf');
      const request = new Request('http://localhost/api/projects/project-1/items/item-1/documents', {
        method: 'POST',
        body: fd,
      });
      const response = await POST(request, params);
      expect(response.status).toBe(400);
    });

    it('returns 400 for missing name', async () => {
      const fd = new FormData();
      const blob = new Blob(['file content'], { type: 'application/pdf' });
      const file = new File([blob], 'manual.pdf', { type: 'application/pdf' });
      fd.append('file', file);
      const request = new Request('http://localhost/api/projects/project-1/items/item-1/documents', {
        method: 'POST',
        body: fd,
      });
      const response = await POST(request, params);
      expect(response.status).toBe(400);
    });

    it('uploads a document and returns 201', async () => {
      vi.mocked(uploadDocument).mockResolvedValue({ document, version: documentVersion } as never);
      const response = await POST(uploadRequest(), params);
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.data.document.id).toBe('doc-1');
      expect(body.data.version.id).toBe('ver-1');
    });

    it('returns 413 for file too large', async () => {
      vi.mocked(uploadDocument).mockRejectedValue(new ValidationError('File size exceeds maximum'));
      const response = await POST(uploadRequest(), params);
      expect(response.status).toBe(413);
    });

    it('returns 415 for disallowed file type', async () => {
      vi.mocked(uploadDocument).mockRejectedValue(new ValidationError('File type not allowed'));
      const response = await POST(uploadRequest(), params);
      expect(response.status).toBe(415);
    });

    it('returns 404 when item not found', async () => {
      vi.mocked(uploadDocument).mockRejectedValue(new NotFoundError('Item', 'item-1'));
      const response = await POST(uploadRequest(), params);
      expect(response.status).toBe(404);
    });

    it('returns 403 for cross-project access', async () => {
      vi.mocked(uploadDocument).mockRejectedValue(new AuthorizationError());
      const response = await POST(uploadRequest(), params);
      expect(response.status).toBe(403);
    });
  });
});