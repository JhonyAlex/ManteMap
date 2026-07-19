/**
 * GET /api/projects/[projectId]/items/[itemId]/qr
 *
 * Returns a QR code as a PNG image encoding the item's detail page URL.
 * Requires project membership authentication.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-001, QR-004, QR-005
 * Design: openspec/changes/phase-11-advanced-features/design.md
 *   Slice A — QR API Design
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { requireProjectMember } from '@/lib/services/project-access-service';
import { findItemByProjectAndId } from '@/lib/repositories/item-repository';
import { findProjectById } from '@/lib/repositories/project-repository';
import { QRCodeService } from '@/lib/services/qr-code-service';
import { notFound, internalError } from '@/lib/http/api-error';
import { NotFoundError } from '@mantemap/shared';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  // 1. Authentication
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { projectId: rawProjectIdentifier, itemId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);

    // 2. Authorization — must be project member
    await requireProjectMember(projectId, auth.user.id);

    // 3. Resolve item — verify it exists in the project
    const item = await findItemByProjectAndId(projectId, itemId, {
      itemType: { select: { projectId: true } },
    });
    if (!item) {
      return notFound('Item not found');
    }

    // 4. Resolve project slug (use project code from DB)
    const project = await findProjectById(projectId);
    const projectSlug = project?.code ?? projectId;

    // 5. Generate QR code
    const qrDataUrl = await QRCodeService.generateQRForItem(projectSlug, item.slug);

    // 6. Return as PNG image
    return new NextResponse(qrDataUrl, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400', // 24h cache for QR codes
      },
    });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return notFound(error.message || 'Resource not found');
    }

    return internalError();
  }
}
