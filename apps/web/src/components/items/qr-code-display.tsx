'use client';

/**
 * QRCodeDisplay — Client component for showing a QR code for an item.
 *
 * Fetches the QR code image from the GET /qr API endpoint via TanStack Query.
 * Displays loading, success (QR image), and error states.
 * Provides Print and Download buttons.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-001
 * Design: openspec/changes/phase-11-advanced-features/design.md
 *   Slice A — Component Design
 */

import React, { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QRCodeDisplayProps {
  projectId: string;
  itemId: string;
  size?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QRCodeDisplay({ projectId, itemId, size = 200 }: QRCodeDisplayProps) {
  const {
    data: qrDataUrl,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['qr-code', projectId, itemId],
    queryFn: async () => {
      const response = await fetch(
        `/api/projects/${projectId}/items/${itemId}/qr`
      );
      if (!response.ok) {
        throw new Error(`Failed to load QR code (${response.status})`);
      }
      return response.text();
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;

    // Convert data URL to blob for download
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-item-${itemId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrDataUrl, itemId]);

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <div className="flex h-48 w-48 items-center justify-center rounded-lg border bg-muted">
          <span className="text-sm text-muted-foreground">Loading QR code...</span>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  if (isError || !qrDataUrl) {
    return (
      <div className="flex flex-col items-center gap-4 p-6">
        <div className="flex h-48 w-48 items-center justify-center rounded-lg border border-destructive/50 bg-destructive/5">
          <span className="text-sm text-destructive">
            {isError ? 'Failed to load QR code' : 'QR code not available'}
          </span>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Success state
  // -----------------------------------------------------------------------

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* QR Image */}
      <img
        src={qrDataUrl}
        alt={`QR Code for item ${itemId}`}
        width={size}
        height={size}
        className="rounded-lg border"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          Print QR
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          Download QR
        </Button>
      </div>
    </div>
  );
}
