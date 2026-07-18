'use client';

/**
 * Providers — thin client wrapper for session and query context.
 *
 * Wraps children with:
 * 1. TanStack Query's QueryClientProvider (staleTime: 30s, refetchOnWindowFocus: false)
 * 2. NextAuth's SessionProvider (session access via useSession())
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "QueryClient infrastructure"
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "TanStack Query for client-side data fetching"
 */

import React, { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  );
}
