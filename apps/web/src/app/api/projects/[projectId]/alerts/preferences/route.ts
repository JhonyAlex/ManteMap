import { NextResponse } from 'next/server';
import { alertTypeEnum } from '@mantemap/validation';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getPreferences, updatePreference } from '@/lib/services/alert-service';
import type { ApiResponse } from '@mantemap/shared';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId } = await params;
    const preferences = await getPreferences(projectId, auth.user.id);
    return NextResponse.json({ data: preferences } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    // Validate alertType
    const { alertType, enabled, email, slack, teams, telegram } = body as {
      alertType?: string;
      enabled?: boolean;
      email?: boolean;
      slack?: boolean;
      teams?: boolean;
      telegram?: boolean;
    };

    if (!alertType || !alertTypeEnum.safeParse(alertType).success) {
      return badRequest('Valid alertType is required');
    }
    if (typeof enabled !== 'boolean') {
      return badRequest('enabled (boolean) is required');
    }

    const updateData: Parameters<typeof updatePreference>[2] = {
      alertType: alertType as Parameters<typeof updatePreference>[2]['alertType'],
      enabled,
    };

    // Pass channel booleans if present
    if (typeof email === 'boolean') updateData.email = email;
    if (typeof slack === 'boolean') updateData.slack = slack;
    if (typeof teams === 'boolean') updateData.teams = teams;
    if (typeof telegram === 'boolean') updateData.telegram = telegram;

    const result = await updatePreference(projectId, auth.user.id, updateData);

    return NextResponse.json(
      { data: result, message: 'Preference updated successfully' } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
