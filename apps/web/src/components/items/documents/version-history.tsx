/**
 * VersionHistory — displays the version timeline for a document.
 *
 * Shows versions ordered descending by number with timestamp,
 * file size, and file name.
 *
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document Versioning" — all versions ordered desc with timestamp, size
 * Design: openspec/changes/phase-5-documents/design.md
 *   "timeline list of versions"
 */

'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@mantemap/ui';
import { useDocumentVersions } from '@/hooks/use-documents';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats bytes to human-readable size string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats an ISO date string to a readable format.
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VersionHistoryProps {
  projectId: string;
  itemId: string;
  documentId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VersionHistory({
  projectId,
  itemId,
  documentId,
}: VersionHistoryProps) {
  const { data: versions, isLoading } = useDocumentVersions(
    projectId,
    itemId,
    documentId
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Version History</h3>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          Loading version history...
        </div>
      </div>
    );
  }

  // Empty state
  if (!versions || versions.length === 0) {
    return (
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Version History</h3>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
          No version history available.
        </div>
      </div>
    );
  }

  // Versions are already sorted descending by the API
  return (
    <div className="rounded-lg border">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Version History</h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Version</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((version) => (
            <TableRow key={version.id}>
              <TableCell className="font-medium">
                v{version.version}
              </TableCell>
              <TableCell>{version.fileName}</TableCell>
              <TableCell>{formatFileSize(version.sizeBytes)}</TableCell>
              <TableCell>{formatDate(version.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
