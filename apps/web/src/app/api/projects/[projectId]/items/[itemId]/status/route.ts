import { NextResponse } from 'next/server';
import { transitionStatusSchema } from '@mantemap/validation';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, conflict, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { transitionStatus } from '@/lib/services/item-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; itemId: string }> };

/**
 * PATCH /api/projects/[projectId]/items/[itemId]/status
 *
 * Transition an item to a new status.
 * Enforces:
 * - isFinal: blocks transition from final statuses
 * - Target status must exist and be active
 */
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

    const parsed = transitionStatusSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors[0]?.message ?? 'Invalid status data');
    }

    const { projectId: rawProjectIdentifier, itemId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await transitionStatus(
      projectId,
      itemId,
      parsed.data.statusId,
      auth.user.id
    );

    return NextResponse.json(
      {
        data: result.item,
        message: 'Item status transitioned successfully',
      } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ConflictError) return conflict(error.message);
    return internalError();
  }
}
