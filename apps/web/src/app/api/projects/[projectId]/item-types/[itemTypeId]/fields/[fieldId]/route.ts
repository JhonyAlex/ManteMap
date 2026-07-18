import { NextResponse } from 'next/server';
import { updateDynamicFieldSchema } from '@mantemap/validation';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { deactivateField, getField, updateField } from '@/lib/services/dynamic-field-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; itemTypeId: string; fieldId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, fieldId, itemTypeId } = await params;
    const result = await getField(projectId, fieldId, itemTypeId, auth.user.id);
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
    const parsed = updateDynamicFieldSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid field data');
    const { projectId, fieldId, itemTypeId } = await params;
    const result = await updateField(projectId, fieldId, parsed.data, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result, message: 'Field updated successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict('A field with this key already exists in this item type');
    if (error instanceof ValidationError) return badRequest(error.message);
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, fieldId, itemTypeId } = await params;
    const result = await deactivateField(projectId, fieldId, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result, message: 'Field deactivated successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
