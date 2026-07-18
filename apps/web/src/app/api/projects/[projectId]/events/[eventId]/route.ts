import { NextResponse } from 'next/server';
import { updateEventSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getEvent, updateEvent, deleteEvent } from '@/lib/services/event-service';
import type { ApiResponse } from '@mantemap/shared';

type Params = { params: Promise<{ projectId: string; eventId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, eventId } = await params;
    const result = await getEvent(projectId, eventId, auth.user.id);
    return NextResponse.json({ data: result.event } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Event not found');
    return internalError();
  }
}

export async function PUT(request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }
    const parsed = updateEventSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid event data');
    const { projectId, eventId } = await params;
    const result = await updateEvent(projectId, eventId, parsed.data, auth.user.id);
    return NextResponse.json(
      { data: result.event, message: 'Event updated successfully' } satisfies ApiResponse
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Event not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId, eventId } = await params;
    await deleteEvent(projectId, eventId, auth.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Event not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
