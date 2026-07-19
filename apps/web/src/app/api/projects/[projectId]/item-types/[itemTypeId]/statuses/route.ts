import { NextResponse } from 'next/server';
import { createStatusSchema } from '@mantemap/validation';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { createStatus, listStatuses } from '@/lib/services/status-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; itemTypeId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await listStatuses(projectId, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item type not found');
    return internalError();
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON in request body'); }
    const parsed = createStatusSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid status data');
    const { projectId: rawProjectIdentifier, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await createStatus(projectId, parsed.data, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result, message: 'Status created successfully' } satisfies ApiResponse, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item type not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict('A status with this key already exists in this item type');
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}
