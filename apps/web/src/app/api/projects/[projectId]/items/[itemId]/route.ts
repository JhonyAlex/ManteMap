import { NextResponse } from 'next/server';
import { updateItemSchema } from '@mantemap/validation';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getItem, updateItem, deleteItem } from '@/lib/services/item-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; itemId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, itemId } = await params;
    const result = await getItem(projectId, itemId, auth.user.id);
    return NextResponse.json({ data: result.item } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item not found');
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
    const parsed = updateItemSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid item data');
    const { projectId, itemId } = await params;
    const result = await updateItem(projectId, itemId, parsed.data, auth.user.id);
    return NextResponse.json(
      { data: result.item, message: 'Item updated successfully' } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict('An item with this slug already exists');
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, itemId } = await params;
    await deleteItem(projectId, itemId, auth.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
