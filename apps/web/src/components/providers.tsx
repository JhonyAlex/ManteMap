'use client';

/**
 * Providers — thin client wrapper for session context.
 *
 * Wraps children with NextAuth's SessionProvider so client components
 * can access the session via useSession().
 *
 * Design: design.md — "thin session provider"
 */

import React from 'react';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
