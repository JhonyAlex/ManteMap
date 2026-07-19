import { resolveProjectId } from '@/lib/services/project-service';
import { NextResponse } from 'next/server';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getFloorPlanImage } from '@/lib/services/floor-plan-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; floorPlanId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: paramRaw, floorPlanId } = await params;
    const projectId = await resolveProjectId(paramRaw);
    const result = await getFloorPlanImage(projectId, floorPlanId, auth.user.id);

    return new NextResponse(new Uint8Array(result.buffer), {
      headers: {
        'Content-Type': result.mimeType,
        'Content-Length': result.buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound(error.message);
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
