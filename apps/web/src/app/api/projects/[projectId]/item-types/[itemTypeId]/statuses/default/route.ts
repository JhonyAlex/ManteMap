import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { setDefaultStatus } from '@/lib/services/status-service';
import type { ApiResponse } from '@mantemap/shared';

const setDefaultSchema = z.object({
  statusId: z.string().min(1, 'Status ID is required'),
});

type Params = { params: Promise<{ projectId: string; itemTypeId: string }> };

export async function PUT(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON in request body'); }
    const parsed = setDefaultSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid request data');
    const { projectId, itemTypeId } = await params;
    const result = await setDefaultStatus(projectId, parsed.data.statusId, itemTypeId, auth.user.id);
    return NextResponse.json({ data: result, message: 'Default status updated successfully' } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
