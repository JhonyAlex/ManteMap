import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError, ValidationError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { badRequest, forbidden, internalError, notFound, payloadTooLarge, unsupportedMediaType } from '@/lib/http/api-error';
import { uploadDocument, listDocuments } from '@/lib/services/document-service';
import type { ApiResponse } from '@mantemap/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, itemId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const result = await listDocuments(projectId, itemId, auth.user.id);
    return NextResponse.json({ data: result.documents } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: rawProjectIdentifier, itemId } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return badRequest('Invalid multipart form data');
    }

    const file = formData.get('file');
    const name = formData.get('name');

    if (!file || !(file instanceof File)) {
      return badRequest('File is required');
    }
    if (!name || typeof name !== 'string') {
      return badRequest('Document name is required');
    }

    const expiresAt = formData.get('expiresAt');
    const input = {
      name,
      expiresAt: expiresAt && typeof expiresAt === 'string' ? expiresAt : null,
    };

    const result = await uploadDocument(projectId, itemId, file, input, auth.user.id);

    return NextResponse.json(
      { data: { document: result.document, version: result.version }, message: 'Document uploaded successfully' } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Item not found');
    if (error instanceof AuthorizationError) return forbidden();
    if (error instanceof ValidationError) {
      if (error.message.includes('size')) return payloadTooLarge(error.message);
      if (error.message.includes('type')) return unsupportedMediaType(error.message);
      return badRequest(error.message);
    }
    return internalError();
  }
}