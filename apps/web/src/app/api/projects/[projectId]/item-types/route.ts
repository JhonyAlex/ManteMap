import { NextResponse } from 'next/server';
import { createItemTypeSchema } from '@mantemap/validation';
import { ConflictError, NotFoundError, AuthorizationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { createItemType, listItemTypes } from '@/lib/services/item-type-service';
import type { ApiResponse } from '@mantemap/shared';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId } = await params;
    const result = await listItemTypes(projectId, auth.user.id);
    return NextResponse.json({ data: result.itemTypes } satisfies ApiResponse);
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
    try { body = await request.json(); } catch { return badRequest('Invalid JSON in request body'); }
    const parsed = createItemTypeSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid item type data');
    const { projectId } = await params;
    const result = await createItemType(projectId, parsed.data, auth.user.id);
    return NextResponse.json({ data: result.itemType, message: 'Item type created successfully' } satisfies ApiResponse, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict('An item type with this slug already exists in the project');
    return internalError();
  }
}
