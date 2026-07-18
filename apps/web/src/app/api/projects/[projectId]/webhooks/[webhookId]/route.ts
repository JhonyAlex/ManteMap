import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { forbidden, internalError, notFound, badRequest } from '@/lib/http/api-error';
import { requireProjectMember } from '@/lib/services/project-access-service';
import { findById, updateWebhook, deleteWebhook } from '@/lib/repositories/webhook-repository';
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
 * GET — Get a single webhook endpoint (secret excluded).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> },
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;

  try {
    const { projectId, webhookId } = await params;
    await requireProjectMember(projectId, auth.user.id);

    const endpoint = await findById(webhookId);
    if (!endpoint) return notFound('Webhook endpoint not found');

    return NextResponse.json({ data: sanitizeEndpoint(endpoint) } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Webhook endpoint not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

/**
 * PATCH — Update a webhook endpoint.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> },
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;

  try {
    const { projectId, webhookId } = await params;
    await requireProjectMember(projectId, auth.user.id);

    const existing = await findById(webhookId);
    if (!existing) return notFound('Webhook endpoint not found');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.name === 'string') updates.name = body.name;
    if (typeof body.url === 'string') updates.url = body.url;
    if (body.secret !== undefined) {
      // Allow clearing secret by passing null
      updates.secret = body.secret === null ? null : String(body.secret);
    }
    if (Array.isArray(body.eventTypes)) {
      updates.eventTypes = body.eventTypes;
    }
    if (typeof body.active === 'boolean') updates.active = body.active;
    if (typeof body.retryCount === 'number') updates.retryCount = body.retryCount;

    if (Object.keys(updates).length === 0) {
      return badRequest('No valid fields to update');
    }

    const updated = await updateWebhook(webhookId, updates);

    return NextResponse.json(
      { data: sanitizeEndpoint(updated), message: 'Webhook endpoint updated' } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Webhook endpoint not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

/**
 * DELETE — Delete a webhook endpoint.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; webhookId: string }> },
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;

  try {
    const { projectId, webhookId } = await params;
    await requireProjectMember(projectId, auth.user.id);

    const existing = await findById(webhookId);
    if (!existing) return notFound('Webhook endpoint not found');

    await deleteWebhook(webhookId);

    return NextResponse.json(
      { data: null, message: 'Webhook endpoint deleted' } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Webhook endpoint not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
