// @vitest-environment jsdom
/**
 * Tests for document TanStack Query hooks.
 *
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document Upload" — useUploadDocument calls POST multipart
 *   "Document CRUD" — useDocuments returns list, useDeleteDocument calls DELETE
 *   "Document Versioning" — useDocumentVersions returns version history
 * Design: openspec/changes/phase-5-documents/design.md
 *   "TanStack Query hooks for document operations"
 *
 * Acceptance criteria:
 *   - useDocuments fetches list from /api/projects/{pid}/items/{iid}/documents
 *   - useUploadDocument posts multipart FormData to the same endpoint
 *   - useDeleteDocument sends DELETE to /api/projects/{pid}/items/{iid}/documents/{did}
 *   - useDocumentVersions fetches version history for a document
 *   - All mutation hooks invalidate the document list query on success
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useDocuments,
  useUploadDocument,
  useDeleteDocument,
  useDocumentVersions,
  documentKeys,
} from '../use-documents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockDocuments = [
  {
    id: 'doc-1',
    itemId: 'item-1',
    name: 'Manual.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024000,
    expiresAt: null,
    currentVersionId: 'ver-1',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
    currentVersion: {
      id: 'ver-1',
      version: 1,
      fileName: 'manual-v1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024000,
      uploadedBy: 'user-1',
      createdAt: '2026-07-15T10:00:00Z',
    },
  },
  {
    id: 'doc-2',
    itemId: 'item-1',
    name: 'Expired Cert.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512000,
    expiresAt: '2026-06-01T00:00:00Z',
    currentVersionId: 'ver-2',
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-10T08:00:00Z',
    currentVersion: {
      id: 'ver-2',
      version: 1,
      fileName: 'cert.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512000,
      uploadedBy: 'user-1',
      createdAt: '2026-07-10T08:00:00Z',
    },
  },
];

const mockVersions = [
  {
    id: 'ver-2',
    documentId: 'doc-1',
    version: 2,
    fileName: 'manual-v2.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048000,
    storagePath: 'proj-1/item-1/ver-2-manual-v2.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-07-16T12:00:00Z',
  },
  {
    id: 'ver-1',
    documentId: 'doc-1',
    version: 1,
    fileName: 'manual-v1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024000,
    storagePath: 'proj-1/item-1/ver-1-manual-v1.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-07-15T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('documentKeys', () => {
  it('generates correct query key factory', () => {
    expect(documentKeys.all('proj-1')).toEqual(['documents', 'proj-1']);
    expect(documentKeys.list('proj-1', 'item-1')).toEqual([
      'documents',
      'proj-1',
      'item-1',
      'list',
    ]);
    expect(documentKeys.detail('proj-1', 'item-1', 'doc-1')).toEqual([
      'documents',
      'proj-1',
      'item-1',
      'detail',
      'doc-1',
    ]);
    expect(documentKeys.versions('proj-1', 'item-1', 'doc-1')).toEqual([
      'documents',
      'proj-1',
      'item-1',
      'versions',
      'doc-1',
    ]);
  });
});

describe('useDocuments', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches documents for a given project and item', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockDocuments }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDocuments('proj-1', 'item-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/items/item-1/documents')
    );
    expect(result.current.data).toEqual(mockDocuments);
    expect(result.current.error).toBeNull();
  });

  it('returns error when fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDocuments('proj-1', 'item-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});

describe('useUploadDocument', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('posts multipart FormData to the documents endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { document: mockDocuments[0], version: mockVersions[1] },
          message: 'Document uploaded successfully',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(
      () => useUploadDocument('proj-1', 'item-1'),
      { wrapper: createWrapper() }
    );

    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', 'Test Document');

    result.current.mutate(formData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/projects/proj-1/items/item-1/documents'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
  });

  it('returns error when upload fails with validation error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'File size exceeds 50MB limit' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const { result } = renderHook(
      () => useUploadDocument('proj-1', 'item-1'),
      { wrapper: createWrapper() }
    );

    const file = new File(['x'.repeat(51 * 1024 * 1024)], 'huge.pdf', {
      type: 'application/pdf',
    });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', 'Too Large');

    result.current.mutate(formData);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('useDeleteDocument', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends DELETE request to the document endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    );

    const { result } = renderHook(
      () => useDeleteDocument('proj-1', 'item-1', 'doc-1'),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/projects/proj-1/items/item-1/documents/doc-1'
      ),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('returns error when delete fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDeleteDocument('proj-1', 'item-1', 'nonexistent'),
      { wrapper: createWrapper() }
    );

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
  });
});

describe('useDocumentVersions', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches version history for a document', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: mockVersions }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDocumentVersions('proj-1', 'item-1', 'doc-1'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/projects/proj-1/items/item-1/documents/doc-1/versions'
      )
    );
    expect(result.current.data).toEqual(mockVersions);
    expect(result.current.error).toBeNull();
  });

  it('returns error when versions fetch fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(
      () => useDocumentVersions('proj-1', 'item-1', 'nonexistent'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeUndefined();
  });
});
