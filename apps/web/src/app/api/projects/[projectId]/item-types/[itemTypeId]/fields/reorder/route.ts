import { NextResponse } from 'next/server';
import { reorderFieldsSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { reorderFields } from '@/lib/services/dynamic-field-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; itemTypeId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON in request body'); }
    const parsed = reorderFieldsSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid reorder data');
    const { projectId, itemTypeId } = await params;
    const result = await reorderFields(projectId, parsed.data.fieldIds, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result, message: 'Fields reordered successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}
