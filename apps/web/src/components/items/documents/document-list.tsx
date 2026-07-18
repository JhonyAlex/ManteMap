/**
 * DocumentList — displays documents attached to an item.
 *
 * Shows document name, size, version, expiration status badges,
 * and download/delete action buttons.
 *
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document CRUD" — list with current version metadata
 *   "Expiration Tracking" — red expired, yellow expiring soon, no badge when null
 * Design: openspec/changes/phase-5-documents/design.md
 *   "table with name, size, version, expiration badge, download/delete actions"
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@mantemap/ui';
import { useDocuments, useDeleteDocument } from '@/hooks/use-documents';
import type { DocumentWithVersion } from '@/hooks/use-documents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determines the expiration status of a document.
 * Returns 'expired' | 'expiring' | null based on spec thresholds.
 */
export function getExpirationStatus(
  expiresAt: string | null | undefined
): 'expired' | 'expiring' | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expires = new Date(expiresAt);
  const daysUntilExpiration =
    (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 30) return 'expiring';
  return null;
}

/**
 * Formats bytes to human-readable size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DocumentListProps {
  projectId: string;
  itemId: string;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ExpirationBadge({ expiresAt }: { expiresAt: string | null }) {
  const status = getExpirationStatus(expiresAt);

  if (status === 'expired') {
    return (
      <Badge variant="destructive" data-slot="badge">
        Expired
      </Badge>
    );
  }

  if (status === 'expiring') {
    return (
      <Badge
        className="bg-warning text-warning-foreground border-transparent"
        data-slot="badge"
      >
        Expiring soon
      </Badge>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentList({ projectId, itemId }: DocumentListProps) {
  const [deleteTarget, setDeleteTarget] = useState<DocumentWithVersion | null>(
    null
  );
  const { data: documents, isLoading } = useDocuments(projectId, itemId);
  const deleteMutation = useDeleteDocument(
    projectId,
    itemId,
    deleteTarget?.id ?? ''
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setDeleteTarget(null);
      },
    });
  }, [deleteTarget, deleteMutation]);

  const handleDownload = useCallback(
    (doc: DocumentWithVersion) => {
      const url = `/api/projects/${projectId}/items/${itemId}/documents/${doc.id}/download`;
      window.open(url, '_blank');
    },
    [projectId, itemId]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Documents</h2>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Loading documents...
        </div>
      </div>
    );
  }

  // Empty state
  if (!documents || documents.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Documents</h2>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No documents uploaded yet.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Documents</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell>{formatFileSize(doc.sizeBytes)}</TableCell>
                <TableCell>
                  v{doc.currentVersion?.version ?? 1}
                </TableCell>
                <TableCell>
                  <ExpirationBadge expiresAt={doc.expiresAt} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      Download
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteTarget(doc)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteTarget?.name}</strong>? This will remove all
              versions and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
