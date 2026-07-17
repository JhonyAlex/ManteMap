import { NextResponse } from 'next/server';
import { registerUserSchema } from '@mantemap/validation';
import { registerUser } from '@/lib/services/user-service';
import { badRequest, serviceUnavailable, internalError } from '@/lib/http/api-error';
import { ConflictError, AppError } from '@mantemap/shared';

const REGISTRATION_ACCEPTED_MESSAGE = 'If registration can be completed, you can sign in shortly.';

function registrationAccepted() {
  return NextResponse.json(
    { message: REGISTRATION_ACCEPTED_MESSAGE },
    { status: 202 }
  );
}

/**
 * POST /api/auth/register
 *
 * Public endpoint — no authentication required.
 * Creates a new user account. The first user automatically becomes ADMIN.
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const parsed = registerUserSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return badRequest(firstError?.message || 'Invalid registration data');
    }

    await registerUser(parsed.data);
    return registrationAccepted();
  } catch (error: unknown) {
    if (error instanceof ConflictError) {
      return registrationAccepted();
    }

    if (error instanceof AppError) {
      if (error.statusCode === 503) {
        return serviceUnavailable();
      }
      return internalError();
    }

    // Check for Prisma P2002 unique constraint violation (race-condition duplicate email)
    const err = error as { code?: string; message?: string };
    if (err.code === 'P2002') {
      return registrationAccepted();
    }

    // Check for P2034 exhaustion (raw error from runSerializable)
    if (err.code === 'P2034' || err.message?.includes('Serialization failure')) {
      return serviceUnavailable();
    }

    return internalError();
  }
}
