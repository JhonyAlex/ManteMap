import { describe, it, expect } from 'vitest';
import {
  apiError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
  serviceUnavailable,
} from './api-error';

describe('apiError', () => {
  it('returns a NextResponse with the given status and body', async () => {
    const response = apiError(422, 'Custom message', 'CUSTOM_ERROR');
    expect(response.status).toBe(422);

    const body = await response.json();
    expect(body.error).toBe('CUSTOM_ERROR');
    expect(body.message).toBe('Custom message');
  });
});

describe('badRequest', () => {
  it('returns 400 with VALIDATION_ERROR', async () => {
    const response = badRequest('Invalid email');
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('Invalid email');
  });

  it('uses default message when none provided', async () => {
    const response = badRequest();
    const body = await response.json();
    expect(body.message).toBe('Invalid request data');
  });
});

describe('unauthorized', () => {
  it('returns 401 with AUTHENTICATION_ERROR', async () => {
    const response = unauthorized();
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBe('AUTHENTICATION_ERROR');
    expect(body.message).toBe('Authentication required');
  });
});

describe('forbidden', () => {
  it('returns 403 with AUTHORIZATION_ERROR', async () => {
    const response = forbidden('Not allowed');
    expect(response.status).toBe(403);

    const body = await response.json();
    expect(body.error).toBe('AUTHORIZATION_ERROR');
    expect(body.message).toBe('Not allowed');
  });
});

describe('notFound', () => {
  it('returns 404 with NOT_FOUND', async () => {
    const response = notFound();
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error).toBe('NOT_FOUND');
  });
});

describe('conflict', () => {
  it('returns 409 with CONFLICT', async () => {
    const response = conflict('Email already exists');
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error).toBe('CONFLICT');
    expect(body.message).toBe('Email already exists');
  });
});

describe('internalError', () => {
  it('returns 500 with a stable message even when given an internal message', async () => {
    const response = internalError('Prisma password_hash leaked');
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Internal server error');
    expect(body.message).not.toContain('Prisma');
  });
});

describe('serviceUnavailable', () => {
  it('returns 503 with a stable message even when given an internal message', async () => {
    const response = serviceUnavailable('Try again later');
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body.error).toBe('SERVICE_UNAVAILABLE');
    expect(body.message).toBe('Service temporarily unavailable');
  });
});
