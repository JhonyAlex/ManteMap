/**
 * POST /api/projects/[projectId]/items/qr-sheet
 *
 * Generates an HTML page with QR codes for multiple items, optimized for
 * printing. Accepts { itemIds: string[] } in the body. Silently skips
 * items that don't exist.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-002, QR-003
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
import { badRequest, internalError } from '@/lib/http/api-error';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  // 1. Authentication
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  const { projectId: rawProjectIdentifier } = await params;
  const projectId = await resolveProjectId(rawProjectIdentifier);

  // 2. Authorization — must be project member
  await requireProjectMember(projectId, auth.user.id);

  // 3. Parse request body
  let body: { itemIds?: string[] };
  try {
    body = (await request.json()) as { itemIds?: string[] };
  } catch {
    return badRequest('Invalid JSON in request body');
  }

  if (!body.itemIds || !Array.isArray(body.itemIds)) {
    return badRequest('itemIds must be a non-empty array');
  }

  if (body.itemIds.length === 0) {
    return badRequest('itemIds array must not be empty');
  }

  // 4. Resolve project slug
  const project = await findProjectById(projectId);
  const projectSlug = project?.code ?? projectId;

  // 5. Resolve items — silently skip non-existent ones
  const resolvedItems = (
    await Promise.all(
      body.itemIds.map(async (itemId) => {
        const item = await findItemByProjectAndId(projectId, itemId, {
          itemType: { select: { projectId: true } },
        });
        if (!item) return null;
        return { id: item.id, slug: item.slug, projectSlug };
      })
    )
  ).filter((item): item is NonNullable<typeof item> => item !== null);

  // 6. Generate QR sheet HTML
  try {
    const html = await QRCodeService.generateQRSheet(resolvedItems);

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return internalError();
  }
}
