import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { forbidden, internalError, notFound } from '@/lib/http/api-error';
import { listAlerts, getUnreadCount } from '@/lib/services/alert-service';
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

    // Special action: unread count
    const action = url.searchParams.get('action');
    if (action === 'unread-count') {
      const count = await getUnreadCount(projectId, auth.user.id);
      return NextResponse.json({ data: { count } } satisfies ApiResponse);
    }

    // Parse filters
    const alertType = url.searchParams.get('alertType') as
      | 'DOCUMENT_EXPIRING'
      | 'STATUS_INCIDENT'
      | 'STATUS_BLOCKING'
      | 'STATUS_FINAL'
      | 'EVENT_UPCOMING'
      | null;
    const severity = url.searchParams.get('severity') as
      | 'CRITICAL'
      | 'WARNING'
      | 'INFO'
      | null;
    const status = url.searchParams.get('status') as
      | 'ACTIVE'
      | 'ACKNOWLEDGED'
      | 'DISMISSED'
      | null;

    // Parse pagination
    const pageStr = url.searchParams.get('page');
    const pageSizeStr = url.searchParams.get('pageSize');
    const page = pageStr ? parseInt(pageStr, 10) : undefined;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : undefined;

    const filters: Record<string, string> = {};
    if (alertType) filters.alertType = alertType;
    if (severity) filters.severity = severity;
    if (status) filters.status = status;

    const pagination: Record<string, number> = {};
    if (page !== undefined && !isNaN(page)) pagination.page = page;
    if (pageSize !== undefined && !isNaN(pageSize)) pagination.pageSize = pageSize;

    const alerts = await listAlerts(projectId, filters, auth.user.id, pagination);

    return NextResponse.json({ data: alerts } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
