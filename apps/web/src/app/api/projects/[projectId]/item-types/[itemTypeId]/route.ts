import { NextResponse } from 'next/server';
import { updateItemTypeSchema } from '@mantemap/validation';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { archiveItemType, getItemType, updateItemType } from '@/lib/services/item-type-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; itemTypeId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await getItemType(projectId, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result.itemType } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item type not found');
    return internalError();
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON in request body'); }
    const parsed = updateItemTypeSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid item type data');
    const { projectId: rawProjectIdentifier, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await updateItemType(projectId, itemTypeId, parsed.data, auth.user.id);
    return NextResponse.json({ data: result.itemType, message: 'Item type updated successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item type not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict('An item type with this slug already exists in the project');
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, itemTypeId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await archiveItemType(projectId, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result.itemType, message: 'Item type archived successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item type not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
