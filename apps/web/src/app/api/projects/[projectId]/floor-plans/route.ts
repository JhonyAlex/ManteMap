/**
 * FloorPlan API routes — /api/projects/[projectId]/floor-plans
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "Floor plan CRUD access" — list, upload
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Upload, CRUD, marker API routes"
 */

import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound, payloadTooLarge, unsupportedMediaType } from '@/lib/http/api-error';
import { uploadFloorPlan, listFloorPlans } from '@/lib/services/floor-plan-service';
import type { ApiResponse } from '@mantemap/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId } = await params;
    const url = new URL(request.url);
    const locationId = url.searchParams.get('locationId');
    if (!locationId) return badRequest('locationId query parameter is required');

    const result = await listFloorPlans(projectId, locationId, auth.user.id);
    return NextResponse.json({ data: result.floorPlans } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project or location not found');
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
    const { projectId } = await params;

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return badRequest('Invalid form data');
    }

    const locationId = formData.get('locationId') as string | null;
    const name = formData.get('name') as string | null;
    const widthStr = formData.get('width') as string | null;
    const heightStr = formData.get('height') as string | null;
    const file = formData.get('file') as File | null;

    if (!locationId) return badRequest('locationId is required');
    if (!name) return badRequest('name is required');
    if (!widthStr) return badRequest('width is required');
    if (!heightStr) return badRequest('height is required');
    if (!file) return badRequest('file is required');

    const width = parseInt(widthStr, 10);
    const height = parseInt(heightStr, 10);
    if (isNaN(width) || isNaN(height)) return badRequest('width and height must be valid numbers');

    const result = await uploadFloorPlan(
      projectId,
      locationId,
      file,
      { name, width, height },
      auth.user.id
    );

    return NextResponse.json(
      { data: result.floorPlan, message: 'Floor plan uploaded successfully' } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project or location not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) {
      if (error.message.includes('size')) return payloadTooLarge(error.message);
      if (error.message.includes('extension') || error.message.includes('type')) {
        return unsupportedMediaType(error.message);
      }
      return badRequest(error.message);
    }
    return internalError();
  }
}
