/**
 * ExportPDFButton — Client Component for PDF export.
 *
 * Fetches the PDF from the API route and triggers a browser download.
 * Handles loading, success, and error states.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/pdf-export/spec.md
 *   PDF-001, PDF-004, PDF-005
 * Design: openspec/changes/phase-11-advanced-features/design.md
 */

'use client';

import React, { useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ExportPDFButtonProps {
  projectId: string;
  itemId: string;
  itemName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a safe filename from the item name.
 */
function slugifyForFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExportPDFButton({
  projectId,
  itemId,
  itemName,
}: ExportPDFButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/items/${itemId}/export/pdf`
      );

      if (!response.ok) {
        console.error(
          `PDF export failed: ${response.status} ${response.statusText}`
        );
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${slugifyForFilename(itemName)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, itemId, itemName]);

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex min-h-[44px] items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Exporting...
        </>
      ) : (
        'Export PDF'
      )}
    </button>
  );
}
