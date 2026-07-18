/**
 * ItemPdfService — server-side PDF generation for item sheets.
 *
 * Uses @react-pdf/renderer to render ItemSheetDocument to a PDF Buffer.
 * The PDF is generated entirely in-memory and never written to disk (PDF-004).
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/pdf-export/spec.md
 *   PDF-001, PDF-002, PDF-003, PDF-004
 * Design: openspec/changes/phase-11-advanced-features/design.md
 */

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { ItemSheetDocument } from '@/components/pdf/item-sheet-document';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ItemPdfData {
  item: {
    name: string;
    slug: string;
    status: string | null;
    itemType: string | null;
  };
  fields: Array<{ name: string; value: unknown }>;
  documents: Array<{ name: string; expiresAt: string | null }>;
  projectName: string;
  qrDataUrl?: string;
  locationPath?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const ItemPdfService = {
  /**
   * Generate an item sheet PDF as a Buffer.
   *
   * The PDF is rendered via @react-pdf/renderer using the ItemSheetDocument
   * component. The result is a Buffer containing the complete PDF bytes.
   *
   * @param data — item data to include in the PDF
   * @returns Buffer containing the PDF bytes
   * @throws if @react-pdf/renderer encounters a rendering error
   */
  async generate(data: ItemPdfData): Promise<Buffer> {
    const exportDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const document = React.createElement(ItemSheetDocument, {
      itemName: data.item.name,
      itemSlug: data.item.slug,
      status: data.item.status,
      itemType: data.item.itemType,
      fields: data.fields,
      documents: data.documents,
      projectName: data.projectName,
      qrDataUrl: data.qrDataUrl,
      locationPath: data.locationPath,
      exportDate,
    });

    // @react-pdf/renderer's renderToBuffer accepts any React element whose root
    // is a Document; the type inference is overly restrictive.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return renderToBuffer(document as any);
  },
};
