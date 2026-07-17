import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the service
vi.mock('@/lib/services/user-service', () => ({
  registerUser: vi.fn(),
}));

import { registerUser } from '@/lib/services/user-service';
import { POST } from './route';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/register', () => {
  it('returns the generic 202 acceptance contract on valid registration', async () => {
    (registerUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    const response = await POST(
      makeRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongP4ss!',
      })
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toEqual({
      message: 'If registration can be completed, you can sign in shortly.',
    });
  });

  it('returns 400 for invalid email format', async () => {
    const response = await POST(
      makeRequest({
        name: 'John Doe',
        email: 'not-an-email',
        password: 'StrongP4ss!',
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for weak password', async () => {
    const response = await POST(
      makeRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weak',
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns the same generic acceptance contract for duplicate email', async () => {
    const { ConflictError } = await import('@mantemap/shared');
    (registerUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ConflictError('A user with this email already exists')
    );

    const response = await POST(
      makeRequest({
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'StrongP4ss!',
      })
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toEqual({
      message: 'If registration can be completed, you can sign in shortly.',
    });
  });

  it('returns 503 on P2034 exhaustion', async () => {
    const p2034Error = Object.assign(new Error('Serialization failure'), {
      code: 'P2034',
    });
    (registerUser as ReturnType<typeof vi.fn>).mockRejectedValue(p2034Error);

    const response = await POST(
      makeRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongP4ss!',
      })
    );

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns 500 for unexpected errors', async () => {
    (registerUser as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Something unexpected')
    );

    const response = await POST(
      makeRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongP4ss!',
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('INTERNAL_ERROR');
    expect(body.message).toBe('Internal server error');
    expect(body.message).not.toContain('Something unexpected');
  });

  it('returns 409 on Prisma P2002 unique constraint violation (race-condition duplicate email)', async () => {
    const p2002Error = Object.assign(
      new Error('Unique constraint failed on the fields: (`email`)'),
      { code: 'P2002', meta: { target: ['email'] } }
    );
    (registerUser as ReturnType<typeof vi.fn>).mockRejectedValue(p2002Error);

    const response = await POST(
      makeRequest({
        name: 'Jane Doe',
        email: 'race@example.com',
        password: 'StrongP4ss!',
      })
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body).toEqual({
      message: 'If registration can be completed, you can sign in shortly.',
    });
  });

  it('returns 400 with VALIDATION_ERROR for malformed JSON', async () => {
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('does not return account data in the generic response', async () => {
    (registerUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    const response = await POST(
      makeRequest({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'StrongP4ss!',
      })
    );

    const body = await response.json();
    expect(body).not.toHaveProperty('data');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('password');
  });
});
