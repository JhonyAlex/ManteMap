/**
 * Location tree API route — /api/projects/[projectId]/locations/tree
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Tree endpoint" — returns full hierarchy as nested JSON
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location tree API route"
 */

import { NextResponse } from 'next/server';
import { NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { internalError, notFound } from '@/lib/http/api-error';
import { getTree } from '@/lib/services/location-service';
import type { ApiResponse } from '@mantemap/shared';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await getTree(projectId, auth.user.id);
    return NextResponse.json({ data: result.tree } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    return internalError();
  }
}
