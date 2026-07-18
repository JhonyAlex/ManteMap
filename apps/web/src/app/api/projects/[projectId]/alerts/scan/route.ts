import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { forbidden, internalError, notFound } from '@/lib/http/api-error';
import { scanDocumentExpirations, scanUpcomingEvents } from '@/lib/services/alert-service';
import type { ApiResponse } from '@mantemap/shared';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId } = await params;

    // Fire-and-forget: run both scans concurrently
    const [documentAlerts, eventAlerts] = await Promise.all([
      scanDocumentExpirations(projectId),
      scanUpcomingEvents(projectId),
    ]);

    const total = documentAlerts + eventAlerts;

    return NextResponse.json(
      {
        data: { documentAlerts, eventAlerts, total },
        message: `Scan complete: ${total} alert(s) generated/updated`,
      } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
