/**
 * Location API routes — /api/projects/[projectId]/locations
 *
 * Spec: openspec/changes/phase-7-locations/specs/location-hierarchy/spec.md
 *   "Project-scoped CRUD access" — list, create
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Location CRUD + tree API routes"
 */

import { NextResponse } from 'next/server';
import { createLocationSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { createLocation, listLocations } from '@/lib/services/location-service';
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
    const result = await listLocations(projectId, auth.user.id);
    return NextResponse.json({ data: result.locations } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    return internalError();
  }
}

export async function POST(
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
    const parsed = createLocationSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid location data');
    const { projectId: rawProjectIdentifier } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await createLocation(projectId, parsed.data, auth.user.id);
    return NextResponse.json(
      { data: result.location, message: 'Location created successfully' } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project or parent location not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}
