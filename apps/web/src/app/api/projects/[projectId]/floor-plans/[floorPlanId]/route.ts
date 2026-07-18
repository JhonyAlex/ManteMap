/**
 * FloorPlan resource API route — /api/projects/[projectId]/floor-plans/[floorPlanId]
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "Floor plan CRUD access" — get, delete
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Upload, CRUD, marker API routes"
 */

import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getFloorPlan, removeFloorPlan } from '@/lib/services/floor-plan-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; floorPlanId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, floorPlanId } = await params;
    const result = await getFloorPlan(projectId, floorPlanId, auth.user.id);
    return NextResponse.json({ data: result.floorPlan } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Floor plan not found');
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, floorPlanId } = await params;
    await removeFloorPlan(projectId, floorPlanId, auth.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Floor plan not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
