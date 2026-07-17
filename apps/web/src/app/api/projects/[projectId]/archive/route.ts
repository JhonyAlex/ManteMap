import { NextResponse } from 'next/server';
import { archiveProject } from '@/lib/services/project-service';
import { getAuthUser } from '@/lib/auth/session';
import { notFound, forbidden, internalError } from '@/lib/http/api-error';
import { NotFoundError, AuthorizationError } from '@mantemap/shared';
import type { ApiResponse } from '@mantemap/shared';

/**
 * POST /api/projects/[projectId]/archive
 *
 * Archives a project (non-destructive). Only the owner can archive.
 * Sets status to ARCHIVED; data is retained for future governed handling.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const { projectId } = await params;
    const result = await archiveProject(projectId, auth.user.id);

    const response: ApiResponse = {
      data: result.project,
      message: 'Project archived successfully',
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
