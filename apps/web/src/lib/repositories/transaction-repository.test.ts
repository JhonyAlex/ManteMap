import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import from production code — RED until GREEN
import { runSerializable } from './transaction-repository';

// Mock the Prisma client
vi.mock('@mantemap/database', () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

import prisma from '@mantemap/database';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runSerializable', () => {
  it('returns the result of the callback on success', async () => {
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({})
    );

    const result = await runSerializable(async () => 'success');

    expect(result).toBe('success');
  });

  it('retries on P2034 serialization failure and succeeds on third attempt', async () => {
    const p2034Error = Object.assign(new Error('Serialization failure'), {
      code: 'P2034',
    });

    let callCount = 0;
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => {
        callCount++;
        if (callCount <= 2) {
          throw p2034Error;
        }
        return fn({});
      }
    );

    // Use real timers for this test — the retry jitter is small (10-60ms * attempt)
    const result = await runSerializable(async () => 'retried-success');

    expect(callCount).toBe(3);
    expect(result).toBe('retried-success');
  });

  it('throws the P2034 error after exhausting all retries', async () => {
    const p2034Error = Object.assign(new Error('Serialization failure'), {
      code: 'P2034',
    });

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(p2034Error);

    await expect(runSerializable(async () => 'never')).rejects.toThrow('Serialization failure');
  });

  it('does not retry on non-P2034 errors', async () => {
    const otherError = new Error('Connection refused');
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(otherError);

    await expect(runSerializable(async () => 'never')).rejects.toThrow('Connection refused');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('passes isolationLevel Serializable to Prisma', async () => {
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn({})
    );

    await runSerializable(async () => 'ok');

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: 'Serializable' }
    );
  });
});
