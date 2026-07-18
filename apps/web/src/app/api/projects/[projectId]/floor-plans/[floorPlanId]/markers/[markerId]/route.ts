/**
 * Marker resource API route — /api/projects/[projectId]/floor-plans/[floorPlanId]/markers/[markerId]
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "Marker CRUD scoped to floor plan" — update, delete
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Upload, CRUD, marker API routes"
 */

import { NextResponse } from 'next/server';
import { updateMarkerSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { editMarker, removeMarker } from '@/lib/services/floor-plan-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = {
  params: Promise<{
    projectId: string;
    locationId: string;
    floorPlanId: string;
    markerId: string;
  }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }
    const parsed = updateMarkerSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid marker data');

    const { projectId, locationId, floorPlanId, markerId } = await params;
    const result = await editMarker(
      projectId,
      locationId,
      floorPlanId,
      markerId,
      parsed.data,
      auth.user.id
    );

    return NextResponse.json(
      { data: result.marker, message: 'Marker updated successfully' } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Marker not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, locationId, floorPlanId, markerId } = await params;
    await removeMarker(projectId, locationId, floorPlanId, markerId, auth.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Marker not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
