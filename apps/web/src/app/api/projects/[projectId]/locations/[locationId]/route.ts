/**
 * Location resource API route — /api/projects/[projectId]/locations/[locationId]
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Project-scoped CRUD access" — get, update, delete
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location CRUD API routes"
 */

import { NextResponse } from 'next/server';
import { updateLocationSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getLocation, updateLocation, deleteLocation } from '@/lib/services/location-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; locationId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, locationId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await getLocation(projectId, locationId, auth.user.id);
    return NextResponse.json({ data: result.location } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Location not found');
    return internalError();
  }
}

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
    const parsed = updateLocationSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid location data');
    const { projectId: rawProjectIdentifier, locationId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await updateLocation(projectId, locationId, parsed.data, auth.user.id);
    return NextResponse.json(
      { data: result.location, message: 'Location updated successfully' } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Location not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, locationId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    await deleteLocation(projectId, locationId, auth.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Location not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
