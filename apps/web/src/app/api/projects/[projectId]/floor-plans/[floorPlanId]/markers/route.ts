/**
 * Marker API routes — /api/projects/[projectId]/floor-plans/[floorPlanId]/markers
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "Marker CRUD scoped to floor plan" — list, create
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Upload, CRUD, marker API routes"
 */

import { NextResponse } from 'next/server';
import { createMarkerSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { addMarker, listMarkers } from '@/lib/services/floor-plan-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; floorPlanId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, floorPlanId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await listMarkers(projectId, floorPlanId, auth.user.id);
    return NextResponse.json({ data: result.markers } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Floor plan not found');
    return internalError();
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }
    const parsed = createMarkerSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid marker data');

    const { projectId: rawProjectIdentifier, floorPlanId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await addMarker(projectId, floorPlanId, parsed.data, auth.user.id);

    return NextResponse.json(
      { data: result.marker, message: 'Marker created successfully' } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Floor plan not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}
