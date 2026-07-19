import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { acknowledgeAlert, dismissAlert } from '@/lib/services/alert-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; alertId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, alertId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const { action } = body as { action?: string };

    if (action === 'acknowledge') {
      const alert = await acknowledgeAlert(projectId, alertId, auth.user.id);
      return NextResponse.json(
        { data: alert, message: 'Alert acknowledged successfully' } satisfies ApiResponse
      );
    }

    if (action === 'dismiss') {
      const alert = await dismissAlert(projectId, alertId, auth.user.id);
      return NextResponse.json(
        { data: alert, message: 'Alert dismissed successfully' } satisfies ApiResponse
      );
    }

    return badRequest('Invalid action. Use "acknowledge" or "dismiss"');
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Alert not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
