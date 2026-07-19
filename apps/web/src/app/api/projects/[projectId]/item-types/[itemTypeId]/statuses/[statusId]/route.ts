import { NextResponse } from 'next/server';
import { updateStatusSchema } from '@mantemap/validation';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { deactivateStatus, getStatus, updateStatus } from '@/lib/services/status-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; itemTypeId: string; statusId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, statusId, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await getStatus(projectId, statusId, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    return internalError();
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON in request body'); }
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid status data');
    const { projectId: rawProjectIdentifier, statusId, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await updateStatus(projectId, statusId, parsed.data, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result, message: 'Status updated successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict('A status with this key already exists in this item type');
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, statusId, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await deactivateStatus(projectId, statusId, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result, message: 'Status deactivated successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
