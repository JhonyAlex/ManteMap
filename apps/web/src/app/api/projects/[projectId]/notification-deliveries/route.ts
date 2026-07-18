import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { forbidden, internalError, notFound } from '@/lib/http/api-error';
import { listDeliveries, type DeliveryFilters } from '@/lib/repositories/notification-delivery-repository';
import type { ApiResponse } from '@mantemap/shared';

/**
 * GET /api/projects/[projectId]/notification-deliveries?alertId=X&channelType=slack&status=failed
 * Returns delivery log entries with optional filters.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: _projectId } = await params;
    const { searchParams } = new URL(request.url);

    const filters: DeliveryFilters = {};
    const alertId = searchParams.get('alertId');
    const channelType = searchParams.get('channelType');
    const status = searchParams.get('status');

    if (alertId) filters.alertId = alertId;
    if (channelType) filters.channelType = channelType;
    if (status) filters.status = status;

    const deliveries = await listDeliveries(filters);

    return NextResponse.json({ data: deliveries } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
