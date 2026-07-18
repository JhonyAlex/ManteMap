import { NextResponse } from 'next/server';
import { createItemSchema } from '@mantemap/validation';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { createItem, listItems } from '@/lib/services/item-service';
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
    const itemTypeId = url.searchParams.get('itemTypeId');
    const statusId = url.searchParams.get('statusId') ?? undefined;
    const search = url.searchParams.get('search') ?? undefined;
    const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined;
    const pageSize = url.searchParams.get('pageSize') ? Number(url.searchParams.get('pageSize')) : undefined;

    if (!itemTypeId) {
      return badRequest('itemTypeId query parameter is required');
    }

    const result = await listItems(
      projectId,
      { itemTypeId, statusId, search, page, pageSize },
      auth.user.id
    );
    return NextResponse.json({ data: result.items } satisfies ApiResponse);
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
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid item data');
    const { projectId } = await params;
    const result = await createItem(projectId, parsed.data, auth.user.id);
    return NextResponse.json(
      { data: result.item, message: 'Item created successfully' } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project or item type not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict('An item with this slug already exists in the item type');
    return internalError();
  }
}
