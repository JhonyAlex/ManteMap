import { NextResponse } from 'next/server';
import { updateProjectSchema } from '@mantemap/validation';
import { getProjectById, updateProject } from '@/lib/services/project-service';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, notFound, forbidden, internalError } from '@/lib/http/api-error';
import { NotFoundError, AuthorizationError } from '@mantemap/shared';
import type { ApiResponse } from '@mantemap/shared';

/**
 * GET /api/projects/[projectId]
 *
 * Returns a project by ID. Only members can access.
 * Non-members receive 404 to avoid disclosing project existence.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const result = await getProjectById(projectId, auth.user.id);

    const response: ApiResponse = {
      data: result.project,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return notFound('Project not found');
    }

    return internalError();
  }
}

/**
 * PATCH /api/projects/[projectId]
 *
 * Updates a project's name and/or description.
 * Only the project owner can update.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return badRequest(firstError?.message || 'Invalid update data');
    }

    // At least one field must be provided
    if (Object.keys(parsed.data).length === 0) {
      return badRequest('At least one field must be provided for update');
    }

    const result = await updateProject(projectId, parsed.data, auth.user.id);

    const response: ApiResponse = {
      data: result.project,
      message: 'Project updated successfully',
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return notFound('Project not found');
    }

    if (error instanceof AuthorizationError) {
      return forbidden();
    }

    return internalError();
  }
}
