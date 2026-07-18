import { NextResponse } from 'next/server';
import { createEventSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { createEvent, getEventsInRange } from '@/lib/services/event-service';
import type { ApiResponse } from '@mantemap/shared';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId } = await params;
    const url = new URL(request.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const type = url.searchParams.get('type') as 'manual' | 'document_expiration' | null;

    if (!start || !end) {
      return badRequest('start and end query parameters are required');
    }

    const rangeStart = new Date(start);
    const rangeEnd = new Date(end);

    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return badRequest('Invalid date format for start or end');
    }

    const result = await getEventsInRange(
      projectId,
      rangeStart,
      rangeEnd,
      auth.user.id,
      type ?? undefined
    );

    return NextResponse.json({ data: result.events } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    return internalError();
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }
    const parsed = createEventSchema.safeParse(body);
    if (!parsed.success) return badRequest(parsed.error.errors[0]?.message ?? 'Invalid event data');
    const { projectId } = await params;
    const result = await createEvent(projectId, parsed.data, auth.user.id);
    return NextResponse.json(
      { data: result.event, message: 'Event created successfully' } satisfies ApiResponse,
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
