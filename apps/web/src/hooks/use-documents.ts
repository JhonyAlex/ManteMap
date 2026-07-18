/**
 * TanStack Query hooks for document management.
 *
 * Provides hooks for listing, uploading, deleting documents,
 * and fetching version history.
 *
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document Upload" — useUploadDocument with multipart form
 *   "Document CRUD" — useDocuments, useDeleteDocument
 *   "Document Versioning" — useDocumentVersions
 * Design: openspec/changes/phase-5-documents/design.md
 *   "TanStack Query for client-side data fetching"
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string;
  createdAt: string;
}

export interface DocumentWithVersion {
  id: string;
  itemId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: string | null;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  currentVersion?: {
    id: string;
    version: number;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedBy: string;
    createdAt: string;
  };
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  const json = (await res.json()) as ApiResponse<T>;
  return json.data as T;
}

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const documentKeys = {
  all: (projectId: string) => ['documents', projectId] as const,
  list: (projectId: string, itemId: string) =>
    ['documents', projectId, itemId, 'list'] as const,
  detail: (projectId: string, itemId: string, documentId: string) =>
    ['documents', projectId, itemId, 'detail', documentId] as const,
  versions: (projectId: string, itemId: string, documentId: string) =>
    ['documents', projectId, itemId, 'versions', documentId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches the list of documents for a given item.
 */
export function useDocuments(projectId: string, itemId: string) {
  return useQuery<DocumentWithVersion[]>({
    queryKey: documentKeys.list(projectId, itemId),
    queryFn: () =>
      fetchJson<DocumentWithVersion[]>(
        `/api/projects/${projectId}/items/${itemId}/documents`
      ),
  });
}

/**
 * Uploads a document via multipart form data.
 * Invalidates the document list on success.
 */
export function useUploadDocument(projectId: string, itemId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch(
        `/api/projects/${projectId}/items/${itemId}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed with status ${res.status}`);
      }
      const json = (await res.json()) as ApiResponse<{
        document: DocumentWithVersion;
        version: DocumentVersion;
      }>;
      return json.data!;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: documentKeys.list(projectId, itemId),
      });
    },
  });
}

/**
 * Deletes a document by ID.
 * Invalidates the document list on success.
 */
export function useDeleteDocument(
  projectId: string,
  itemId: string,
  documentId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/projects/${projectId}/items/${itemId}/documents/${documentId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Delete failed with status ${res.status}`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: documentKeys.list(projectId, itemId),
      });
    },
  });
}

/**
 * Fetches the version history for a document.
 */
export function useDocumentVersions(
  projectId: string,
  itemId: string,
  documentId: string
) {
  return useQuery<DocumentVersion[]>({
    queryKey: documentKeys.versions(projectId, itemId, documentId),
    queryFn: () =>
      fetchJson<DocumentVersion[]>(
        `/api/projects/${projectId}/items/${itemId}/documents/${documentId}/versions`
      ),
    enabled: !!documentId,
  });
}
