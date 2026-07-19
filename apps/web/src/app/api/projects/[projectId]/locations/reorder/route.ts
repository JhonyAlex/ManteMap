/**
 * Location reorder API route — /api/projects/[projectId]/locations/reorder
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Location ordering" — reorder endpoint accepts ordered ID array
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location reorder API route"
 */

import { NextResponse } from 'next/server';
import { reorderLocationsSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { reorderLocations } from '@/lib/services/location-service';
import type { ApiResponse } from '@mantemap/shared';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }
    const parsed = reorderLocationsSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid reorder data');
    const { projectId: rawProjectIdentifier } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    await reorderLocations(projectId, parsed.data, auth.user.id);
    return NextResponse.json(
      { message: 'Locations reordered successfully' } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project or location not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}
