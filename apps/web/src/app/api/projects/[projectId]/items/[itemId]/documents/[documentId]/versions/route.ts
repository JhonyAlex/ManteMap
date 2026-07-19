import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getVersionHistory } from '@/lib/services/document-service';
import type { ApiResponse } from '@mantemap/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string; documentId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, itemId, documentId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await getVersionHistory(projectId, itemId, documentId, auth.user.id);
    return NextResponse.json({ data: result.versions } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Document not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
