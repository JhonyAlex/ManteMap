import { PrismaClient } from '@mantemap/database';
import prisma from '@mantemap/database';

/**
 * Options for runSerializable — testing seams that do not alter production logic.
 */
export interface RunSerializableOptions {
  /** Called once per P2034 retry, before the jitter delay. */
  onRetry?: () => void;
  /**
   * Called after the transaction callback fn returns, but before the
   * transaction commits. Throwing here causes an immediate rollback
   * without consuming the P2034 retry budget.
   */
  onBeforeCommit?: () => void;
  /**
   * Deterministic P2034 injection for testing. When provided and it returns
   * true, the transaction throws a synthetic P2034 error instead of executing
   * against PostgreSQL. This allows tests to deterministically exercise the
   * retry loop and exhaustion path without relying on timing/concurrency.
   *
   * The callback receives the current attempt number (1-indexed).
   * Production code MUST NOT set this option.
   */
  simulateP2034?: (attempt: number) => boolean;
}

/**
 * Run a function inside a Serializable transaction with bounded P2034 retry.
 *
 * @param fn      - callback receiving the transaction PrismaClient
 * @param options - optional testing seams (onRetry, onBeforeCommit)
 * @param retries - max retry attempts for P2034 serialization failures (default 3)
 * @returns       - the value produced by fn
 */
export async function runSerializable<T>(
  fn: (tx: PrismaClient) => Promise<T>,
  options?: RunSerializableOptions,
  retries: number = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Testing seam: deterministic P2034 injection (skips real transaction)
      if (options?.simulateP2034?.(attempt)) {
        throw {
          code: 'P2034',
          message:
            'Transaction failed due to a write conflict with another transaction, retry.',
          clientVersion: 'simulateP2034',
        };
      }

      return await prisma.$transaction(
        async (tx) => {
          const result = await fn(tx as unknown as PrismaClient);

          // Testing seam: inject failure before commit
          if (options?.onBeforeCommit) {
            options.onBeforeCommit();
          }

          return result;
        },
        {
          isolationLevel: 'Serializable',
        }
      );
    } catch (error: unknown) {
      lastError = error;
      const code = (error as { code?: string }).code;

      if (code === 'P2034' && attempt < retries) {
        // Testing seam: observe retry occurrence
        options?.onRetry?.();

        // Bounded jitter before retry
        const jitter = Math.floor(Math.random() * 50) + 10;
        await new Promise((resolve) => setTimeout(resolve, jitter * attempt));
        continue;
      }

      throw error;
    }
  }

  // All retries exhausted
  throw lastError;
}
