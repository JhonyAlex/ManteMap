'use client';

/**
 * QRSheet — Client component for batch QR sheet generation and printing.
 *
 * POSTs item IDs to the POST /qr-sheet API endpoint, receives an HTML
 * page, and opens it in a new browser window for printing.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-002, QR-003
 * Design: openspec/changes/phase-11-advanced-features/design.md
 *   Slice A — QRSheet component
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface QRSheetProps {
  projectId: string;
  itemIds: string[];
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QRSheet({ projectId, itemIds, disabled = false }: QRSheetProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (itemIds.length === 0) {
      setError('No items selected for QR sheet');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/items/qr-sheet`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds }),
        }
      );

      if (!response.ok) {
        const msg = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to generate QR sheet (${response.status}): ${msg}`);
      }

      const html = await response.text();

      // Open HTML in a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error(
          'Could not open print window — please check your popup blocker settings'
        );
      }

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR sheet');
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, itemIds]);

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={disabled || isGenerating || itemIds.length === 0}
      >
        {isGenerating ? 'Generating...' : 'Print QR Sheet'}
      </Button>
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  );
}
