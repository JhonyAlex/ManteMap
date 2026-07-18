import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { forbidden, internalError, notFound, badRequest } from '@/lib/http/api-error';
import { requireProjectMember } from '@/lib/services/project-access-service';
import { findByProjectId, createWebhook } from '@/lib/repositories/webhook-repository';
import type { ApiResponse } from '@mantemap/shared';

/**
 * Sanitize endpoint for API response — strip secret field.
 */
function sanitizeEndpoint(endpoint: {
  id: string;
  projectId: string;
  name: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  retryCount: number;
  createdAt: Date;
}) {
  return {
    id: endpoint.id,
    projectId: endpoint.projectId,
    name: endpoint.name,
    url: endpoint.url,
    eventTypes: endpoint.eventTypes,
    active: endpoint.active,
    retryCount: endpoint.retryCount,
    createdAt: endpoint.createdAt,
  };
}

/**
 * GET — List all webhook endpoints for a project (secret excluded).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;

  try {
    const { projectId } = await params;
    await requireProjectMember(projectId, auth.user.id);

    const endpoints = await findByProjectId(projectId);
    const sanitized = endpoints.map(sanitizeEndpoint);

    return NextResponse.json({ data: sanitized } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

/**
 * POST — Create a new webhook endpoint.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;

  try {
    const { projectId } = await params;
    await requireProjectMember(projectId, auth.user.id);

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const { name, url, secret, eventTypes, active, retryCount } = body;

    if (!name || typeof name !== 'string') {
      return badRequest('Field "name" (string) is required');
    }
    if (!url || typeof url !== 'string') {
      return badRequest('Field "url" (string) is required');
    }
    if (!eventTypes || !Array.isArray(eventTypes)) {
      return badRequest('Field "eventTypes" (string array) is required');
    }

    const endpoint = await createWebhook({
      projectId,
      name,
      url,
      secret: typeof secret === 'string' ? secret : undefined,
      eventTypes: eventTypes as string[],
      active: active !== false,
      retryCount: typeof retryCount === 'number' ? retryCount : 3,
    });

    return NextResponse.json(
      { data: sanitizeEndpoint(endpoint), message: 'Webhook endpoint created' } satisfies ApiResponse,
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
