import { NextResponse } from 'next/server';
import { createProjectSchema } from '@mantemap/validation';
import { createProject, listProjects } from '@/lib/services/project-service';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, conflict, serviceUnavailable, internalError } from '@/lib/http/api-error';
import { ConflictError, AppError } from '@mantemap/shared';
import type { ApiResponse } from '@mantemap/shared';

/**
 * GET /api/projects
 *
 * Returns projects where the authenticated user is a member.
 * Requires a valid session.
 */
export async function GET() {
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const result = await listProjects(auth.user.id);

    const response: ApiResponse = {
      data: result.projects,
    };

    return NextResponse.json(response);
  } catch {
    return internalError();
  }
}

/**
 * POST /api/projects
 *
 * Creates a new project. The authenticated user becomes the atomic OWNER.
 * Any authenticated user can create projects.
 */
export async function POST(request: Request) {
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return badRequest(firstError?.message || 'Invalid project data');
    }

    const result = await createProject(parsed.data, auth.user.id);

    const response: ApiResponse = {
      data: result.project,
      message: 'Project created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      return conflict('A project with this code already exists');
    }

    if (error instanceof AppError) {
      if (error.statusCode === 503) {
        return serviceUnavailable();
      }
      return internalError();
    }

    // Check for Prisma P2002 unique constraint violation (race-condition duplicate code)
    const err = error as { code?: string; message?: string };
    if (err.code === 'P2002') {
      return conflict('A project with this code already exists');
    }

    // Check for P2034 exhaustion
    if (err.code === 'P2034' || err.message?.includes('Serialization failure')) {
      return serviceUnavailable();
    }

    return internalError();
  }
}
