/**
 * Dashboard layout — Server Component.
 *
 * Fetches accessible projects via server auth + service,
 * renders the protected application shell with sidebar and breadcrumbs.
 *
 * Unauthenticated users are redirected by middleware before reaching here;
 * this layout performs a secondary authoritative check.
 *
 * Spec: specs/application-shell/spec.md
 * Design: design.md — "Server Components by default; only forms, navigation state, and SessionProvider are client components"
 */

import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getDashboardProjects } from '@/lib/services/dashboard-service';
import { Sidebar } from '@/components/layout/sidebar';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Secondary auth check — middleware already protects this route,
  // but the layout also enforces it server-side for defense in depth.
  if (!user) {
    redirect('/login');
  }

  // Fetch only projects the user can access (membership-scoped)
  const { projects } = await getDashboardProjects(user.id);

  const sidebarProjects = projects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Skip to content link — accessible keyboard navigation */}
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:outline-2 focus:outline-offset-2 focus:outline-ring"
      >
        Skip to content
      </a>

      {/* Sidebar — client component for mobile toggle */}
      <Sidebar
        projects={sidebarProjects}
        user={{ email: user.email, name: user.name ?? null }}
        backgroundId="dashboard-background"
      />

      {/* Main content area */}
      <div id="dashboard-background" className="flex flex-1 flex-col overflow-y-auto">
        <header className="border-b border-border px-6">
          <Breadcrumbs />
        </header>

        <main id="content" tabIndex={-1} className="flex-1 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
