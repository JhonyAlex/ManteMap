/**
 * Auth layout — Server Component.
 *
 * Simple centered layout for authentication pages (login, register).
 * Does NOT render the protected shell (sidebar, breadcrumbs).
 *
 * Spec: specs/application-shell/spec.md — "Unauthenticated shell request"
 */

import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
