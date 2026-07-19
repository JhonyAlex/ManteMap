/**
 * GET /api/projects/[projectId]/items/[itemId]/export/pdf
 *
 * Generates and streams an item sheet PDF.
 *
 * - Auth: requireProjectMember (PDF-005)
 * - Returns: application/pdf with Content-Disposition: attachment (PDF-001, PDF-004)
 * - Errors: 404 for missing item, 500 for rendering failures (PDF-005)
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/pdf-export/spec.md
 * Design: openspec/changes/phase-11-advanced-features/design.md
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { requireProjectMember } from '@/lib/services/project-access-service';
import { findItemByProjectAndId } from '@/lib/repositories/item-repository';
import { findDocumentsByItem } from '@/lib/repositories/document-repository';
import { ItemPdfService } from '@/lib/services/pdf-service';
import type { ItemPdfData } from '@/lib/services/pdf-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a location path string from hierarchical location data.
 */
function buildLocationPath(
  location: Record<string, unknown> | null | undefined
): string | undefined {
  if (!location) return undefined;
  const parts: string[] = [];
  let current: Record<string, unknown> | null = location;
  while (current) {
    parts.unshift(current.name as string);
    current = (current.parent as Record<string, unknown>) ?? null;
  }
  return parts.join(' > ');
}

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  // Auth guard (PDF-005)
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  const { projectId: rawProjectIdentifier, itemId } = await params;
  const projectId = await resolveProjectId(rawProjectIdentifier);

  // Project membership check (PDF-005)
  try {
    await requireProjectMember(projectId, auth.user.id);
  } catch {
    return NextResponse.json(
      { error: 'Not found', message: 'Item not found' },
      { status: 404 }
    );
  }

  // Fetch item with fields, status, item type
  const item = await findItemByProjectAndId(projectId, itemId, {
    fieldValues: { include: { dynamicField: true } },
    status: true,
    itemType: true,
    location: { include: { parent: true } },
  });

  if (!item) {
    return NextResponse.json(
      { error: 'Not found', message: 'Item not found' },
      { status: 404 }
    );
  }

  // Fetch documents
  const documents = await findDocumentsByItem(itemId);

  // Build PDF data
  const pdfData: ItemPdfData = {
    item: {
      name: item.name,
      slug: item.slug,
      status: (item.status as { name: string } | null)?.name ?? null,
      itemType: (item.itemType as { name: string } | null)?.name ?? null,
    },
    fields: ((item.fieldValues as Array<Record<string, unknown>>) ?? []).map(
      (fv) => ({
        name:
          (fv.dynamicField as { name: string } | undefined)?.name ??
          (fv.dynamicFieldId as string),
        value: fv.value,
      })
    ),
    documents: documents.map((doc) => ({
      name: doc.name,
      expiresAt: doc.expiresAt ? doc.expiresAt.toISOString().split('T')[0] : null,
    })),
    projectName: projectId, // TODO: fetch project name if available
    locationPath: buildLocationPath(
      item.location as Record<string, unknown> | null
    ),
  };

  // Generate PDF (PDF-004)
  try {
    const pdfBuffer = await ItemPdfService.generate(pdfData);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${item.slug}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      {
        error: 'PDF generation failed',
        message: 'An internal error occurred',
      },
      { status: 500 }
    );
  }
}
